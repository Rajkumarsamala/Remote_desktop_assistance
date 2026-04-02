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
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl"
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-cyan/10 rounded-full blur-3xl"
          animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onBack}
        className="absolute top-6 left-6 glass w-12 h-12 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors"
      >
        <ArrowLeft className="w-5 h-5 text-white/70" />
      </motion.button>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center relative z-10"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-accent-purple/20 to-accent-cyan/20 mb-8"
        >
          <Users className="w-12 h-12 text-accent-purple" />
        </motion.div>

        {/* Title */}
        <h2 className="text-3xl font-bold text-white mb-2">Join Session</h2>
        <p className="text-white/50 mb-12">
          Enter the 8-digit code from the host
        </p>

        {/* Code Input */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="glass-strong rounded-3xl p-8 inline-block">
            <input
              type="text"
              value={code}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="XXXX-XXXX"
              maxLength={9}
              className="w-48 text-center text-4xl tracking-[0.3em] font-mono bg-transparent border-none outline-none text-white placeholder-white/20"
              autoFocus
              disabled={isConnecting}
            />

            {/* Visual feedback */}
            <div className="mt-4 flex justify-center gap-2">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-all ${i === 4 ? 'ml-4' : ''
                    } ${code.length > i
                      ? 'bg-accent-cyan'
                      : 'bg-white/20'
                    }`}
                  animate={
                    code.length === i + 1
                      ? { scale: [1, 1.3, 1] }
                      : {}
                  }
                  transition={{ duration: 0.2 }}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Connect Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={isConnecting || code.length < 9}
          className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-gradient-to-r from-accent-cyan to-accent-purple text-white font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all"
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Connecting...
            </>
          ) : (
            'Connect to Session'
          )}
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
