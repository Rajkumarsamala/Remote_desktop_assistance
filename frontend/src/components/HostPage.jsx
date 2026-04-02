import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Copy, Check, Monitor, X, Loader2 } from 'lucide-react'
import { CONNECTION_STATE } from '../utils/constants'

function HostPage({ sessionCode, connectionState, onDisconnect, onClientConnected, webrtc }) {
  const [copied, setCopied] = useState(false)
  const [clientConnected, setClientConnected] = useState(false)

  useEffect(() => {
    if (connectionState === CONNECTION_STATE.CONNECTED) {
      setClientConnected(true)
      onClientConnected()
    }
  }, [connectionState, onClientConnected])

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(sessionCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatCode = (code) => {
    if (!code) return '----'
    const clean = code.replace(/[^0-9]/g, '')
    if (clean.length < 8) return code
    return `${clean.slice(0, 4)}-${clean.slice(4, 8)}`
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-cyan/10 rounded-full blur-3xl"
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl"
          animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Close Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onDisconnect}
        className="absolute top-6 right-6 glass w-12 h-12 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors"
      >
        <X className="w-5 h-5 text-white/70" />
      </motion.button>

      {/* Content */}
      <div className="text-center relative z-10">
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-accent-cyan/20 to-accent-purple/20 mb-8"
        >
          <Monitor className="w-12 h-12 text-accent-cyan" />
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-white mb-2"
        >
          {clientConnected ? 'Viewer Connected!' : 'Sharing Your Screen'}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-white/50 mb-12"
        >
          {clientConnected
            ? 'Your screen is being viewed. Press disconnect to stop.'
            : 'Share the code below with the viewer'}
        </motion.p>

        {/* Session Code */}
        {!clientConnected && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-12"
          >
            <div className="glass-strong rounded-3xl p-10 inline-block">
              <div className="session-code mb-4">{formatCode(sessionCode)}</div>

              {/* Copy Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={copyToClipboard}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-accent-green" />
                    <span className="text-accent-green">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-white/60" />
                    <span className="text-white/60">Copy Code</span>
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Waiting Animation */}
        {!clientConnected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center"
          >
            <div className="relative w-24 h-24 mb-6">
              {/* Pulse rings */}
              <div className="absolute inset-0 rounded-full border-2 border-accent-cyan/30 pulse-ring" />
              <div
                className="absolute inset-0 rounded-full border-2 border-accent-cyan/30 pulse-ring"
                style={{ animationDelay: '0.5s' }}
              />
              <div
                className="absolute inset-0 rounded-full border-2 border-accent-cyan/30 pulse-ring"
                style={{ animationDelay: '1s' }}
              />

              {/* Center icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Loader2 className="w-8 h-8 text-accent-cyan animate-spin" />
                </motion.div>
              </div>
            </div>

            <p className="text-white/40 text-sm">Waiting for viewer to connect...</p>
          </motion.div>
        )}

        {/* Connected State */}
        {clientConnected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-strong rounded-3xl p-8 inline-block"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-4 h-4 rounded-full bg-accent-green animate-pulse" />
              <span className="text-accent-green font-medium">Connected</span>
            </div>
            <p className="text-white/60">
              Session code: <span className="text-white font-mono">{formatCode(sessionCode)}</span>
            </p>
          </motion.div>
        )}
      </div>

      {/* Disconnect Button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        onClick={onDisconnect}
        className="mt-12 px-8 py-4 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
      >
        Disconnect & Stop Sharing
      </motion.button>
    </div>
  )
}

export default HostPage
