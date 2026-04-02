import { useState, useRef, useCallback, useEffect } from 'react'
import { SIGNALING_URL, API_URL, MSG_TYPES, CONNECTION_STATE } from '../utils/constants'
import {
  createPeerConnection,
  createDataChannel,
  sendWsMessage,
  mouseEventToInput,
  keyboardEventToInput,
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

  const pcRef = useRef(null)
  const wsRef = useRef(null)
  const dataChannelRef = useRef(null)
  const screenRef = useRef(null)
  const inputEnabledRef = useRef(true)
  const iceCandidateQueueRef = useRef([])

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
        console.log('[WS] Connected')
        toast.success('Connected to signaling server')
        resolve()
      }

      ws.onerror = (error) => {
        console.error('[WS] Error:', error)
        toast.error('Failed to connect to server')
        reject(error)
      }

      ws.onclose = (event) => {
        console.log('[WS] Closed:', event.code, event.reason)
        if (connectionState !== CONNECTION_STATE.CONNECTED) {
          toast.error('Disconnected from server')
        }
        setConnectionState(CONNECTION_STATE.DISCONNECTED)
      }

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data)
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
        sendWsMessage(wsRef.current, MSG_TYPES.ICE_CANDIDATE, {
          candidate: event.candidate,
        })
      }
    }

    pc.ontrack = (event) => {
      console.log("Track received:", event);
      setRemoteStream(event.streams[0]);

      // Fallback for native DOM injection if React state is too slow
      const video = document.getElementById("remoteVideo");
      if (video) {
        video.srcObject = event.streams[0];
        console.log("Video stream set via ID");
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState)
      console.log('[PC] State:', pc.connectionState)
      if (pc.connectionState === 'connected') {
        setConnectionState(CONNECTION_STATE.CONNECTED)
      } else if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        setConnectionState(CONNECTION_STATE.DISCONNECTED)
        if (pc.connectionState === 'failed') {
          toast.error('Connection failed')
        }
      }
    }

    pc.oniceconnectionstatechange = () => {
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
   * Setup data channel for input events
   */
  const setupDataChannel = (channel) => {
    dataChannelRef.current = channel

    channel.onopen = () => {
      console.log('[DC] Open')
      toast.success('Input channel ready!')
    }

    channel.onclose = () => {
      console.log('[DC] Closed')
    }

    channel.onmessage = (event) => {
      console.log('[DC] Received:', event.data)
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
   * Handle wheel (scroll)
   */
  const handleWheel = useCallback((e) => {
    if (connectionState !== CONNECTION_STATE.CONNECTED) return
    e.preventDefault()
    const event = mouseEventToInput(e, screenRef)
    if (event) sendInputEvent(event)
  }, [connectionState, sendInputEvent])

  /**
   * Handle keyboard input
   */
  const handleKeyDown = useCallback((e) => {
    if (connectionState !== CONNECTION_STATE.CONNECTED) return
    if (e.target.tagName === 'INPUT') return
    e.preventDefault()
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
  }
}
