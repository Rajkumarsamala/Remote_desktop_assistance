# RemoteView - WebRTC Remote Desktop Application

A secure, peer-to-peer remote desktop application using WebRTC for real-time screen sharing and remote control over the public internet - no VPN required.

## Features

- **Screen Sharing**: Real-time screen capture and streaming via WebRTC
- **Remote Control**: Mouse and keyboard input from client to host
- **Session Codes**: 8-digit temporary codes for easy connection
- **NAT Traversal**: Works over public internet using STUN/TURN servers
- **P2P Communication**: Direct peer-to-peer connection - no screen data goes through server
- **Encrypted**: WebRTC provides DTLS/SRTP encryption

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Remote Desktop Flow                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐   │
│  │    HOST     │◄──────►│  SIGNALING  │◄──────►│   CLIENT    │   │
│  │  (Python)   │        │   SERVER    │        │  (Python/   │   │
│  │             │        │  (FastAPI)  │        │   Web)      │   │
│  │  - mss      │        │             │        │             │   │
│  │  - pyautogui│        │  - Sessions │        │  - Display  │   │
│  │  - aiortc   │        │  - WebSocket│        │  - Input    │   │
│  └──────┬──────┘        └─────────────┘        └──────┬──────┘   │
│         │                                               │            │
│         │  ════════════ WebRTC P2P ══════════════     │            │
│         │        (Screen Stream + Input Data)           │            │
│         │                                                   │            │
└─────────┴───────────────────────────────────────────────────┴────────┘

1. Host starts and creates a session (gets session code)
2. Host waits for viewer
3. Client connects using session code
4. Signaling server facilitates WebRTC handshake
5. P2P connection established for screen + input
```

## How It Works Over Public Internet

### Connection Flow
1. **Host** connects to signaling server and registers session
2. **Client** connects to signaling server with session code
3. **Signaling server** exchanges WebRTC offers/answers between peers
4. **STUN servers** help discover public IP addresses
5. **Direct P2P connection** established for screen/input data

### NAT Traversal
- **STUN**: Discovers public IP addresses (Google STUN included)
- **TURN**: Relay server fallback for symmetric NATs (configure your own)

## Installation

### Prerequisites
- Python 3.9 or higher
- pip (Python package manager)

### Install Dependencies

```bash
pip install -r requirements.txt
```

Or install individually:

```bash
pip install fastapi uvicorn websockets aiohttp
pip install aiortc av
pip install mss pyautogui Pillow numpy opencv-python
```

## Usage

### Step 1: Start the Signaling Server

The signaling server must be publicly accessible. For local testing:

```bash
python signaling_server/server.py
```

For public internet access, use ngrok:
```bash
ngrok http 8765
```
Then use the ngrok URL for host/client connections.

### Step 2: Start the Host (Screen Sharer)

On the computer you want to share:

```bash
python host/host.py
```

You'll see a session code like `1234-5678`. Share this with the viewer.

Options:
```bash
python host/host.py --host localhost --port 8765 --quality 75 --fps 20
```

### Step 3: Start the Client (Viewer)

On the computer that will view the remote screen:

```bash
python client/client.py 1234-5678
```

Use the session code from the host.

Options:
```bash
python client/client.py 1234-5678 --host localhost --port 8765
```

## Testing Over Public Internet

### Using ngrok (Recommended for Testing)

1. **Start signaling server locally**:
   ```bash
   python signaling_server/server.py
   ```

2. **Expose with ngrok**:
   ```bash
   ngrok http 8765
   ```
   Copy the `ws://` URL from ngrok (e.g., `ws://abc123.ngrok.io`)

3. **Start host with ngrok URL**:
   ```bash
   python host/host.py --host abc123.ngrok.io --port 443
   ```
   Note: ngrok uses port 443 for WebSocket

4. **Start client with ngrok URL**:
   ```bash
   python client/client.py 1234-5678 --host abc123.ngrok.io --port 443
   ```

## Project Structure

```
remote-desktop/
├── signaling_server/
│   ├── server.py           # FastAPI + WebSocket signaling server
│   ├── session_manager.py  # Session lifecycle management
│   └── static/
│       └── index.html      # Web-based client interface
├── host/
│   └── host.py             # Host application (screen sharing)
├── client/
│   └── client.py           # Client application (remote viewing)
├── shared/
│   ├── constants.py        # Shared configuration
│   ├── models.py           # Data models
│   └── __init__.py
├── requirements.txt
├── SPEC.md                 # Technical specification
└── README.md               # This file
```

## Security

- **Session Codes**: Cryptographically random 8-digit codes
- **Session Expiry**: Sessions expire after 1 hour
- **No Persistent Data**: All session data is in-memory
- **WebRTC Encryption**: DTLS/SRTP encryption for all P2P data
- **No Passwords**: Uses temporary codes instead

## Common Issues

### "Session not found"
- Session code is incorrect or expired
- Host hasn't created a session yet
- Signaling server URL is wrong

### "Connection failed"
- Firewall blocking WebSocket connections
- NAT traversal issues (try TURN server)
- Wrong host/port in command

### Black screen on client
- WebRTC connection established but no video track
- Check if screen capture is working on host
- Try reducing FPS or quality

### High latency
- Increase compression quality
- Reduce FPS
- Check network bandwidth
- Try closer STUN/TURN server

## Tech Stack

| Component | Technology |
|-----------|------------|
| Signaling | FastAPI + WebSocket |
| P2P Comm | WebRTC (aiortc) |
| Screen Capture | mss |
| Input Control | pyautogui |
| Image Processing | Pillow, OpenCV |
| Video Codec | FFmpeg (av) |

## License

MIT License - Educational/Purpose Only

## Disclaimer

This is a learning project. For production use, consider existing solutions like Chrome Remote Desktop, AnyDesk, or TeamViewer.
