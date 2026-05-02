import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Users, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

function ClientPage({ onConnect, onBack }) {
  const [code, setCode] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)

  const formatCode = (value) => {
    // Remove non-digits and limit to 8
    const digits = value.replace(/[^0-9]/g, '').slice(0, 8)
    // Format as XXXX-XXXX
    if (digits.length <= 4) return digits
    return `${digits.slice(0, 4)}-${digits.slice(4)}`
  }

  const handleChange = (e) => {
    const formatted = formatCode(e.target.value)
    setCode(formatted)
  }

  const handleSubmit = async () => {
    const cleanCode = code.replace(/[^0-9]/g, '')

    if (cleanCode.length !== 8) {
      toast.error('Please enter a valid 8-digit code')
      return
    }

    setIsConnecting(true)
    try {
      await onConnect(cleanCode)
    } catch (error) {
      // Error handled in parent
    } finally {
      setIsConnecting(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[30rem] h-[30rem] bg-accent-purple/10 rounded-full blur-[100px] animate-float-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-accent-cyan/10 rounded-full blur-[100px] animate-float" style={{ animationDelay: '2s' }} />
      </div>

      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        whileHover={{ scale: 1.1, x: -5 }}
        whileTap={{ scale: 0.9 }}
        onClick={onBack}
        className="absolute top-6 left-6 glass w-12 h-12 rounded-2xl flex items-center justify-center hover:bg-white/10 hover:shadow-premium transition-all border border-white/10 hover:border-white/30"
      >
        <ArrowLeft className="w-5 h-5 text-white" />
      </motion.button>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center relative z-10"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0, rotate: 180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 150, damping: 15 }}
          className="inline-flex items-center justify-center w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-accent-purple/10 to-accent-cyan/10 mb-8 shadow-premium border border-white/10 relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-accent-purple/20 to-accent-cyan/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2.5rem] blur-xl" />
          <Users className="w-16 h-16 text-accent-cyan drop-shadow-[0_0_20px_rgba(0,212,255,0.8)] relative z-10" />
        </motion.div>

        {/* Title */}
        <motion.h2 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 mb-3 tracking-tight"
        >
          Join Session
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-white/60 mb-12 text-lg"
        >
          Enter the 8-digit code from the host
        </motion.p>

        {/* Code Input */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-10"
        >
          <div className="glass-strong rounded-[2rem] p-10 inline-block relative overflow-hidden group border-white/10 hover:border-accent-cyan/30 transition-all duration-500 shadow-lg focus-within:border-accent-cyan/50 focus-within:shadow-[0_0_30px_rgba(0,212,255,0.2)]">
            <div className="absolute inset-0 bg-gradient-to-r from-accent-purple/5 to-accent-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <input
              type="text"
              value={code}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="XXXX-XXXX"
              maxLength={9}
              className="w-56 text-center text-5xl tracking-[0.2em] font-mono bg-transparent border-none outline-none text-white placeholder-white/10 relative z-10"
              autoFocus
              disabled={isConnecting}
            />

            {/* Visual feedback segments */}
            <div className="mt-6 flex justify-center gap-3 relative z-10">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className={`w-4 h-1 rounded-full transition-all duration-300 ${i === 4 ? 'ml-6' : ''
                    } ${code.length > i
                      ? 'bg-accent-cyan shadow-[0_0_10px_rgba(0,212,255,0.8)]'
                      : 'bg-white/10'
                    }`}
                  animate={
                    code.length === i + 1
                      ? { scale: [1, 1.5, 1], backgroundColor: ['#fff', '#00d4ff', '#00d4ff'] }
                      : {}
                  }
                  transition={{ duration: 0.3 }}
                />
              ))}
            </div>
            
            {/* Paste Button */}
            {code.length === 0 && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText()
                    const formatted = formatCode(text)
                    setCode(formatted)
                    if (formatted.replace(/[^0-9]/g, '').length === 8) {
                      toast.success('Code pasted successfully')
                    }
                  } catch (e) {
                    toast.error('Unable to access clipboard')
                  }
                }}
                className="absolute bottom-3 right-4 text-xs text-white/40 hover:text-white/80 transition-colors flex items-center gap-1 z-20"
              >
                Paste Code
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Connect Button */}
        <motion.button
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, type: 'spring' }}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={isConnecting || code.length < 9}
          className="relative inline-flex items-center gap-4 px-12 py-5 rounded-[2rem] bg-white/5 border border-white/10 text-white font-bold text-xl disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none transition-all shadow-premium group overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-accent-cyan/80 to-accent-purple/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute inset-0 bg-gradient-to-r from-accent-cyan to-accent-purple opacity-100 group-hover:opacity-0 transition-opacity duration-300" />
          
          <div className="relative z-10 flex items-center gap-3">
            {isConnecting ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <span>Connect to Session</span>
                <ArrowLeft className="w-6 h-6 rotate-180 group-hover:translate-x-2 transition-transform duration-300 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
              </>
            )}
          </div>
        </motion.button>

        {/* Help Text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-white/30 text-sm"
        >
          Ask the host for their session code to begin
        </motion.p>
      </motion.div>
    </div>
  )
}

export default ClientPage
