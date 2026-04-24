"""
Shared constants for Remote Desktop Application
"""
import os

# Server configuration
SIGNALING_HOST = os.getenv("SIGNALING_HOST", "remote-view-signaling.onrender.com")
SIGNALING_PORT = int(os.getenv("SIGNALING_PORT", "443"))
# Use wss:// for production (HTTPS), ws:// for localhost
SIGNALING_WS_URL = f"wss://{SIGNALING_HOST}" if SIGNALING_PORT == 443 else f"ws://{SIGNALING_HOST}:{SIGNALING_PORT}"

# STUN/TURN servers for NAT traversal
STUN_SERVERS = [
    "stun:stun.l.google.com:19302",
    "stun:stun1.l.google.com:19302",
    "stun:stun2.l.google.com:19302",
]

# TURN server (for symmetric NATs) - using free metered TURN
TURN_SERVERS = [
    #"turn:your-turn-server.com:3478",  # Add your TURN server here if needed
]

TURN_URL = os.getenv("TURN_URL", "turn:openrelay.metered.ca:443")
TURN_USERNAME = os.getenv("TURN_USERNAME", "openrelayproject")
TURN_PASSWORD = os.getenv("TURN_PASSWORD", "openrelayproject")

ICESERVERS = [
    {"urls": "stun:stun.l.google.com:19302"},
    {"urls": "stun:stun1.l.google.com:19302"},
    {"urls": TURN_URL, "username": TURN_USERNAME, "credential": TURN_PASSWORD},
]

# WebRTC configuration
WEBRTC_CONFIG = {
    "iceServers": ICESERVERS,
    "iceTransportPolicy": "all",  # Use 'relay' for TURN-only if needed
}

# Video/Screen settings
SCREEN_QUALITY = 75  # JPEG quality (0-100)
SCREEN_FPS = 20  # Frames per second
SCREEN_CHUNK_SIZE = 16384  # WebRTC data channel chunk size

# Input settings
INPUT_PORT = 8766  # Local UDP port for input events

# Session settings
SESSION_CODE_LENGTH = 8  # Total digits (will be formatted as XXXX-XXXX)
SESSION_EXPIRY_SECONDS = 3600  # 1 hour
MAX_SESSIONS = 100  # Max concurrent sessions

# Message types for WebSocket signaling
MSG_TYPE_OFFER = "offer"
MSG_TYPE_ANSWER = "answer"
MSG_TYPE_ICE_CANDIDATE = "ice-candidate"
MSG_TYPE_CREATE_SESSION = "create_session"
MSG_TYPE_JOIN_SESSION = "join_session"
MSG_TYPE_SESSION_CREATED = "session_created"
MSG_TYPE_SESSION_JOINED = "session_joined"
MSG_TYPE_SESSION_NOT_FOUND = "session_not_found"
MSG_TYPE_SESSION_FULL = "session_full"
MSG_TYPE_PEER_DISCONNECTED = "peer_disconnected"
MSG_TYPE_ERROR = "error"
MSG_TYPE_PING = "ping"
MSG_TYPE_PONG = "pong"
MSG_TYPE_HOST_REGISTERED = "host_registered"
MSG_TYPE_CLIENT_REGISTERED = "client_registered"
MSG_TYPE_INPUT_EVENT = "input_event"
MSG_TYPE_SCREEN_FRAME = "screen_frame"

# Host configuration
DEFAULT_SCREEN_INDEX = 0
ENABLE_CURSOR_EMBEDDING = True
