"""
Signaling Server for Remote Desktop Application
FastAPI + WebSocket server for WebRTC signaling and session management

This server handles:
- Session creation/management (generates session codes)
- WebRTC signaling (offer/answer/ICE candidates exchange)
- Session lookup for clients

NO screen data flows through this server - it's purely for connection setup.
"""
import asyncio
import json
import sys
import os
from datetime import datetime
from typing import Dict
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.middleware.cors import CORSMiddleware

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.constants import (
    SIGNALING_PORT, MAX_SESSIONS, SESSION_EXPIRY_SECONDS,
    MSG_TYPE_CREATE_SESSION, MSG_TYPE_JOIN_SESSION, MSG_TYPE_OFFER,
    MSG_TYPE_ANSWER, MSG_TYPE_ICE_CANDIDATE, MSG_TYPE_SESSION_CREATED,
    MSG_TYPE_SESSION_JOINED, MSG_TYPE_SESSION_NOT_FOUND, MSG_TYPE_SESSION_FULL,
    MSG_TYPE_PEER_DISCONNECTED, MSG_TYPE_ERROR, MSG_TYPE_PING, MSG_TYPE_PONG,
    MSG_TYPE_HOST_REGISTERED, MSG_TYPE_CLIENT_REGISTERED, MSG_TYPE_INPUT_EVENT,
)
from signaling_server.session_manager import SessionManager
from shared.models import SessionState


# Initialize session manager
session_manager = SessionManager(
    max_sessions=MAX_SESSIONS,
    expiry_seconds=SESSION_EXPIRY_SECONDS
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown events."""
    print(f"[*] Signaling server starting on port {SIGNALING_PORT}")
    print("[*] Waiting for connections...")

    # Start cleanup task
    cleanup_task = asyncio.create_task(periodic_cleanup())

    yield

    # Cleanup
    cleanup_task.cancel()
    print("[*] Signaling server shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="RemoteView Signaling Server",
    description="Signaling server for Remote Desktop Application",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware for HTTP endpoints only
# Note: WebSocket uses its own origin handling via websocket.accept()
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def periodic_cleanup():
    """Periodically clean up expired sessions."""
    while True:
        await asyncio.sleep(60)  # Check every minute
        expired = session_manager.cleanup_expired_sessions()
        if expired > 0:
            print(f"[*] Cleaned up {expired} expired sessions")


@app.get("/")
async def root():
    """Serve the web interface."""
    return FileResponse(
        os.path.join(os.path.dirname(__file__), "static", "index.html")
    )


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "active_sessions": session_manager.get_active_session_count(),
        "timestamp": datetime.now().isoformat()
    }


@app.post("/create-session")
async def create_session():
    """
    Create a new session and return the session code.
    Called by host application.
    """
    session = session_manager.create_session()

    if session is None:
        raise HTTPException(status_code=503, detail="Maximum sessions reached")

    return {
        "code": session.code,
        "created_at": session.created_at.isoformat()
    }


@app.websocket("/ws/{session_code}")
async def websocket_endpoint(websocket: WebSocket, session_code: str):
    """
    WebSocket endpoint for signaling.
    """
    # Origin validation for SaaS-grade security
    origin = websocket.headers.get("origin")
    if allowed_origins and allowed_origins[0] != "*" and origin not in allowed_origins and origin is not None:
        await websocket.close(code=4003, reason="Origin not allowed")
        return

    # IMPORTANT: Accept WebSocket connection FIRST to avoid 403 errors
    # Then do validation
    try:
        await websocket.accept()
    except Exception as e:
        print(f"[!] Failed to accept WebSocket: {e}")
        return

    # Normalize session code (remove dashes if present)
    session_code = session_code.replace("-", "")

    # URL decode the session_code (e.g., host%3A1234-5678 -> host:1234-5678)
    import urllib.parse
    session_code = urllib.parse.unquote(session_code)

    # Determine if this is a host or client by checking session state
    is_host = session_code.startswith("host:")
    is_client = session_code.startswith("client:")

    # Extract actual session code
    if is_host:
        actual_code = session_code[5:]  # Remove "host:" prefix
        peer_type = "host"
    elif is_client:
        actual_code = session_code[7:]  # Remove "client:" prefix
        peer_type = "client"
    else:
        # For backward compatibility, determine based on session state
        actual_code = session_code
        peer_type = None

    # Re-format actual_code to XXXX-XXXX format (add dashes)
    if len(actual_code) == 8 and '-' not in actual_code:
        actual_code = f"{actual_code[:4]}-{actual_code[4:]}"

    print(f"[*] WebSocket connection attempt: type={peer_type or 'auto'}, code={actual_code}")

    # Verify session exists
    session = session_manager.get_session(actual_code)
    if not session:
        print(f"[!] Session not found: {actual_code}")
        await websocket.close(code=4004, reason="Session not found or expired")
        return

    # Handle connection based on peer type
    if peer_type == "host" or not session_manager.is_host_connected(actual_code):
        # This is the host
        if not session_manager.register_host(actual_code, websocket):
            await websocket.close(code=4003, reason="Failed to register host")
            return

        print(f"[+] Host connected to session {session.code}")
        await websocket.send_json({
            "type": MSG_TYPE_HOST_REGISTERED,
            "session_code": session.code,
            "message": "Registered as host"
        })

        # If client already waiting, notify them
        if session.client_ws:
            await session.client_ws.send_json({
                "type": "host_ready",
                "message": "Host is ready for connection"
            })

        # Update peer_type if it was None
        if peer_type is None:
            peer_type = "host"

    else:
        # This is the client
        if not session_manager.register_client(actual_code, websocket):
            await websocket.close(code=4003, reason="Session full or host not connected")
            return

        print(f"[+] Client connected to session {session.code}")
        await websocket.send_json({
            "type": MSG_TYPE_CLIENT_REGISTERED,
            "session_code": session.code,
            "message": "Registered as client"
        })

        # Notify host that client connected
        if session.host_ws:
            await session.host_ws.send_json({
                "type": "client_joined",
                "message": "Client joined the session"
            })

        if peer_type is None:
            peer_type = "client"

    # Main message loop
    try:
        while True:
            # Receive message
            data = await websocket.receive_text()
            message = json.loads(data)
            msg_type = message.get("type")

            if msg_type == MSG_TYPE_PING:
                await websocket.send_json({"type": MSG_TYPE_PONG})
                continue

            # Forward messages to peer based on sender type
            if msg_type in [MSG_TYPE_OFFER, MSG_TYPE_ANSWER, MSG_TYPE_ICE_CANDIDATE, MSG_TYPE_INPUT_EVENT]:
                forward_msg = message.copy()
                forward_msg["session_code"] = actual_code

                if peer_type == "host" and session.client_ws:
                    await session.client_ws.send_json(forward_msg)
                elif peer_type == "client" and session.host_ws:
                    await session.host_ws.send_json(forward_msg)

            elif msg_type == "close_session":
                # Clean session close
                print(f"[i] Session {session.code} closed by {peer_type}")
                break

    except WebSocketDisconnect:
        print(f"[-] {peer_type.capitalize() if peer_type else 'Peer'} disconnected from session {session.code}")
    except json.JSONDecodeError:
        print(f"[!] Invalid JSON received")
    except Exception as e:
        print(f"[!] WebSocket error: {e}")
    finally:
        # Cleanup on disconnect
        try:
            if peer_type == "host":
                # Host disconnected
                session_manager.register_host(actual_code, None)
                session_manager.set_session_state(actual_code, SessionState.DISCONNECTED)
                if session.client_ws:
                    await session.client_ws.send_json({
                        "type": MSG_TYPE_PEER_DISCONNECTED,
                        "message": "Host disconnected"
                    })
            elif peer_type == "client":
                # Client disconnected
                session_manager.register_client(actual_code, None)
                if session.host_ws:
                    await session.host_ws.send_json({
                        "type": MSG_TYPE_PEER_DISCONNECTED,
                        "message": "Client disconnected"
                    })
        except Exception as e:
            print(f"[!] Cleanup error: {e}")


if __name__ == "__main__":
    print("=" * 60)
    print("  RemoteView - Signaling Server")
    print("=" * 60)
    print(f"  WebSocket Endpoint: ws://0.0.0.0:{SIGNALING_PORT}/ws/{{session_code}}")
    print(f"  HTTP Endpoint: http://0.0.0.0:{SIGNALING_PORT}/")
    print("=" * 60)

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=SIGNALING_PORT,
        log_level="info",
        reload=False
    )
