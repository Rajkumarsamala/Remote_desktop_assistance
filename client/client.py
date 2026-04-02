"""
Client Application for Remote Desktop
Connects to host and displays remote screen, sends input events

Usage:
    python client.py <session_code>

The client will:
1. Connect to signaling server with session code
2. Receive WebRTC offer from host
3. Establish P2P connection
4. Display incoming screen stream
5. Capture and send local input events to host
"""
import asyncio
import json
import sys
import os
import time
import argparse
from typing import Optional

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.constants import (
    SIGNALING_HOST, SIGNALING_PORT,
    SCREEN_CHUNK_SIZE,
    MSG_TYPE_OFFER, MSG_TYPE_ANSWER, MSG_TYPE_ICE_CANDIDATE,
    MSG_TYPE_SESSION_NOT_FOUND, MSG_TYPE_SESSION_FULL,
    MSG_TYPE_PEER_DISCONNECTED, MSG_TYPE_HOST_REGISTERED,
    MSG_TYPE_CLIENT_REGISTERED, MSG_TYPE_PING, MSG_TYPE_PONG,
)
from shared.models import InputEvent


# WebRTC imports
try:
    from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack
    from aiortc.contrib.media import MediaPlayer, MediaRecorder
    import av
    AIORTC_AVAILABLE = True
except ImportError:
    AIORTC_AVAILABLE = False
    print("[!] aiortc not installed. Run: pip install aiortc av")

# Screen display imports
try:
    import cv2
    import numpy as np
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    print("[!] OpenCV not installed. Run: pip install opencv-python")
    # Fallback to PIL if OpenCV not available
    from PIL import Image
    import io


# Input capture imports
try:
    import pyautogui
except ImportError:
    print("[!] pyautogui not installed. Run: pip install pyautogui")
    sys.exit(1)

import threading
from datetime import datetime


def ice_candidate_to_json(candidate) -> dict:
    """Serialize RTCIceCandidate to JSON-compatible dict."""
    return {
        'component': candidate.component,
        'foundation': candidate.foundation,
        'ip': candidate.ip,
        'port': candidate.port,
        'priority': candidate.priority,
        'protocol': candidate.protocol,
        'type': candidate.type,
        'sdpMid': candidate.sdpMid,
        'sdpMLineIndex': candidate.sdpMLineIndex,
        'relatedAddress': candidate.relatedAddress,
        'relatedPort': candidate.relatedPort,
    }


def ice_candidate_from_json(data: dict) -> 'RTCIceCandidate':
    """Create RTCIceCandidate from JSON dict."""
    from aiortc import RTCIceCandidate
    return RTCIceCandidate(
        component=data['component'],
        foundation=data['foundation'],
        ip=data['ip'],
        port=data['port'],
        priority=data['priority'],
        protocol=data['protocol'],
        type=data['type'],
        sdpMid=data.get('sdpMid'),
        sdpMLineIndex=data.get('sdpMLineIndex'),
        relatedAddress=data.get('relatedAddress'),
        relatedPort=data.get('relatedPort'),
    )


class InputCapture:
    """
    Captures local input events (mouse/keyboard) and converts them
    to InputEvent objects for transmission to host.
    """

    def __init__(self, callback):
        """
        Initialize input capture.

        Args:
            callback: Function to call with InputEvent objects
        """
        self.callback = callback
        self.running = False
        self.thread = None

        # Disable pyautogui failsafe for remote control
        pyautogui.FAILSAFE = False
        pyautogui.PAUSE = 0

    def start(self):
        """Start capturing input events."""
        self.running = True

        # Start mouse listener thread
        self.mouse_thread = threading.Thread(target=self._mouse_loop, daemon=True)
        self.mouse_thread.start()

        # Start keyboard listener thread
        self.keyboard_thread = threading.Thread(target=self._keyboard_loop, daemon=True)
        self.keyboard_thread.start()

        print("[*] Input capture started")

    def stop(self):
        """Stop capturing input events."""
        self.running = False

    def _mouse_loop(self):
        """Mouse event capture loop using pyautogui."""
        last_x, last_y = pyautogui.position()

        while self.running:
            try:
                x, y = pyautogui.position()

                # Only send if position changed
                if x != last_x or y != last_y:
                    event = InputEvent(
                        event_type='mouse_move',
                        x=x,
                        y=y,
                        timestamp=time.time()
                    )
                    self.callback(event)
                    last_x, last_y = x, y

                time.sleep(0.01)  # 100Hz polling

            except Exception as e:
                pass

    def _keyboard_loop(self):
        """Keyboard event capture loop."""
        # Note: pyautogui doesn't provide keyboard event callbacks
        # We'll use keyboard library for better support if needed
        pass

    def send_click(self, button: str, x: int, y: int):
        """Send a click event."""
        event = InputEvent(
            event_type='mouse_click',
            button=button,
            x=x,
            y=y,
            timestamp=time.time()
        )
        self.callback(event)

    def send_key(self, key: str):
        """Send a keyboard event."""
        event = InputEvent(
            event_type='keyboard',
            key=key,
            timestamp=time.time()
        )
        self.callback(event)


class RemoteScreenDisplay:
    """
    Displays incoming screen frames.
    Uses OpenCV or PIL for rendering.
    """

    def __init__(self):
        self.window_name = "RemoteView - Remote Desktop"
        self.running = False

        if CV2_AVAILABLE:
            cv2.namedWindow(self.window_name, cv2.WINDOW_NORMAL)
            cv2.setWindowProperty(
                self.window_name,
                cv2.WND_PROP_FULLSCREEN,
                cv2.WINDOW_FULLSCREEN
            )
        else:
            # PIL display mode
            pass

    def show_frame(self, frame_data: bytes):
        """
        Display a frame.

        Args:
            frame_data: JPEG compressed frame data
        """
        if CV2_AVAILABLE:
            # Decode with OpenCV
            nparr = np.frombuffer(frame_data, dtype=np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if frame is not None:
                cv2.imshow(self.window_name, frame)
                cv2.waitKey(1)
        else:
            # PIL fallback
            img = Image.open(io.BytesIO(frame_data))
            img.show()

    def close(self):
        """Close the display window."""
        if CV2_AVAILABLE:
            cv2.destroyWindow(self.window_name)


class VideoFrameReceiver(VideoStreamTrack):
    """
    Custom VideoStreamTrack that receives video frames.
    Used for WebRTC video streaming from host.
    """

    def __init__(self, renderer: RemoteScreenDisplay):
        """
        Initialize video receiver.

        Args:
            renderer: RemoteScreenDisplay instance for rendering
        """
        super().__init__()
        self.renderer = renderer

    async def recv(self):
        """
        Receive and display next video frame.

        Returns:
            VideoFrame: The next screen frame
        """
        # This is handled by aiortc internally
        pass


class ClientApplication:
    """
    Main client application class.
    Manages WebRTC connection to host and displays remote screen.
    """

    def __init__(
        self,
        session_code: str,
        signaling_host: str = SIGNALING_HOST,
        signaling_port: int = SIGNALING_PORT,
    ):
        """
        Initialize client application.

        Args:
            session_code: Session code to connect to (format: XXXX-XXXX)
            signaling_host: Signaling server host
            signaling_port: Signaling server port
        """
        self.session_code = session_code.replace("-", "")  # Remove dashes
        self.signaling_host = signaling_host
        self.signaling_port = signaling_port

        # Components
        self.display = RemoteScreenDisplay()
        self.input_capture: Optional[InputCapture] = None

        # WebRTC
        self.peer_connection: Optional[RTCPeerConnection] = None
        self.data_channel = None
        self.remote_video_track = None

        # State
        self.websocket = None
        self.running = False
        self.host_connected = False

        # Stats
        self.bytes_received = 0
        self.frames_received = 0
        self.start_time = None
        self.last_frame_time = None

    async def connect_signaling(self) -> bool:
        """
        Connect to signaling server WebSocket.

        Returns:
            True if connected successfully
        """
        import websockets

        try:
            ws_url = f"ws://{self.signaling_host}:{self.signaling_port}/ws/client:{self.session_code}"
            print(f"[*] Connecting to signaling server: {ws_url}")

            self.websocket = await websockets.connect(ws_url)

            # Wait for registration confirmation
            msg = await self.websocket.recv()
            data = json.loads(msg)

            if data.get("type") == MSG_TYPE_CLIENT_REGISTERED:
                print(f"[+] Registered as client for session {self.session_code}")
                print("[*] Waiting for host to establish connection...")
                return True
            else:
                print(f"[!] Unexpected message: {data}")
                return False

        except websockets.exceptions.InvalidStatusCode as e:
            if e.status_code == 4004:
                print("[!] Session not found or expired")
            elif e.status_code == 4003:
                print("[!] Session full or host not available")
            else:
                print(f"[!] Connection error: {e}")
            return False
        except Exception as e:
            print(f"[!] Signaling connection error: {e}")
            return False

    async def setup_webrtc(self):
        """
        Set up WebRTC peer connection for receiving screen stream.
        """
        # Create peer connection
        config = {
            "iceServers": [
                {"urls": "stun:stun.l.google.com:19302"},
                {"urls": "stun:stun1.l.google.com:19302"},
                {"urls": "stun:stun2.l.google.com:19302"},
            ]
        }
        self.peer_connection = RTCPeerConnection()

        # Create data channel for input events (host will open this)
        # Actually, host creates the data channel, client receives

        # Set up ICE candidates handler
        @self.peer_connection.on("icecandidate")
        async def on_ice_candidate(candidate):
            if candidate and self.websocket:
                await self.websocket.send(json.dumps({
                    "type": MSG_TYPE_ICE_CANDIDATE,
                    "candidate": ice_candidate_to_json(candidate)
                }))

        # Set up track handler for incoming video
        @self.peer_connection.on("track")
        def on_track(track):
            print(f"[*] Received track: {track.kind}")
            self.remote_video_track = track

            if track.kind == "video":
                # Handle incoming video frames
                asyncio.create_task(self._handle_video_track(track))

        # Set up data channel handler (opened by host)
        @self.peer_connection.on("datachannel")
        def on_datachannel(channel):
            print(f"[*] Data channel received: {channel.label}")
            self.data_channel = channel
            self.data_channel.on("message", self._handle_input_message)
            self.data_channel.on("open", lambda: print("[+] Data channel opened"))

        # Set up connection state handler
        @self.peer_connection.on("connectionstatechange")
        def on_connection_state_change():
            state = self.peer_connection.connection_state
            print(f"[*] Connection state: {state}")

            if state == "connected":
                self.host_connected = True
                self.start_time = time.time()
                print("[+] Connected to host!")
            elif state in ["disconnected", "failed", "closed"]:
                self.host_connected = False
                print("[-] Disconnected from host")

    async def _handle_video_track(self, track):
        """
        Handle incoming video track frames.

        Args:
            track: aiortc MediaStreamTrack
        """
        import av

        while self.running:
            try:
                # Get frame from track
                frame = await asyncio.wait_for(track.recv(), timeout=5.0)

                # Convert frame to display format
                if CV2_AVAILABLE:
                    img = frame.to_ndarray()
                    # Convert RGB to BGR for OpenCV
                    img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
                    cv2.imshow(self.display.window_name, img)
                    cv2.waitKey(1)
                else:
                    # PIL fallback - convert frame to PIL Image
                    pass

                self.frames_received += 1
                self.last_frame_time = time.time()

            except asyncio.TimeoutError:
                continue
            except Exception as e:
                print(f"[!] Video track error: {e}")
                break

    def _handle_input_message(self, data):
        """
        Handle message from host via data channel.
        (Client typically doesn't receive input events, this is for control messages)

        Args:
            data: Raw message data
        """
        print(f"[DC] Received: {data}")

    def send_input_event(self, event: InputEvent):
        """
        Send an input event to the host.

        Args:
            event: InputEvent to send
        """
        if self.data_channel and self.data_channel.readyState == "open":
            self.data_channel.send(event.to_json())

    async def signaling_loop(self):
        """
        Main signaling loop - handles messages from signaling server.
        """
        import websockets

        try:
            while self.running and self.websocket:
                msg = await asyncio.wait_for(self.websocket.recv(), timeout=1.0)
                data = json.loads(msg)
                await self.handle_signaling_message(data)
        except asyncio.TimeoutError:
            pass  # Normal timeout, continue loop
        except websockets.exceptions.ConnectionClosed:
            print("[*] Signaling connection closed")
        except Exception as e:
            if self.running:
                print(f"[!] Signaling error: {e}")

    async def handle_signaling_message(self, msg: dict):
        """
        Handle signaling message from server.

        Args:
            msg: Parsed message dictionary
        """
        msg_type = msg.get("type")

        if msg_type == MSG_TYPE_HOST_REGISTERED:
            # Host registered, client should wait for offer
            print("[*] Host registered, waiting for connection...")

        elif msg_type == "host_ready":
            # Host is ready, we wait for incoming offer
            print("[*] Host is ready, waiting for connection...")

        elif msg_type == "client_joined":
            # Our join was acknowledged
            print("[+] Successfully joined session")

        elif msg_type == MSG_TYPE_OFFER:
            # Host sent offer, we respond with answer
            sdp = msg.get("sdp")
            print("[*] Received offer, creating answer...")

            await self.peer_connection.setRemoteDescription(
                RTCSessionDescription(sdp=sdp, type="offer")
            )

            answer = await self.peer_connection.createAnswer()
            await self.peer_connection.setLocalDescription(answer)

            # Send answer
            await self.websocket.send(json.dumps({
                "type": MSG_TYPE_ANSWER,
                "sdp": self.peer_connection.localDescription.sdp
            }))
            print("[*] Answer sent")

        elif msg_type == MSG_TYPE_ICE_CANDIDATE:
            # Add ICE candidate
            candidate_data = msg.get("candidate")
            if candidate_data:
                candidate = ice_candidate_from_json(candidate_data)
                await self.peer_connection.addIceCandidate(candidate)

        elif msg_type == MSG_TYPE_PEER_DISCONNECTED:
            print("[*] Host disconnected")
            self.host_connected = False

    async def run(self):
        """
        Main run loop for the client application.
        """
        print("=" * 60)
        print("  RemoteView Client - Remote Desktop Viewer")
        print("=" * 60)
        print(f"[*] Session code: {self.session_code}")

        # Step 1: Connect to signaling
        print("[*] Connecting to signaling server...")
        if not await self.connect_signaling():
            print("[!] Failed to connect to signaling server")
            return

        # Step 2: Set up WebRTC
        print("[*] Setting up WebRTC connection...")
        await self.setup_webrtc()

        # Step 3: Set up input capture
        self.input_capture = InputCapture(callback=self.send_input_event)
        self.input_capture.start()
        print("[*] Input capture started")

        # Step 4: Run main loop
        self.running = True
        print("[*] Connected! Viewing remote desktop.")
        print("[*] Press Ctrl+C to disconnect.")
        print("=" * 60)

        try:
            # Run signaling and stats in parallel
            stats_task = asyncio.create_task(self.stats_loop())
            signaling_task = asyncio.create_task(self.signaling_loop())

            await asyncio.gather(signaling_task, stats_task)

        except KeyboardInterrupt:
            print("\n[*] Shutting down...")
        finally:
            await self.shutdown()

    async def stats_loop(self):
        """Print periodic connection stats."""
        while self.running:
            await asyncio.sleep(5)
            if self.host_connected and self.start_time:
                elapsed = time.time() - self.start_time
                fps = self.frames_received / elapsed if elapsed > 0 else 0
                print(f"[*] Stats: {self.frames_received} frames received, "
                      f"{self.bytes_received / 1024 / 1024:.1f} MB, "
                      f"{fps:.1f} FPS")

    async def shutdown(self):
        """Clean shutdown."""
        print("[*] Closing connections...")
        self.running = False

        if self.input_capture:
            self.input_capture.stop()

        if self.peer_connection:
            await self.peer_connection.close()

        if self.websocket:
            await self.websocket.close()

        self.display.close()
        print("[*] Client stopped")


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="RemoteView Client - Remote Desktop Viewer")
    parser.add_argument("session_code", help="Session code to connect to (XXXX-XXXX)")
    parser.add_argument("--host", default=SIGNALING_HOST, help="Signaling server host")
    parser.add_argument("--port", type=int, default=SIGNALING_PORT, help="Signaling server port")

    args = parser.parse_args()

    if not args.session_code:
        print("[!] Session code required")
        parser.print_help()
        return

    client = ClientApplication(
        session_code=args.session_code,
        signaling_host=args.host,
        signaling_port=args.port,
    )

    await client.run()


if __name__ == "__main__":
    # Check dependencies
    if not AIORTC_AVAILABLE:
        print("[!] Please install aiortc: pip install aiortc av")
        sys.exit(1)

    try:
        import websockets
    except ImportError:
        print("[!] Installing websockets...")
        os.system("pip install websockets")
        import websockets

    try:
        import aiohttp
    except ImportError:
        print("[!] Installing aiohttp...")
        os.system("pip install aiohttp")
        import aiohttp

    try:
        import pyautogui
    except ImportError:
        print("[!] Installing pyautogui...")
        os.system("pip install pyautogui")
        import pyautogui

    try:
        import cv2
    except ImportError:
        print("[!] OpenCV not available, using PIL fallback")
        CV2_AVAILABLE = False
        from PIL import Image
        import io

    asyncio.run(main())
