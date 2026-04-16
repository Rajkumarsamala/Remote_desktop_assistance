import { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Mouse, Keyboard, Loader2, Wifi, WifiOff, Maximize } from 'lucide-react'
import { CONNECTION_STATE } from '../utils/constants'

function RemotePage({ webrtc, onDisconnect }) {
  const containerRef = useRef(null)
  const [controlEnabled, setControlEnabled] = useState(true)
  const [showControls, setShowControls] = useState(true)

  const {
    connectionState,
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

  // Attach remote stream to video
  useEffect(() => {
    if (screenRef.current && remoteStream) {
      screenRef.current.srcObject = remoteStream
    }
  }, [remoteStream, screenRef])

  // Handle mouse leave
  const handleMouseLeave = () => {
    // Send mouse leave event if needed
  }

  // Toggle controls visibility
  const toggleControls = () => {
    setShowControls(!showControls)
  }

  // Handle control toggle
  const handleToggleControl = () => {
    const newState = toggleInput()
    setControlEnabled(newState)
  }

  // Handle Fullscreen toggle
  const handleFullscreen = async (e) => {
    e.stopPropagation()
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

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-black flex items-center justify-center relative"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >



      {/* Connection Status Overlay */}
      {isConnecting && !isConnected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="w-16 h-16 text-accent-cyan mb-4" />
          </motion.div>
          <p className="text-white text-xl">Establishing connection...</p>
          <p className="text-white/50 text-sm mt-2">Setting up secure connection</p>
        </motion.div>
      )}

      {/* Video Container */}
      <div
        className="relative w-full h-screen cursor-crosshair"
        onMouseMove={controlEnabled ? handleMouseMove : undefined}
        onMouseDown={controlEnabled ? handleMouseDown : undefined}
        onMouseUp={controlEnabled ? handleMouseUp : undefined}
        onWheel={controlEnabled ? handleWheel : undefined}
        onClick={toggleControls}
      >
        {/* Remote Video */}
        <video
          id="remoteVideo"
          ref={screenRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain bg-black"
        />

        {/* Overlay Controls */}
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
          >
            <div className="flex items-center justify-between">
              {/* Left - Status */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <Wifi className="w-5 h-5 text-accent-green" />
                  ) : (
                    <WifiOff className="w-5 h-5 text-white/50" />
                  )}
                  <span className={`text-sm font-medium ${isConnected ? 'text-accent-green' : 'text-white/50'
                    }`}>
                    {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
                  </span>
                </div>

                {isConnected && (
                  <div className="h-4 w-px bg-white/20" />

                )}

                {isConnected && (
                  <div className="flex items-center gap-2 text-sm text-white/50">
                    <Mouse className="w-4 h-4" />
                    <span>{controlEnabled ? 'Control On' : 'Control Off'}</span>
                  </div>
                )}
              </div>

              {/* Right - Actions */}
              <div className="flex items-center gap-3">
                {/* Toggle Control */}
                {isConnected && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleControl()
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${controlEnabled
                      ? 'bg-accent-green/20 text-accent-green hover:bg-accent-green/30'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                      }`}
                  >
                    {controlEnabled ? (
                      <>
                        <Mouse className="w-4 h-4" />
                        <span>Control On</span>
                      </>
                    ) : (
                      <>
                        <span>Enable Control</span>
                      </>
                    )}
                  </motion.button>
                )}

                {/* Fullscreen Toggle */}
                {isConnected && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleFullscreen}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 transition-all"
                  >
                    <Maximize className="w-5 h-5" />
                  </motion.button>
                )}

                {/* Disconnect */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onDisconnect()
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Disconnect</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Top Status Bar */}
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-accent-green animate-pulse" />
                <span className="text-white font-medium">Remote Session</span>
              </div>

              {/* Keyboard hint */}
              <div className="hidden md:flex items-center gap-2 text-white/40 text-sm">
                <Keyboard className="w-4 h-4" />
                <span>Click to disable controls</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Control Disabled Overlay */}
        {!controlEnabled && isConnected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
          >
            <div className="bg-black/60 backdrop-blur-sm px-6 py-3 rounded-2xl">
              <p className="text-white/70 text-sm">Click anywhere to enable control</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Click to enable control */}
      {controlEnabled && isConnected && (
        <div
          className="absolute inset-0 pointer-events-none"
          onClick={(e) => {
            e.stopPropagation()
            setControlEnabled(false)
            toggleInput()
          }}
        />
      )}
    </div>
  )
}

export default RemotePage
