# Remote Desktop Application - Technical Specification

## Project Overview
- **Project Name**: RemoteView
- **Type**: Real-time remote desktop sharing application
- **Core Functionality**: P2P screen sharing with remote input control using WebRTC
- **Target Users**: Individuals needing remote desktop access for support/collaboration

## Architecture

### Components
1. **Signaling Server** (FastAPI + WebSocket)
   - Session management (create/join)
   - WebRTC signaling (offer/answer/ICE candidates)
   - Session code generation
   - No screen data passes through here (pure signaling)

2. **Host Application** (Python)
   - Screen capture using `mss`
   - Frame compression (JPEG)
   - WebRTC peer connection
   - Input event execution via `pyautogui`
   - Registers with signaling server

3. **Client Application** (Python CLI + Web Interface)
   - Connects using session code
   - Receives and displays screen stream
   - Sends input events (mouse/keyboard)

### Connection Flow

```
1. HOST                         SERVER                      CLIENT
   │                              │                           │
   │──── Create Session ─────────►│                           │
   │◄─── Session Code ────────────│                           │
   │                              │                           │
   │                              │◄─── Join (code) ──────────│
   │                              │                           │
   │◄─────── WebRTC Offer ────────│───────────────────────────│
   │                              │                           │
   │─────── WebRTC Answer ───────────────────────────────────►│
   │                              │                           │
   │◄─────── ICE Candidates ──────│◄─────── ICE Candidates ───│
   │                              │                           │
   └══════════════ P2P WebRTC Connection ═════════════════════┘
                        (Screen + Input)
```

## Features

### Core Features
1. **Screen Sharing**
   - Continuous capture at ~15-30 FPS
   - JPEG compression for bandwidth efficiency
   - Resolution adaptation

2. **Remote Control**
   - Mouse movement and clicks
   - Keyboard input
   - Scroll wheel support

3. **Session Management**
   - 8-digit numeric codes (format: XXXX-XXXX)
   - Sessions expire after disconnect
   - Single-use codes (optional)

4. **Security**
   - Random session code generation
   - No persistent authentication
   - WebRTC encryption (DTLS/SRTP)

### NAT Traversal
- STUN servers for public IP discovery
- TURN relay fallback for symmetric NATs
- Public STUN: `stun:stun.l.google.com:19302`

## Tech Stack

### Backend
- **Language**: Python 3.9+
- **Framework**: FastAPI
- **WebSocket**: FastAPI WebSocket
- **Async**: uvicorn

### Frontend (Host)
- **Screen Capture**: mss
- **Image Processing**: Pillow
- **Input Control**: pyautogui
- **WebRTC**: aiortc (Python WebRTC)

### Frontend (Client)
- **WebRTC**: aiortc or browser-based
- **Display**: OpenCV or browser canvas

### Communication
- **Signaling**: WebSocket
- **Data Channel**: WebRTC DataChannel
- **Media**: WebRTC VideoTrack

## File Structure
```
remote-desktop/
├── signaling_server/
│   ├── server.py           # Main FastAPI server
│   └── session_manager.py # Session state management
├── host/
│   └── host.py             # Host application
├── client/
│   └── client.py           # Client application
├── shared/
│   ├── webrtc_utils.py     # WebRTC helper functions
│   ├── constants.py        # Shared constants
│   └── models.py           # Data models
├── requirements.txt
├── README.md
└── SPEC.md
```

## Security Considerations
- Session codes are cryptographically random
- WebRTC provides built-in encryption
- No persistent storage of credentials
- Session data is in-memory only

## Limitations (MVP)
- No file transfer
- No audio
- Basic quality (no adaptive bitrate)
- No reconnection handling
