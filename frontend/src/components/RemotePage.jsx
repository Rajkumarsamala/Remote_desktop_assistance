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
  const [isMuted, setIsMuted] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sessionDuration, setSessionDuration] = useState(0)
  const [isHeaderVisible, setIsHeaderVisible] = useState(true)
  const headerTimeoutRef = useRef(null)

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
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    toggleInput,
    screenRef,
    stats,
  } = webrtc

  const isConnected = connectionState === CONNECTION_STATE.CONNECTED
  const isConnecting = connectionState === CONNECTION_STATE.CONNECTING
  const hasStream = !!remoteStream
  const hasAudioTrack = remoteStream && remoteStream.getAudioTracks().length > 0

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

  // Header Auto-Hide Logic
  const resetHeaderTimeout = () => {
    setIsHeaderVisible(true)
    if (headerTimeoutRef.current) clearTimeout(headerTimeoutRef.current)
    headerTimeoutRef.current = setTimeout(() => {
      if (isConnected) {
        setIsHeaderVisible(false)
      }
    }, 3000)
  }

  useEffect(() => {
    if (isConnected) {
      resetHeaderTimeout()
    } else {
      setIsHeaderVisible(true)
    }
    return () => {
      if (headerTimeoutRef.current) clearTimeout(headerTimeoutRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected])

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
      {/* Top hover zone to reveal header */}
      <div 
        className="absolute top-0 left-0 w-full h-16 z-50" 
        onMouseEnter={resetHeaderTimeout}
      />

      {/* Top Control Bar (Floating Dock) */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: isHeaderVisible ? 0 : -100, opacity: isHeaderVisible ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        onMouseEnter={resetHeaderTimeout}
        className="absolute top-4 left-1/2 -translate-x-1/2 h-16 w-[95%] max-w-6xl glass-strong border border-white/10 rounded-2xl flex items-center justify-between px-6 z-40 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]"
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
            
            {isConnected && stats && (
              <div className="flex items-center gap-4 text-xs text-white/50 ml-4 hidden lg:flex border-l border-white/10 pl-4">
                <div className="flex items-center gap-1.5" title="Latency (Ping)">
                  <span className="font-mono">{stats.ping}ms ping</span>
                </div>
                <div className="flex items-center gap-1.5" title="Packet Loss">
                  <span className="font-mono text-red-400">{stats.packetLoss}% loss</span>
                </div>
                <div className="flex items-center gap-1.5" title="Bandwidth">
                  <span className="font-mono">{stats.bytesReceived} MB</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 md:gap-3">
          {isConnected && (
            <>
              {/* Audio Toggle / Status */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation()
                  if (!hasAudioTrack) {
                    toast('No audio track available from host.', { icon: '🔇' })
                    return
                  }
                  setIsMuted(!isMuted)
                  setHasInteracted(true)
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                  !hasAudioTrack 
                    ? 'bg-white/5 border-white/5 text-white/40 cursor-not-allowed' 
                    : !isMuted 
                      ? 'bg-accent-green/20 border-accent-green/30 text-accent-green cursor-pointer shadow-[0_0_10px_rgba(0,255,136,0.2)]' 
                      : 'bg-white/5 border-white/10 text-red-400 cursor-pointer hover:bg-white/10'
                } hidden sm:flex`}
                title={!hasAudioTrack ? "No Audio Available" : !isMuted ? "Mute Audio" : "Unmute Audio"}
              >
                {!hasAudioTrack ? <VolumeX className="w-4 h-4" /> : !isMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                <span className="text-xs font-medium">
                  {!hasAudioTrack ? 'No Audio' : !isMuted ? 'Audio Live' : 'Muted'}
                </span>
              </motion.button>

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
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation()
              onDisconnect()
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/50 transition-all shadow-md group"
          >
            <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
            <span className="text-sm font-bold hidden sm:inline tracking-wide">End Session</span>
          </motion.button>
        </div>
      </motion.header>

      {/* Main Screen Content Area */}
      <div className="flex-1 relative w-full h-full bg-gradient-animated p-4 md:p-6 lg:p-12 pt-28 md:pt-28 lg:pt-28 flex items-center justify-center">
        
        {/* Connecting Overlay relative to main area */}
        <AnimatePresence>
          {isConnecting && !isConnected && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              className="absolute z-30 flex flex-col items-center justify-center p-16 rounded-[3rem] glass-strong shadow-premium overflow-hidden border border-white/10"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-accent-cyan/10 via-transparent to-accent-purple/10 pointer-events-none" />
              
              <div className="relative w-36 h-36 mb-10 mt-4 flex items-center justify-center">
                {/* Orbital Rings */}
                <div className="absolute inset-0 rounded-full border border-white/5" />
                <div className="absolute inset-2 rounded-full border border-white/10 border-t-accent-cyan/80 animate-spin" style={{ animationDuration: '3s' }} />
                <div className="absolute inset-6 rounded-full border border-white/10 border-b-accent-purple/80 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
                <div className="absolute inset-10 rounded-full border border-white/10 border-l-accent-green/80 animate-spin" style={{ animationDuration: '4s' }} />
                
                {/* Center Core */}
                <div className="absolute w-12 h-12 bg-white/10 rounded-full blur-md animate-pulse" />
                <div className="relative z-10 flex items-center justify-center drop-shadow-[0_0_20px_rgba(0,212,255,0.8)]">
                  <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }} transition={{ duration: 4, ease: "linear", repeat: Infinity }}>
                    <Loader2 className="w-10 h-10 text-white/80" />
                  </motion.div>
                </div>
              </div>
              
              <h2 className="text-white text-3xl font-extrabold mb-3 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">Establishing Link</h2>
              <div className="flex items-center gap-2 text-white/50 text-lg font-light">
                <span className="w-2 h-2 rounded-full bg-accent-cyan animate-ping" />
                Negotiating peer-to-peer connection...
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The Frame / Canvas */}
        <motion.div 
          className="relative w-full h-full max-w-[1920px] max-h-[1080px] rounded-[2rem] overflow-hidden bg-black/40 backdrop-blur-md shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] border border-white/10 group"
          initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
        >
          {/* Subtle glow border when connected */}
          {isConnected && (
            <div className="absolute inset-0 rounded-[2rem] pointer-events-none border border-accent-cyan/20 group-hover:border-accent-cyan/40 transition-colors duration-500 shadow-[inset_0_0_50px_rgba(0,212,255,0.05)]" />
          )}
          {/* Shimmer Placeholder */}
          {!hasStream && isConnected && (
            <div className="absolute inset-0 shimmer opacity-20 pointer-events-none" />
          )}

          {/* Video element */}
          <div
            className={`w-full h-full relative bg-black/50 backdrop-blur-sm ${controlEnabled && isConnected ? 'cursor-none pointer-events-none' : 'cursor-default'}`}
            onMouseMove={resetHeaderTimeout}
          >
            {/* Note: Browsers require video to be muted to autoplay without prior user interaction */}
            <video
              id="remoteVideo"
              ref={screenRef}
              autoPlay
              playsInline
              muted={!hasInteracted || isMuted}
              className={`w-full h-full object-contain drop-shadow-2xl ${controlEnabled ? 'pointer-events-auto' : 'pointer-events-none'}`}
              style={{ display: hasStream ? 'block' : 'none', touchAction: 'none' }}
              onMouseMove={controlEnabled && isConnected ? handleMouseMove : undefined}
              onMouseDown={controlEnabled && isConnected ? handleMouseDown : undefined}
              onMouseUp={controlEnabled && isConnected ? handleMouseUp : undefined}
              onClick={controlEnabled && isConnected ? handleMouseDown : undefined}
              onTouchStart={controlEnabled && isConnected ? handleTouchStart : undefined}
              onTouchMove={controlEnabled && isConnected ? handleTouchMove : undefined}
              onTouchEnd={controlEnabled && isConnected ? handleTouchEnd : undefined}
              onTouchCancel={controlEnabled && isConnected ? handleTouchEnd : undefined}
              onContextMenu={(e) => {
                 if(controlEnabled && isConnected) e.preventDefault(); 
              }}
              onWheel={controlEnabled && isConnected ? handleWheel : undefined}
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
