import { useState, useRef, useCallback, useEffect } from 'react'
import { SIGNALING_URL, API_URL, MSG_TYPES, CONNECTION_STATE } from '../utils/constants'
import {
  createPeerConnection,
  createDataChannel,
  sendWsMessage,
  mouseEventToInput,
  keyboardEventToInput,
  touchEventToInput,
} from '../utils/webrtc'
import toast from 'react-hot-toast'

/**
 * Custom hook for managing WebRTC connection
 */
export function useWebRTC() {
  const [connectionState, setConnectionState] = useState(CONNECTION_STATE.DISCONNECTED)
  const [sessionCode, setSessionCode] = useState(null)
  const [isHost, setIsHost] = useState(false)
  const isHostRef = useRef(false)
  const [remoteStream, setRemoteStream] = useState(null)
  const [stats, setStats] = useState({ ping: 0, packetLoss: 0, bytesReceived: 0 })

  const pcRef = useRef(null)
  const wsRef = useRef(null)
  const dataChannelRef = useRef(null)
  const screenRef = useRef(null)
  const iceTimeoutRef = useRef(null)
  const inputEnabledRef = useRef(true)
  const iceCandidateQueueRef = useRef([])
  const shareModeRef = useRef(null)
  const remoteModeRef = useRef('monitor')
  const lastMouseEventRef = useRef(0)
  const activeStreamRef = useRef(null)
  const statsIntervalRef = useRef(null)
  const touchStateRef = useRef({ lastDist: 0, longPressTimer: null })

  /**
   * Connect to signaling server
   */
  const connectSignaling = useCallback((code, role) => {
    return new Promise((resolve, reject) => {
      const wsUrl = `${SIGNALING_URL}/ws/${role}:${code}`
      console.log('[WS] Connecting to:', wsUrl)

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[WS] Socket open, waiting for registration...')
      }

      ws.onerror = (error) => {
        console.error('[WS] Error:', error)
        toast.error('Failed to connect to server')
        reject(new Error('Failed to connect to server'))
      }

      ws.onclose = (event) => {
        console.log('[WS] Closed:', event.code, event.reason)
        reject(new Error(event.reason || 'Session not found or invalid'))
        
        if (connectionState !== CONNECTION_STATE.CONNECTED) {
          toast.error(event.reason || 'Disconnected from server')
        }
        setConnectionState(CONNECTION_STATE.DISCONNECTED)
      }

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data)
          
          if (msg.type === MSG_TYPES.HOST_REGISTERED || msg.type === MSG_TYPES.CLIENT_REGISTERED) {
            resolve()
          }

          await handleSignalingMessage(msg)
        } catch (e) {
          console.error('[WS] Parse error:', e)
        }
      }
    })
  }, [connectionState])

  /**
   * Handle signaling messages
   */
  const handleSignalingMessage = useCallback(async (msg) => {
    console.log('[SIG]', msg.type)

    switch (msg.type) {
      case MSG_TYPES.HOST_REGISTERED:
        toast.success('Session created! Waiting for viewer...')
        setConnectionState(CONNECTION_STATE.CONNECTING)
        break

      case MSG_TYPES.CLIENT_REGISTERED:
        toast.success('Connected to session!')
        setConnectionState(CONNECTION_STATE.CONNECTING)
        break

      case MSG_TYPES.HOST_READY:
      case MSG_TYPES.CLIENT_JOINED:
        // Client joined - create WebRTC offer (as host)
        if (isHostRef.current) {
          toast('Viewer joined! Establishing connection...', { icon: '🎉' })
          await createOffer()
        }
        break

      case MSG_TYPES.OFFER:
        console.log('[SIG] Received offer')
        await handleOffer(msg.sdp)
        break

      case MSG_TYPES.ANSWER:
        console.log('[SIG] Received answer')
        await handleAnswer(msg.sdp)
        break

      case MSG_TYPES.ICE_CANDIDATE:
        if (msg.candidate) {
          if (pcRef.current && pcRef.current.remoteDescription) {
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate))
            } catch (e) {
              console.error('[ICE] Add error:', e)
            }
          } else {
            console.log('[ICE] Queuing candidate')
            iceCandidateQueueRef.current.push(msg.candidate)
          }
        }
        break

      case MSG_TYPES.PEER_DISCONNECTED:
        toast.error('Remote peer disconnected')
        disconnect()
        break

      case MSG_TYPES.ERROR:
        toast.error(msg.message || 'Unknown error')
        break
    }
  }, [])

  /**
   * Create RTCPeerConnection
   */
  const createPeer = useCallback(() => {
    const pc = createPeerConnection()
    pcRef.current = pc

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // Use toJSON() to properly serialize the candidate for WebSocket transmission
        sendWsMessage(wsRef.current, MSG_TYPES.ICE_CANDIDATE, {
          candidate: event.candidate.toJSON(),
        })
      }
    }

    pc.ontrack = (event) => {
      console.log("Track received:", event.track.kind);
      
      if (!activeStreamRef.current) {
        activeStreamRef.current = new MediaStream();
      }
      
      // Prevent duplicate tracks
      if (!activeStreamRef.current.getTracks().find(t => t.id === event.track.id)) {
        activeStreamRef.current.addTrack(event.track);
      }
      
      setRemoteStream(activeStreamRef.current);

      // Fallback for native DOM injection
      const video = document.getElementById("remoteVideo");
      if (video) {
        video.srcObject = activeStreamRef.current;
        console.log("Video stream set via ID with tracks:", activeStreamRef.current.getTracks().map(t => t.kind));
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(pc.connectionState)
      console.log('[PC] State:', pc.connectionState)
      
      if (pc.connectionState === 'connecting') {
        setConnectionState(CONNECTION_STATE.CONNECTING)
        if (iceTimeoutRef.current) clearTimeout(iceTimeoutRef.current);
        iceTimeoutRef.current = setTimeout(() => {
          if (pcRef.current && pcRef.current.connectionState !== 'connected') {
            toast.error('Connection stalled - Restarting ICE...');
            if (isHostRef.current) {
                pcRef.current.createOffer({ iceRestart: true })
                  .then(offer => {
                    return pcRef.current.setLocalDescription(offer).then(() => offer);
                  })
                  .then(offer => {
                    sendWsMessage(wsRef.current, MSG_TYPES.OFFER, { sdp: offer.sdp });
                  })
                  .catch(e => console.error('[ICE] Restart failed', e));
            } else {
                toast('Waiting for host to restart ICE...', { icon: '⏳' });
            }
          }
        }, 15000);
      } else if (pc.connectionState === 'connected') {
        if (iceTimeoutRef.current) clearTimeout(iceTimeoutRef.current);
        setConnectionState(CONNECTION_STATE.CONNECTED)
        
        // Start stats polling
        statsIntervalRef.current = setInterval(async () => {
          if (!pcRef.current) return
          try {
            const stats = await pcRef.current.getStats()
            let ping = 0
            let packetsLost = 0
            let packetsReceived = 0
            let bytesReceived = 0
            
            stats.forEach(report => {
              if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                ping = Math.round(report.currentRoundTripTime * 1000)
              }
              if (report.type === 'inbound-rtp' && report.kind === 'video') {
                packetsLost = report.packetsLost || 0
                packetsReceived = report.packetsReceived || 0
                bytesReceived = report.bytesReceived || 0
              }
            })
            
            const packetLoss = packetsReceived > 0 ? ((packetsLost / (packetsLost + packetsReceived)) * 100).toFixed(1) : 0
            
            setStats({
              ping: ping || '< 1',
              packetLoss,
              bytesReceived: (bytesReceived / 1024 / 1024).toFixed(2)
            })
          } catch (e) {
            console.error('[Stats] Error', e)
          }
        }, 1000)
      } else if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        if (iceTimeoutRef.current) clearTimeout(iceTimeoutRef.current);
        setConnectionState(CONNECTION_STATE.DISCONNECTED)
        if (pc.connectionState === 'failed') {
          toast.error('Connection failed (ICE Error)')
        }
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log(pc.iceConnectionState)
      console.log("ICE state:", pc.iceConnectionState)
    }

    if (isHostRef.current) {
      // Host creates data channel
      const dc = createDataChannel(pc)
      setupDataChannel(dc)
    } else {
      // Client receives data channel
      pc.ondatachannel = (event) => {
        setupDataChannel(event.channel)
      }
    }

    return pc
  }, [])

  /**
   * Handle incoming input event from viewer (host-side)
   * Simulated on DOM elements ONLY if sharing a browser tab.
   */
  const handleInputEvent = useCallback((event) => {
    // DOM simulation has been removed for production-level desktop native execution.
    // The browser host will not securely execute OS-level events.
    console.log('[DC] Input event logged securely:', event.event_type);
  }, [])

  /**
   * Setup data channel for input events
   */
  const setupDataChannel = (channel) => {
    dataChannelRef.current = channel

    channel.onopen = () => {
      console.log('[DC] Open')
      toast.success('Input channel ready!')

      if (isHostRef.current && shareModeRef.current) {
        channel.send(JSON.stringify({
          event_type: 'mode_info',
          mode: shareModeRef.current
        }))
      }
    }

    channel.onclose = () => {
      console.log('[DC] Closed')
    }

    channel.onmessage = (event) => {
      try {
        const inputEvent = JSON.parse(event.data)

        if (inputEvent.event_type === 'mode_info') {
          console.log('[DC] Mode set explicitly to:', inputEvent.mode)
          remoteModeRef.current = inputEvent.mode
          if (inputEvent.mode === 'window') {
            toast('Window sharing detected: input control restricted.', { icon: '⚠️' })
          } else if (inputEvent.mode === 'browser') {
            toast.success('Tab sharing detected: DOM control enabled.')
          }
          return
        }

        if (isHostRef.current) {
          handleInputEvent(inputEvent)
        }
      } catch (e) {
        console.error('[DC] Parse error:', e)
      }
    }

    channel.onerror = (error) => {
      console.error('[DC] Error:', error)
    }
  }

  /**
   * Create offer (host creates connection)
   */
  const createOffer = useCallback(async () => {
    const pc = createPeer()

    if (isHostRef.current) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
        const videoTrack = stream.getVideoTracks()[0]
        if (videoTrack) {
          const settings = videoTrack.getSettings()
          shareModeRef.current = settings.displaySurface || 'monitor'
        }
        stream.getTracks().forEach(track => pc.addTrack(track, stream))
      } catch (e) {
        console.error("Failed to capture screen:", e)
        toast.error("Failed to capture screen")
      }
    }

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    sendWsMessage(wsRef.current, MSG_TYPES.OFFER, { sdp: offer.sdp })
  }, [])

  /**
   * Flush queued ICE candidates
   */
  const flushIceCandidates = useCallback(async () => {
    if (pcRef.current && pcRef.current.remoteDescription) {
      while (iceCandidateQueueRef.current.length > 0) {
        const candidate = iceCandidateQueueRef.current.shift()
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (e) {
          console.error('[ICE] Queue add error:', e)
        }
      }
    }
  }, [])

  /**
   * Handle incoming offer (client responds)
   */
  const handleOffer = useCallback(async (sdp) => {
    const pc = createPeer()

    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }))
    await flushIceCandidates()

    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    sendWsMessage(wsRef.current, MSG_TYPES.ANSWER, { sdp: answer.sdp })
  }, [createPeer, flushIceCandidates])

  /**
   * Handle incoming answer (host completes connection)
   */
  const handleAnswer = useCallback(async (sdp) => {
    if (pcRef.current) {
      await pcRef.current.setRemoteDescription(
        new RTCSessionDescription({ type: 'answer', sdp })
      )
      await flushIceCandidates()
    }
  }, [flushIceCandidates])

  /**
   * Send input event to host
   */
  const sendInputEvent = useCallback((event) => {
    if (!inputEnabledRef.current) return

    const dataChannel = dataChannelRef.current
    if (dataChannel && dataChannel.readyState === 'open') {
      dataChannel.send(JSON.stringify(event))
    }
  }, [])

  /**
   * Handle mouse move
   */
  const handleMouseMove = useCallback((e) => {
    if (connectionState !== CONNECTION_STATE.CONNECTED) return

    // Throttle high-frequency events (~30fps limit)
    const now = Date.now()
    if (now - lastMouseEventRef.current < 33) return
    lastMouseEventRef.current = now

    const event = mouseEventToInput(e, screenRef)
    if (event) sendInputEvent(event)
  }, [connectionState, sendInputEvent])

  /**
   * Handle mouse click
   */
  const handleMouseDown = useCallback((e) => {
    if (connectionState !== CONNECTION_STATE.CONNECTED) return
    const event = mouseEventToInput(e, screenRef)
    if (event) sendInputEvent(event)
  }, [connectionState, sendInputEvent])

  /**
   * Handle mouse release
   */
  const handleMouseUp = useCallback((e) => {
    if (connectionState !== CONNECTION_STATE.CONNECTED) return
    const event = mouseEventToInput(e, screenRef)
    if (event) sendInputEvent(event)
  }, [connectionState, sendInputEvent])

  /**
   * Handle Touch Start (Tap = Click, Hold = Right Click)
   */
  const handleTouchStart = useCallback((e) => {
    if (connectionState !== CONNECTION_STATE.CONNECTED) return
    if (e.touches.length === 1) {
      // Setup long press for right click
      touchStateRef.current.longPressTimer = setTimeout(() => {
        const event = touchEventToInput(e, screenRef, 'touchstart', { button: 'right' })
        if (event) sendInputEvent(event)
        
        // Auto release right click after a short delay
        setTimeout(() => {
           const upEvent = touchEventToInput(e, screenRef, 'touchend', { button: 'right' })
           if (upEvent) sendInputEvent(upEvent)
        }, 100)
        
        touchStateRef.current.longPressTimer = null
        toast('Right click', { icon: '🖱️', id: 'rc' })
      }, 500)
    } else if (e.touches.length === 2) {
      // Pinch to zoom initialization
      if (touchStateRef.current.longPressTimer) clearTimeout(touchStateRef.current.longPressTimer)
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      touchStateRef.current.lastDist = Math.sqrt(dx*dx + dy*dy)
    }
  }, [connectionState, sendInputEvent])

  /**
   * Handle Touch Move (Pinch = Zoom)
   */
  const handleTouchMove = useCallback((e) => {
    if (connectionState !== CONNECTION_STATE.CONNECTED) return
    
    // Cancel long press if moving
    if (touchStateRef.current.longPressTimer) {
      clearTimeout(touchStateRef.current.longPressTimer)
      touchStateRef.current.longPressTimer = null
      
      // We moved, so it's a drag. Send mouse down now.
      const downEvent = touchEventToInput(e, screenRef, 'touchstart', { button: 'left' })
      if (downEvent) sendInputEvent(downEvent)
    }

    if (e.touches.length === 1) {
      const now = Date.now()
      if (now - lastMouseEventRef.current < 33) return
      lastMouseEventRef.current = now

      const event = touchEventToInput(e, screenRef, 'touchmove')
      if (event) sendInputEvent(event)
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx*dx + dy*dy)
      
      const delta = touchStateRef.current.lastDist - dist
      touchStateRef.current.lastDist = dist
      
      if (Math.abs(delta) > 2) {
        const event = touchEventToInput(e, screenRef, 'pinch', { deltaY: delta * 2 })
        if (event) sendInputEvent(event)
      }
    }
  }, [connectionState, sendInputEvent])

  /**
   * Handle Touch End
   */
  const handleTouchEnd = useCallback((e) => {
    if (connectionState !== CONNECTION_STATE.CONNECTED) return
    
    if (touchStateRef.current.longPressTimer) {
      // It was a quick tap, so send left click down and up
      clearTimeout(touchStateRef.current.longPressTimer)
      touchStateRef.current.longPressTimer = null
      
      const downEvent = touchEventToInput(e, screenRef, 'touchstart', { button: 'left' })
      if (downEvent) sendInputEvent(downEvent)
    }
    
    const event = touchEventToInput(e, screenRef, 'touchend', { button: 'left' })
    if (event) sendInputEvent(event)
  }, [connectionState, sendInputEvent])

  /**
   * Handle wheel (scroll)
   */
  const handleWheel = useCallback((e) => {
    if (connectionState !== CONNECTION_STATE.CONNECTED) return
    const event = mouseEventToInput(e, screenRef)
    if (event) sendInputEvent(event)
  }, [connectionState, sendInputEvent])

  /**
   * Handle keyboard input
   */
  const handleKeyDown = useCallback((e) => {
    if (connectionState !== CONNECTION_STATE.CONNECTED) return
    const event = keyboardEventToInput(e)
    sendInputEvent(event)
  }, [connectionState, sendInputEvent])

  /**
   * Handle key up
   */
  const handleKeyUp = useCallback((e) => {
    if (connectionState !== CONNECTION_STATE.CONNECTED) return
    const event = keyboardEventToInput(e)
    sendInputEvent(event)
  }, [connectionState, sendInputEvent])

  /**
   * Toggle input control
   */
  const toggleInput = useCallback(() => {
    inputEnabledRef.current = !inputEnabledRef.current
    toast.success(inputEnabledRef.current ? 'Control enabled' : 'Control disabled')
    return inputEnabledRef.current
  }, [])

  /**
   * Start host session
   */
  const startHost = useCallback(async () => {
    try {
      console.log('[Host] Creating session via: /create-session')

      const response = await fetch(`${API_URL}/create-session`, {
        method: 'POST',
      })

      console.log('[Host] Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Host] Response error:', errorText)
        throw new Error(`Failed to create session: ${response.status}`)
      }

      const data = await response.json()
      console.log('[Host] Session created:', data)
      const code = data.code

      setSessionCode(code)
      setIsHost(true)
      isHostRef.current = true

      // Connect to signaling
      await connectSignaling(code, 'host')

      return code
    } catch (error) {
      console.error('[Host] Error:', error)
      toast.error(error.message || 'Failed to create session')
      throw error
    }
  }, [connectSignaling])

  /**
   * Join existing session
   */
  const joinSession = useCallback(async (code) => {
    try {
      const cleanCode = code.replace(/[^0-9]/g, '')
      console.log('[Client] Joining session:', cleanCode)

      setSessionCode(cleanCode)
      setIsHost(false)
      isHostRef.current = false

      await connectSignaling(cleanCode, 'client')

      return true
    } catch (error) {
      console.error('[Client] Error:', error)
      toast.error(error.message || 'Failed to join session')
      throw error
    }
  }, [connectSignaling])

  /**
   * Disconnect and cleanup
   */
  const disconnect = useCallback(() => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current)
      statsIntervalRef.current = null
    }

    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    if (dataChannelRef.current) {
      dataChannelRef.current.close()
      dataChannelRef.current = null
    }

    setConnectionState(CONNECTION_STATE.DISCONNECTED)
    setRemoteStream(null)
    setSessionCode(null)
    inputEnabledRef.current = true
    iceCandidateQueueRef.current = []
    activeStreamRef.current = null
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    // State
    connectionState,
    sessionCode,
    isHost,
    remoteStream,
    screenRef,
    inputEnabled: inputEnabledRef.current,

    // Actions
    startHost,
    joinSession,
    disconnect,
    toggleInput,

    // Input handlers
    handleMouseMove,
    handleMouseDown,
    handleMouseUp,
    handleWheel,
    handleKeyDown,
    handleKeyUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    
    // Stats
    stats,
  }
}
