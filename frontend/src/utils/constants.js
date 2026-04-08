// WebRTC Configuration - STUN + TURN for reliable cross-network connections
export const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  // Free TURN relay for symmetric NATs - openrelay.projectenica.org
  { urls: "turn:openrelay.projectenica.org:443", username: "openrelay", credential: "openrelay" },
]

// Signaling Server URL - use wss:// for secure WebSocket over public internet
export const SIGNALING_URL = 'wss://remote-view-signaling.onrender.com'
// API URL uses https:// (not wss://)
export const API_URL = 'https://remote-view-signaling.onrender.com'

// Message Types
export const MSG_TYPES = {
  HOST_REGISTERED: 'host_registered',
  CLIENT_REGISTERED: 'client_registered',
  OFFER: 'offer',
  ANSWER: 'answer',
  ICE_CANDIDATE: 'ice-candidate',
  PEER_DISCONNECTED: 'peer_disconnected',
  HOST_READY: 'host_ready',
  CLIENT_JOINED: 'client_joined',
  ERROR: 'error',
  PING: 'ping',
  PONG: 'pong',
}

// Connection States
export const CONNECTION_STATE = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  COMPLETED: 'completed',
  FAILED: 'failed',
}

// Screen Quality Presets
export const QUALITY_PRESETS = {
  LOW: { width: 640, height: 480, fps: 10 },
  MEDIUM: { width: 1280, height: 720, fps: 20 },
  HIGH: { width: 1920, height: 1080, fps: 30 },
}
