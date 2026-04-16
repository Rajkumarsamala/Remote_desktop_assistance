"""
Host Application for Remote Desktop
Captures screen and streams to connected client via WebRTC

Usage:
    python host.py

The host will:
1. Connect to signaling server
2. Wait for client connection
3. Capture screen frames
4. Stream via WebRTC when connected
5. Receive and execute input events
"""
import asyncio
import json
import sys
import os
import time
import queue
import threading
from typing import Optional, Dict, Any
from fractions import Fraction
import argparse
from aiortc import RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, RTCConfiguration, RTCIceServer

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import signaling server components
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'signaling_server'))

from shared.constants import (
    SIGNALING_HOST, SIGNALING_PORT, SIGNALING_WS_URL,
    SCREEN_QUALITY, SCREEN_FPS, SCREEN_CHUNK_SIZE,
    MSG_TYPE_OFFER, MSG_TYPE_ANSWER, MSG_TYPE_ICE_CANDIDATE,
    MSG_TYPE_CREATE_SESSION, MSG_TYPE_SESSION_CREATED,
    MSG_TYPE_SESSION_NOT_FOUND, MSG_TYPE_SESSION_FULL,
    MSG_TYPE_PEER_DISCONNECTED, MSG_TYPE_HOST_REGISTERED,
    MSG_TYPE_CLIENT_REGISTERED, MSG_TYPE_PING, MSG_TYPE_PONG,
    MSG_TYPE_INPUT_EVENT,
)
from shared.models import InputEvent, SessionState


# WebRTC imports - use aiortc for Python
try:
    from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack, MediaStreamTrack
    from aiortc.contrib.media import MediaPlayer, MediaRecorder, MediaBlackhole
    import av
    AIORTC_AVAILABLE = True
except ImportError:
    AIORTC_AVAILABLE = False
    print("[!] aiortc not installed. Installing...")
    os.system("pip install aiortc av")

# Screen capture imports
try:
    import mss
    import pyautogui
    from pynput.keyboard import Controller, Key
    keyboard_controller = Controller()
    pyautogui.FAILSAFE = False  # Disable failsafe to allow corner access during remote control
    pyautogui.PAUSE = 0  # No pause between actions
except ImportError:
    print("[!] mss, pyautogui, or pynput not installed")
    sys.exit(1)

# Image processing
import numpy as np
from PIL import Image
import io


class ScreenCapture:
    """
    Captures screen frames using mss library.
    Provides frames in a format suitable for WebRTC streaming.
    """

    def __init__(self, quality: int = 75, fps: int = 20):
        """
        Initialize screen capture.

        Args:
            quality: JPEG compression quality (0-100)
            fps: Target frames per second
        """
        self.quality = quality
        self.fps = fps
        self.frame_interval = 1.0 / fps
        self.sct = mss.mss()
        self.monitor = self.sct.monitors[1]  # Primary monitor
        self.running = False
        self.frame_count = 0

    def get_frame(self) -> bytes:
        """
        Capture a single frame from the screen.

        Returns:
            JPEG compressed frame data
        """
        # Capture screen
        screenshot = self.sct.grab(self.monitor)

        # Convert to PIL Image
        img = Image.frombytes("RGB", screenshot.size, screenshot.bgra, "raw", "BGRX")

        # Compress to JPEG
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=self.quality)
        return buffer.getvalue()

    def get_frame_ndarray(self) -> np.ndarray:
        """
        Capture a single frame and return as numpy array.
        Used for WebRTC streaming.

        Returns:
            RGB numpy array (height, width, 3)
        """
        # Capture screen
        screenshot = self.sct.grab(self.monitor)

        # Convert to numpy array (BGRA -> RGB)
        img = Image.frombytes("RGB", screenshot.size, screenshot.bgra, "raw", "BGRX")
        return np.array(img)

    def get_frame_with_cursor(self) -> bytes:
        """
        Capture frame and embed cursor position.
        Returns JPEG compressed frame data.
        """
        # Get cursor position
        try:
            cursor_x, cursor_y = pyautogui.position()
        except:
            cursor_x, cursor_y = 0, 0

        # Capture screen
        screenshot = self.sct.grab(self.monitor)

        # Convert to PIL Image
        img = Image.frombytes("RGB", screenshot.size, screenshot.bgra, "raw", "BGRX")

        # Draw cursor position (optional - can be disabled for performance)
        # draw = ImageDraw.Draw(img)
        # draw.ellipse([(cursor_x-5, cursor_y-5), (cursor_x+5, cursor_y+5)], fill='red')

        # Compress to JPEG
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=self.quality)
        return buffer.getvalue()

    def get_screen_size(self) -> tuple:
        """Get screen dimensions."""
        return self.monitor["width"], self.monitor["height"]

    def start(self):
        """Start capture."""
        self.running = True

    def stop(self):
        """Stop capture."""
        self.running = False
        self.sct.close()


class InputHandler:
    """
    Handles input events received from client.
    Executes mouse and keyboard events on the host machine.
    """

    def __init__(self):
        self.last_x = 0
        self.last_y = 0

    def execute_event(self, event: InputEvent):
        """
        Execute an input event.

        Args:
            event: InputEvent object containing event details
        """
        try:
            if event.event_type == 'mouse_move':
                # Move mouse to absolute position
                pyautogui.moveTo(event.x, event.y, duration=0)
                self.last_x, self.last_y = event.x, event.y

            elif event.event_type == 'mouse_click':
                # Handle mouse click (down) at position to allow dragging
                if event.button == 'left':
                    pyautogui.mouseDown(event.x, event.y, button='left')
                elif event.button == 'right':
                    pyautogui.mouseDown(event.x, event.y, button='right')
                elif event.button == 'middle':
                    pyautogui.mouseDown(event.x, event.y, button='middle')

            elif event.event_type == 'mouse_release':
                # Handle mouse release to end drag or click
                if event.button == 'left':
                    pyautogui.mouseUp(button='left')
                elif event.button == 'right':
                    pyautogui.mouseUp(button='right')

            elif event.event_type in ('keydown', 'keyup', 'keyboard'):
                # Handle keyboard input accurately with pynput
                if event.key:
                    try:
                        key_str = str(event.key).lower()
                        if key_str == 'win':
                            key_str = 'cmd'
                        
                        # Handle special vs standard characters
                        if hasattr(Key, key_str):
                            k = getattr(Key, key_str)
                        else:
                            k = event.key
                            
                        if event.event_type == 'keyup':
                            keyboard_controller.release(k)
                        else:
                            keyboard_controller.press(k)
                    except Exception as exc:
                        print(f"[!] Key error: {exc}")

            elif event.event_type == 'scroll':
                # Handle scroll
                delta = event.delta_y if event.delta_y else 0
                pyautogui.scroll(int(delta / 120))  # Scroll clicks

        except Exception as e:
            print(f"[!] Input error: {e}")


class SystemAudioTrack(MediaStreamTrack):
    """
    Custom AudioStreamTrack that continuously sends system audio looping back.
    Used for WebRTC audio streaming.
    """
    kind = "audio"

    def __init__(self):
        super().__init__()
        import pyaudiowpatch as pyaudio
        import queue
        self.audio_queue = queue.Queue(maxsize=100)
        self.p_audio = pyaudio.PyAudio()
        
        try:
            wasapi_info = self.p_audio.get_host_api_info_by_type(pyaudio.paWASAPI)
            default_speakers = self.p_audio.get_device_info_by_index(wasapi_info["defaultOutputDevice"])
            
            loopback_device = None
            if not default_speakers["isLoopbackDevice"]:
                for loopback in self.p_audio.get_loopback_device_info_generator():
                    # Find loopback for default speaker
                    if default_speakers["name"] in loopback["name"]:
                        loopback_device = loopback
                        break
                if not loopback_device:
                    loopback_device = self.p_audio.get_default_wasapi_loopback()
            else:
                loopback_device = default_speakers
        except Exception as e:
            print(f"[*] Could not find WASAPI loopback, falling back to default input: {e}")
            loopback_device = self.p_audio.get_default_input_device_info()
            
        self.sample_rate = int(loopback_device["defaultSampleRate"])
        self.channels = loopback_device["maxInputChannels"]
        
        def callback(in_data, frame_count, time_info, status):
            if not self.audio_queue.full():
                self.audio_queue.put(in_data)
            return (None, pyaudio.paContinue)
            
        self.stream = self.p_audio.open(
            format=pyaudio.paInt16,
            channels=self.channels,
            rate=self.sample_rate,
            frames_per_buffer=int(self.sample_rate * 0.02), # 20ms chunks
            input=True,
            input_device_index=loopback_device["index"],
            stream_callback=callback
        )
        self.time_base = Fraction(1, self.sample_rate)
        self.pts = 0

    async def recv(self):
        """Receive next audio frame."""
        import av
        
        # Pull from queue without blocking asyncio loop
        try:
            in_data = await asyncio.get_event_loop().run_in_executor(None, self.audio_queue.get)
        except Exception:
            await asyncio.sleep(0.02)
            in_data = b'\x00' * (int(self.sample_rate * 0.02) * self.channels * 2)

        audio_array = np.frombuffer(in_data, dtype=np.int16)
        
        # Calculate samples per channel
        samples = len(audio_array) // self.channels
        if samples == 0:
            await asyncio.sleep(0.01)
            audio_array = np.zeros(int(self.sample_rate * 0.02) * self.channels, dtype=np.int16)
            samples = len(audio_array) // self.channels

        # Format layout for planar 's16p' expected by av
        audio_array = audio_array.reshape((samples, self.channels)).T.copy()
        layout = 'stereo' if self.channels == 2 else 'mono'
        
        frame = av.AudioFrame.from_ndarray(audio_array, format='s16p', layout=layout)
        frame.sample_rate = self.sample_rate
        frame.pts = self.pts
        self.pts += samples
        frame.time_base = self.time_base

        return frame

    def stop(self):
        super().stop()
        if hasattr(self, 'stream') and self.stream.is_active():
            self.stream.stop_stream()
            self.stream.close()
        if hasattr(self, 'p_audio'):
            self.p_audio.terminate()


class VideoFrameTrack(VideoStreamTrack):
    """
    Custom VideoStreamTrack that continuously sends screen frames.
    Used for WebRTC video streaming.
    """

    def __init__(self, screen_capture: ScreenCapture):
        """
        Initialize video track.

        Args:
            screen_capture: ScreenCapture instance
        """
        super().__init__()
        self.screen_capture = screen_capture
        self.frame_interval = 1.0 / screen_capture.fps
        self._start_time = None
        self._frame_count = 0

    async def recv(self):
        """
        Receive next video frame.
        Called by aiortc when frame is needed.

        Returns:
            VideoFrame: The next screen frame
        """
        if self._start_time is None:
            self._start_time = time.time()

        # Wait for frame interval
        await asyncio.sleep(self.frame_interval)

        # Capture frame as numpy array
        frame_array = self.screen_capture.get_frame_ndarray()

        # Create VideoFrame from numpy array
        video_frame = av.VideoFrame.from_ndarray(frame_array, format="rgb24")
        video_frame.pts = int(time.time() * 1000000)  # Microseconds
        video_frame.time_base = Fraction(1, 1000000)

        self._frame_count += 1
        return video_frame


def ice_candidate_to_json(candidate) -> dict:
    """Serialize RTCIceCandidate to JSON-compatible dict."""
    from aiortc.sdp import candidate_to_sdp
    return {
        'candidate': f"candidate:{candidate_to_sdp(candidate)}",
        'sdpMid': candidate.sdpMid,
        'sdpMLineIndex': candidate.sdpMLineIndex,
    }


def ice_candidate_from_json(data: dict) -> RTCIceCandidate:
    """Create RTCIceCandidate from JSON dict.

    Handles two formats:
    1. Browser format: {'candidate': 'candidate:1 1 UDP ...', 'sdpMid': '0', 'sdpMLineIndex': 0}
    2. Structured format: {'component': 1, 'foundation': '...', 'ip': '...', etc.}
    """
    # Check if this is a browser-format candidate (string in 'candidate' field)
    if 'candidate' in data and isinstance(data['candidate'], str):
        # Parse browser candidate string: "candidate:1 1 UDP 2128615934 192.168.1.100 56521 typ host"
        candidate_str = data['candidate']
        if candidate_str.startswith('candidate:'):
            candidate_str = candidate_str[10:]  # Remove 'candidate:' prefix

        parts = candidate_str.split()
        # Format: <foundation> <component> <protocol> <priority> <ip> <port> typ <type> [raddr <raddr> rport <rport>]
        foundation = parts[0]
        component = int(parts[1])
        protocol = parts[2].lower()
        priority = int(parts[3])
        ip = parts[4]
        port = int(parts[5])

        # Find 'typ' and get the type
        typ_idx = parts.index('typ')
        cand_type = parts[typ_idx + 1]

        # Parse optional related address/port
        relatedAddress = None
        relatedPort = None
        if 'raddr' in parts:
            raddr_idx = parts.index('raddr')
            relatedAddress = parts[raddr_idx + 1]
            relatedPort = int(parts[raddr_idx + 3])  # Skip 'rport'

        return RTCIceCandidate(
            component=component,
            foundation=foundation,
            ip=ip,
            port=port,
            priority=priority,
            protocol=protocol,
            type=cand_type,
            sdpMid=data.get('sdpMid'),
            sdpMLineIndex=data.get('sdpMLineIndex'),
            relatedAddress=relatedAddress,
            relatedPort=relatedPort,
        )
    else:
        # Structured format (already parsed)
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


class HostApplication:
    """
    Main host application class.
    Manages WebRTC connection and coordinates screen capture + input handling.
    """

    def __init__(
        self,
        signaling_host: str = SIGNALING_HOST,
        signaling_port: int = SIGNALING_PORT,
        quality: int = SCREEN_QUALITY,
        fps: int = SCREEN_FPS,
    ):
        """
        Initialize host application.

        Args:
            signaling_host: Signaling server host
            signaling_port: Signaling server port
            quality: Screen capture JPEG quality
            fps: Target frames per second
        """
        self.signaling_host = signaling_host
        self.signaling_port = signaling_port
        self.signaling_url = f"ws://{signaling_host}:{signaling_port}"

        # Components
        self.screen_capture = ScreenCapture(quality=quality, fps=fps)
        self.input_handler = InputHandler()

        # WebRTC
        self.peer_connection: Optional[RTCPeerConnection] = None
        self.data_channel = None
        self.video_track = None
        self.audio_track = None

        # State
        self.session_code: Optional[str] = None
        self.websocket = None
        self.running = False
        self.client_connected = False

        # ICE candidate queue (for race condition when candidates arrive before remoteDescription)
        self.ice_candidate_queue = []
        self._remote_description_set = False

        # Stats
        self.bytes_sent = 0
        self.frames_sent = 0
        self.start_time = None

    async def create_session(self) -> Optional[str]:
        """
        Create a new session via HTTP request to signaling server.

        Returns:
            Session code if successful, None otherwise
        """
        try:
            import aiohttp
            async with aiohttp.ClientSession() as session:
                protocol = "https" if self.signaling_port == 443 else "http"
                port_str = "" if self.signaling_port in [80, 443] else f":{self.signaling_port}"
                async with session.post(
                    f"{protocol}://{self.signaling_host}{port_str}/create-session"
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get("code")
                    else:
                        print(f"[!] Failed to create session: {response.status}")
                        return None
        except Exception as e:
            print(f"[!] Error creating session: {e}")
            return None

    async def connect_signaling(self, session_code: str) -> bool:
        """
        Connect to signaling server WebSocket.

        Args:
            session_code: Session code for this host

        Returns:
            True if connected successfully
        """
        import aiohttp
        import websockets

        try:
            # Use wss:// for port 443 (production), ws:// for others
            protocol = "wss" if self.signaling_port == 443 else "ws"
            port_str = "" if self.signaling_port in [80, 443] else f":{self.signaling_port}"
            ws_url = f"{protocol}://{self.signaling_host}{port_str}/ws/host:{session_code}"
            print(f"[*] Connecting to signaling server: {ws_url}")

            self.websocket = await websockets.connect(ws_url, ping_interval=30, ping_timeout=10)

            # Wait for registration confirmation
            msg = await self.websocket.recv()
            data = json.loads(msg)

            if data.get("type") == MSG_TYPE_HOST_REGISTERED:
                print(f"[+] Registered as host for session {session_code}")
                return True
            else:
                print(f"[!] Unexpected message: {data}")
                return False

        except Exception as e:
            print(f"[!] Signaling connection error: {e}")
            return False

    async def setup_webrtc(self):
        """
        Set up WebRTC peer connection for screen streaming.
        """
        # Reset ICE queue and remote description state
        self.ice_candidate_queue = []
        self._remote_description_set = False

        # Create peer connection with STUN + TURN servers
        config = RTCConfiguration(iceServers=[
            RTCIceServer(urls="stun:stun.l.google.com:19302"),
            RTCIceServer(urls="stun:stun1.l.google.com:19302"),
            RTCIceServer(urls="stun:stun2.l.google.com:19302"),
            # Free TURN relay for symmetric NATs
            RTCIceServer(urls="turn:openrelay.projectenica.org:443", username="openrelay", credential="openrelay"),
        ])
        self.peer_connection = RTCPeerConnection(configuration=config)

        # Create data channel for input events
        self.data_channel = self.peer_connection.createDataChannel("input")
        self.data_channel.on("message", lambda data: asyncio.create_task(self._handle_input_message(data)))
        @self.data_channel.on("open")
        def on_data_channel_open():
            print("[+] Data channel opened")
            # Inform viewer this is a full-screen desktop host
            mode_msg = json.dumps({"event_type": "mode_info", "mode": "monitor"})
            self.data_channel.send(mode_msg)

        # Create video track
        self.video_track = VideoFrameTrack(self.screen_capture)
        self.peer_connection.addTrack(self.video_track)

        # Create audio track
        self.audio_track = SystemAudioTrack()
        self.peer_connection.addTrack(self.audio_track)

        # Set up ICE candidates handler
        @self.peer_connection.on("icecandidate")
        async def on_ice_candidate(candidate):
            if candidate and self.websocket:
                await self.websocket.send(json.dumps({
                    "type": MSG_TYPE_ICE_CANDIDATE,
                    "candidate": ice_candidate_to_json(candidate)
                }))

        # Set up ICE connection state to detect when remote description is set
        @self.peer_connection.on("iceconnectionstatechange")
        def on_ice_connection_state_change():
            print(f"[*] ICE connection state: {self.peer_connection.iceConnectionState}")

        # Set up connection state handler
        @self.peer_connection.on("connectionstatechange")
        def on_connection_state_change():
            state = self.peer_connection.connection_state
            print(f"[*] Connection state: {state}")

            if state == "connected":
                self.client_connected = True
                self.start_time = time.time()
                print("[+] Client connected!")
            elif state in ["disconnected", "failed", "closed"]:
                self.client_connected = False
                print("[-] Client disconnected")

    async def _handle_input_message(self, data):
        """
        Handle input event received from client via data channel.

        Args:
            data: JSON string with input event details
        """
        try:
            print(f"[DC] Received input event: {data}")
            event = InputEvent.from_json(data)
            self.input_handler.execute_event(event)
        except Exception as e:
            print(f"[!] Input error: {e}")

    async def _flush_ice_candidates(self):
        """Apply queued ICE candidates after remoteDescription is set."""
        while self.ice_candidate_queue:
            candidate_data = self.ice_candidate_queue.pop(0)
            try:
                candidate = ice_candidate_from_json(candidate_data)
                await self.peer_connection.addIceCandidate(candidate)
                print(f"[*] Added queued ICE candidate")
            except Exception as e:
                print(f"[!] Failed to add queued ICE candidate: {e}")

    async def handle_signaling_message(self, msg: Dict[str, Any]):
        """
        Handle signaling message from server.

        Args:
            msg: Parsed message dictionary
        """
        msg_type = msg.get("type")

        if msg_type == "client_joined":
            print("[*] Client connected, creating offer...")
            offer = await self.peer_connection.createOffer()
            await self.peer_connection.setLocalDescription(offer)
            await self.websocket.send(json.dumps({
                "type": MSG_TYPE_OFFER,
                "sdp": self.peer_connection.localDescription.sdp
            }))
            print("[*] Offer sent")

        elif msg_type == MSG_TYPE_ANSWER:
            sdp = msg.get("sdp")
            print("[*] Received answer")
            await self.peer_connection.setRemoteDescription(
                RTCSessionDescription(sdp=sdp, type="answer")
            )
            self._remote_description_set = True
            await self._flush_ice_candidates()

        elif msg_type == MSG_TYPE_ICE_CANDIDATE:
            # Add ICE candidate - queue if remoteDescription not set yet
            candidate_data = msg.get("candidate")
            if candidate_data:
                if self._remote_description_set:
                    candidate = ice_candidate_from_json(candidate_data)
                    await self.peer_connection.addIceCandidate(candidate)
                else:
                    print("[*] Queuing ICE candidate (remoteDescription not set)")
                    self.ice_candidate_queue.append(candidate_data)

        elif msg_type == MSG_TYPE_PEER_DISCONNECTED:
            print("[*] Client disconnected")
            self.client_connected = False

    async def signaling_loop(self):
        """
        Main signaling loop - handles messages from signaling server.
        """
        try:
            while self.running and self.websocket:
                msg = await self.websocket.recv()
                data = json.loads(msg)
                await self.handle_signaling_message(data)
        except websockets.exceptions.ConnectionClosed:
            print("[*] Signaling connection closed")
        except Exception as e:
            print(f"[!] Signaling error: {e}")

    async def run(self):
        """
        Main run loop for the host application.
        """
        print("=" * 60)
        print("  RemoteView Host - Screen Sharing")
        print("=" * 60)

        # Step 1: Create session
        print("[*] Creating session...")
        self.session_code = await self.create_session()

        if not self.session_code:
            print("[!] Failed to create session")
            return

        print(f"[+] Session created: {self.session_code}")
        print(f"[*] Share this code with the viewer")

        # Step 2: Connect to signaling
        print("[*] Connecting to signaling server...")
        if not await self.connect_signaling(self.session_code):
            print("[!] Failed to connect to signaling server")
            return

        # Step 3: Set up WebRTC
        print("[*] Setting up WebRTC connection...")
        await self.setup_webrtc()

        # Step 4: Start screen capture
        self.screen_capture.start()
        print(f"[*] Screen capture started ({self.screen_capture.fps} FPS)")

        # Step 5: Run main loop
        self.running = True
        print("[*] Host is running. Press Ctrl+C to stop.")
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
            if self.client_connected and self.start_time:
                elapsed = time.time() - self.start_time
                print(f"[*] Stats: {self.frames_sent} frames, "
                      f"{self.bytes_sent / 1024 / 1024:.1f} MB sent, "
                      f"{self.frames_sent / elapsed:.1f} FPS")

    async def shutdown(self):
        """Clean shutdown."""
        print("[*] Closing connections...")
        self.running = False

        if self.peer_connection:
            await self.peer_connection.close()

        if self.websocket:
            await self.websocket.close()

        self.screen_capture.stop()
        print("[*] Host stopped")


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="RemoteView Host - Screen Sharing")
    parser.add_argument("--host", default=SIGNALING_HOST, help="Signaling server host")
    parser.add_argument("--port", type=int, default=SIGNALING_PORT, help="Signaling server port")
    parser.add_argument("--quality", type=int, default=SCREEN_QUALITY, help="JPEG quality (0-100)")
    parser.add_argument("--fps", type=int, default=SCREEN_FPS, help="Frames per second")

    args = parser.parse_args()

    host_app = HostApplication(
        signaling_host=args.host,
        signaling_port=args.port,
        quality=args.quality,
        fps=args.fps,
    )

    await host_app.run()


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
        import mss
    except ImportError:
        print("[!] Installing mss...")
        os.system("pip install mss")
        import mss

    try:
        import pyautogui
    except ImportError:
        print("[!] Installing pyautogui...")
        os.system("pip install pyautogui")
        import pyautogui

    try:
        import pyaudiowpatch
    except ImportError:
        print("[!] Installing pyaudiowpatch...")
        os.system("pip install pyaudiowpatch")
        import pyaudiowpatch

    asyncio.run(main())
