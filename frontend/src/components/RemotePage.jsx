import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Mouse, Keyboard, Loader2, Maximize, Volume2, VolumeX, Copy, Check, Clock, Signal
} from 'lucide-react'
import { CONNECTION_STATE } from '../utils/constants'
import toast from 'react-hot-toast'

function RemotePage({ webrtc, onDisconnect }) {
  const containerRef = useRef(null)
  const [controlEnabled, setControlEnabled] = useState(true)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sessionDuration, setSessionDuration] = useState(0)

  const {
    connectionState,
    sessionCode,
    remoteStream,
    handleMouseMove,
    handleMouseDown,
    handleMouseUp,
    handleWheel,
    handleKeyDown,
    handleKeyUp,
    toggleInput,
    screenRef,
  } = webrtc

  const formatCode = (code) => {
    if (!code) return '----'
    const clean = code.replace(/[^0-9]/g, '')
    if (clean.length < 8) return code
    return `${clean.slice(0, 4)}-${clean.slice(4, 8)}`
  }

  const copyToClipboard = async () => {
    if (sessionCode) {
      await navigator.clipboard.writeText(sessionCode)
      setCopied(true)
      toast.success('Code copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Timer
  useEffect(() => {
    let interval;
    if (connectionState === CONNECTION_STATE.CONNECTED) {
      interval = setInterval(() => {
        setSessionDuration(prev => prev + 1)
      }, 1000)
    } else {
      setSessionDuration(0)
    }
    return () => clearInterval(interval)
  }, [connectionState])

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  // Attach remote stream to video
  useEffect(() => {
    if (screenRef.current && remoteStream) {
      screenRef.current.srcObject = remoteStream
    }
  }, [remoteStream, screenRef])

  // Handle control toggle safely
  const handleToggleControl = () => {
    const newState = toggleInput()
    setControlEnabled(newState)
  }

  // Handle Fullscreen
  const handleFullscreen = async (e) => {
    if (e) e.stopPropagation()
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        await containerRef.current.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
      }
    }
  }

  const isConnected = connectionState === CONNECTION_STATE.CONNECTED
  const isConnecting = connectionState === CONNECTION_STATE.CONNECTING
  const hasStream = !!remoteStream

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-screen w-full bg-[#0a0a0f] overflow-hidden font-sans relative"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onClick={() => {
        if (!hasInteracted) {
          setHasInteracted(true)
          if (screenRef.current) screenRef.current.play().catch(console.error)
        }
      }}
    >
      {/* Top Control Bar */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="h-16 shrink-0 glass-strong border-b border-white/5 flex items-center justify-between px-4 md:px-6 z-40"
      >
        {/* Left: Info */}
        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-cyan/20 to-accent-purple/20 flex items-center justify-center glow-cyan shadow-lg">
              <Signal className="w-5 h-5 text-accent-cyan" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-white font-semibold text-sm">RemoteView Session</h1>
              <div className="flex items-center gap-2 text-xs">
                {isConnected ? (
                  <span className="text-accent-green flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" /> Optimal Link</span>
                ) : isConnecting ? (
                  <span className="text-yellow-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" /> Connecting...</span>
                ) : (
                  <span className="text-red-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Disconnected</span>
                )}
              </div>
            </div>
          </div>

          <div className="h-8 w-px bg-white/10 hidden sm:block" />

          {/* Session Code & Timer */}
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => { e.stopPropagation(); copyToClipboard(); }}
              className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
              title="Copy Session Code"
            >
              <span className="text-white/80 font-mono tracking-wider text-sm select-none">
                {formatCode(sessionCode)}
              </span>
              {copied ? <Check className="w-3.5 h-3.5 text-accent-green" /> : <Copy className="w-3.5 h-3.5 text-white/40 group-hover:text-white/80" />}
            </motion.button>
            
            {isConnected && (
              <div className="flex items-center gap-1.5 text-xs text-white/50" title="Session Duration">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-mono text-sm tracking-widest">{formatTime(sessionDuration)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 md:gap-3">
          {isConnected && (
            <>
              {/* Audio Toggle / Status */}
              <motion.div
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/5 hidden sm:flex"
              >
                {hasInteracted ? <Volume2 className="w-4 h-4 text-accent-green" /> : <VolumeX className="w-4 h-4 text-red-400" />}
                <span className={`text-xs font-medium ${hasInteracted ? "text-accent-green" : "text-red-400"}`}>
                  {hasInteracted ? 'Audio Live' : 'Click page to unmute'}
                </span>
              </motion.div>

              {/* Control Toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation()
                  handleToggleControl()
                  if (!hasInteracted) {
                    setHasInteracted(true)
                    if (screenRef.current) screenRef.current.play().catch(console.error)
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all shadow-md ${controlEnabled
                  ? 'bg-accent-green/20 text-accent-green hover:bg-accent-green/30 border border-accent-green/30'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                  }`}
              >
                <Mouse className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">{controlEnabled ? 'Control Inside' : 'Enable Control'}</span>
              </motion.button>

              {/* Fullscreen */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleFullscreen}
                className="p-2 lg:p-2.5 rounded-lg bg-white/5 text-white/80 hover:bg-white/10 border border-white/10 transition-all shadow-md"
                title="Fullscreen"
              >
                <Maximize className="w-4 h-4 lg:w-5 lg:h-5" />
              </motion.button>
            </>
          )}

          <div className="h-6 w-px bg-white/10 mx-1" />

          {/* End Session */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation()
              onDisconnect()
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 hover:text-red-300 transition-all shadow-md"
          >
            <X className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">End Session</span>
          </motion.button>
        </div>
      </motion.header>

      {/* Main Screen Content Area */}
      <div className="flex-1 relative w-full h-full bg-gradient-animated p-4 md:p-6 lg:p-8 flex items-center justify-center">
        
        {/* Connecting Overlay relative to main area */}
        <AnimatePresence>
          {isConnecting && !isConnected && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute z-30 flex flex-col items-center justify-center p-12 rounded-3xl glass-strong shadow-premium border border-white/10 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-accent-cyan/10 to-transparent pointer-events-none" />
              <div className="relative w-20 h-20 mb-8 mt-4">
                <div className="absolute inset-0 rounded-full border-2 border-accent-cyan/30 pulse-ring" />
                <div className="absolute inset-0 rounded-full border-2 border-accent-purple/30 pulse-ring" style={{ animationDelay: '0.5s' }}/>
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                    <Loader2 className="w-10 h-10 text-accent-cyan" />
                  </motion.div>
                </div>
              </div>
              <h2 className="text-white text-2xl font-bold mb-2 tracking-wide">Establishing Secure Link</h2>
              <p className="text-white/50 text-base mb-2">Negotiating peer-to-peer connection...</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The Frame / Canvas */}
        <motion.div 
          className="relative w-full h-full max-w-[1920px] max-h-[1080px] rounded-2xl overflow-hidden glass shadow-premium border border-white/10"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          {/* Shimmer Placeholder */}
          {!hasStream && isConnected && (
            <div className="absolute inset-0 shimmer opacity-20 pointer-events-none" />
          )}

          {/* Video element */}
          <div
            className={`w-full h-full relative bg-black/50 backdrop-blur-sm ${controlEnabled && isConnected ? 'cursor-none' : 'cursor-default'}`}
            onMouseMove={controlEnabled && isConnected ? handleMouseMove : undefined}
            onMouseDown={controlEnabled && isConnected ? handleMouseDown : undefined}
            onMouseUp={controlEnabled && isConnected ? handleMouseUp : undefined}
            onWheel={controlEnabled && isConnected ? handleWheel : undefined}
          >
            <video
              id="remoteVideo"
              ref={screenRef}
              autoPlay
              playsInline
              muted={!hasInteracted}
              className="w-full h-full object-contain drop-shadow-2xl"
              style={{ display: hasStream ? 'block' : 'none' }}
            />
          </div>

          {/* Control Disabled Frosted Badge */}
          <AnimatePresence>
            {!controlEnabled && isConnected && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute inset-0 pointer-events-none flex items-end justify-center pb-12"
              >
                <div className="bg-black/80 backdrop-blur-md px-6 py-4 rounded-full border border-white/10 shadow-2xl flex items-center gap-3">
                  <Keyboard className="w-5 h-5 text-accent-cyan" />
                  <p className="text-white/90 font-medium text-base">Controls are disabled. Click anywhere or toggle top bar to enable.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </div>

    </div>
  )
}

export default RemotePage
