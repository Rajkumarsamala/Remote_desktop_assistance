const TURN_URL = import.meta.env.VITE_TURN_URL;
const TURN_USERNAME = import.meta.env.VITE_TURN_USERNAME;
const TURN_PASSWORD = import.meta.env.VITE_TURN_PASSWORD;

const baseIceServers = [
  { urls: "stun:stun.l.google.com:19302" }
];

export const ICE_SERVERS = (TURN_URL && TURN_USERNAME && TURN_PASSWORD) 
  ? [
      ...baseIceServers,
      {
        urls: TURN_URL,
        username: TURN_USERNAME,
        credential: TURN_PASSWORD
      }
    ]
  : baseIceServers;

// Determine signaling server URL dynamically (env var > current host > fallback)
const getSignalingUrl = () => {
  if (import.meta.env.VITE_SIGNALING_URL) {
    return import.meta.env.VITE_SIGNALING_URL;
  }
  
  // Use relative host if in production
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }
  
  return 'wss://remote-view-signaling.onrender.com';
};

const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return `${window.location.protocol}//${window.location.host}`;
  }
  
  return 'https://remote-view-signaling.onrender.com';
};

export const SIGNALING_URL = getSignalingUrl();
export const API_URL = getApiUrl();

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
