import logging
import shlex
import socket
import threading
import time
from dataclasses import dataclass
from typing import Any

import cv2
import numpy as np
from cryptography.fernet import Fernet, InvalidToken

from shared import EncryptedChannel
from shared import HANDSHAKE_BUSY
from shared import HANDSHAKE_DENIED
from shared import HANDSHAKE_NOT_PRIVATE
from shared import HANDSHAKE_OK
from shared import SOCKET_TIMEOUT_SECONDS
from shared import configure_logging
from shared import describe_trusted_ipv4_networks
from shared import is_trusted_remote_ip
from shared import load_client_config
from shared import recv_handshake
from shared import tune_socket


def print_help() -> None:
    print("Commands:")
    print("move <x> <y>")
    print("click")
    print("rightclick")
    print("type <text>")
    print("disconnect")
    print("help")


def parse_user_command(text: str) -> dict[str, Any] | None:
    try:
        parts = shlex.split(text)
    except ValueError as exc:
        print(f"Invalid command syntax: {exc}")
        return None

    if not parts:
        return None

    command = parts[0].lower()

    if command == "move":
        if len(parts) != 3:
            print("Usage: move <x> <y>")
            return None
        try:
            x = int(parts[1])
            y = int(parts[2])
        except ValueError:
            print("move requires integer coordinates")
            return None
        return {"command": "MOVE", "args": {"x": x, "y": y}}

    if command == "click":
        return {"command": "CLICK", "args": {}}

    if command == "rightclick":
        return {
            "command": "MOUSE_BUTTON",
            "args": {"button": "right", "action": "down"},
            "post_send": {"command": "MOUSE_BUTTON", "args": {"button": "right", "action": "up"}},
        }

    if command == "type":
        if len(parts) < 2:
            print("Usage: type <text>")
            return None
        return {"command": "TYPE", "args": {"text": " ".join(parts[1:])}}

    if command in {"disconnect", "exit"}:
        return {"command": "DISCONNECT", "args": {}}

    if command == "help":
        print_help()
        return None

    print_help()
    return None


@dataclass
class DisplayGeometry:
    width: int = 1
    height: int = 1


class MouseEventStreamer:
    def __init__(
        self,
        channel: EncryptedChannel,
        stop_event: threading.Event,
        remote_width: int,
        remote_height: int,
        max_rate_hz: int = 60,
    ):
        self.channel = channel
        self.stop_event = stop_event
        self.remote_width = remote_width
        self.remote_height = remote_height
        self.interval = 1 / max_rate_hz
        self.display = DisplayGeometry()
        self.state_lock = threading.Lock()
        self.pending_move: tuple[int, int] | None = None
        self.last_sent_move: tuple[int, int] | None = None
        self.last_local_move_at = 0.0
        self.last_send_at = 0.0

    def update_display_size(self, width: int, height: int) -> None:
        with self.state_lock:
            self.display.width = max(1, width)
            self.display.height = max(1, height)

    def start(self) -> threading.Thread:
        thread = threading.Thread(target=self.run, daemon=True)
        thread.start()
        return thread

    def run(self) -> None:
        while not self.stop_event.is_set():
            time.sleep(1 / 120)

            move_to_send = None
            now = time.monotonic()
            with self.state_lock:
                if self.pending_move is not None and self.pending_move != self.last_sent_move:
                    send_interval = self.choose_send_interval(now)
                    if (now - self.last_send_at) < send_interval:
                        continue
                    move_to_send = self.pending_move
                    self.last_sent_move = self.pending_move
                    self.last_send_at = now

            if move_to_send is None:
                continue

            try:
                self.channel.send_json({"command": "MOUSE_MOVE", "args": {"x": move_to_send[0], "y": move_to_send[1]}})
            except Exception:
                logging.exception("Failed to send mouse move event")
                self.stop_event.set()
                break

    def handle_mouse_event(self, event: int, x: int, y: int, flags: int, _param) -> None:
        try:
            remote_x, remote_y = self.scale_to_remote(x, y)

            if event == cv2.EVENT_MOUSEMOVE:
                self.queue_move(remote_x, remote_y)
                return

            if event == cv2.EVENT_LBUTTONDOWN:
                self.send_immediate_move(remote_x, remote_y)
                self.send_button("left", "down")
                return

            if event == cv2.EVENT_LBUTTONUP:
                self.send_immediate_move(remote_x, remote_y)
                self.send_button("left", "up")
                return

            if event == cv2.EVENT_RBUTTONDOWN:
                self.send_immediate_move(remote_x, remote_y)
                self.send_button("right", "down")
                return

            if event == cv2.EVENT_RBUTTONUP:
                self.send_immediate_move(remote_x, remote_y)
                self.send_button("right", "up")
                return

            if event == cv2.EVENT_MOUSEWHEEL:
                delta = self.decode_wheel_delta(flags)
                if delta != 0:
                    self.send_scroll(0, 1 if delta > 0 else -1)
        except Exception:
            logging.exception("Mouse event forwarding failed")
            self.stop_event.set()

    def scale_to_remote(self, x: int, y: int) -> tuple[int, int]:
        with self.state_lock:
            display_width = self.display.width
            display_height = self.display.height

        remote_x = min(self.remote_width - 1, max(0, int(x * self.remote_width / display_width)))
        remote_y = min(self.remote_height - 1, max(0, int(y * self.remote_height / display_height)))
        return remote_x, remote_y

    def queue_move(self, x: int, y: int) -> None:
        with self.state_lock:
            if self.pending_move == (x, y):
                return
            self.pending_move = (x, y)
            self.last_local_move_at = time.monotonic()

    def send_immediate_move(self, x: int, y: int) -> None:
        with self.state_lock:
            self.pending_move = (x, y)
            self.last_sent_move = (x, y)
            self.last_send_at = time.monotonic()
        self.channel.send_json({"command": "MOUSE_MOVE", "args": {"x": x, "y": y}})

    def send_button(self, button: str, action: str) -> None:
        self.channel.send_json({"command": "MOUSE_BUTTON", "args": {"button": button, "action": action}})

    def send_scroll(self, dx: int, dy: int) -> None:
        self.channel.send_json({"command": "MOUSE_SCROLL", "args": {"dx": dx, "dy": dy}})

    @staticmethod
    def decode_wheel_delta(flags: int) -> int:
        delta = (flags >> 16) & 0xFFFF
        if delta >= 0x8000:
            delta -= 0x10000
        return delta

    def choose_send_interval(self, now: float) -> float:
        time_since_local_move = now - self.last_local_move_at
        if time_since_local_move < 0.12:
            return 1 / 90
        if time_since_local_move < 0.3:
            return 1 / 60
        return 1 / 30


class ScreenReceiver:
    def __init__(self, channel: EncryptedChannel, stop_event: threading.Event, mouse_streamer: MouseEventStreamer):
        self.channel = channel
        self.stop_event = stop_event
        self.mouse_streamer = mouse_streamer
        self.window_name = "Remote Screen"

    def run(self) -> None:
        cv2.namedWindow(self.window_name, cv2.WINDOW_AUTOSIZE)
        cv2.setMouseCallback(self.window_name, self.mouse_streamer.handle_mouse_event)

        try:
            while not self.stop_event.is_set():
                packet_type, payload = self.channel.recv_packet()
                if packet_type != b"V":
                    raise ValueError(f"Unexpected packet type in video stream: {packet_type!r}")

                frame = np.frombuffer(payload, dtype=np.uint8)
                decoded = cv2.imdecode(frame, cv2.IMREAD_COLOR)
                if decoded is None:
                    continue

                self.mouse_streamer.update_display_size(decoded.shape[1], decoded.shape[0])
                cv2.imshow(self.window_name, decoded)
                if cv2.waitKey(1) == 27:
                    self.stop_event.set()
                    break
        except (ConnectionError, OSError, ValueError):
            logging.info("Screen stream ended")
            self.stop_event.set()
        except Exception:
            logging.exception("Unexpected screen receiver error")
            self.stop_event.set()
        finally:
            cv2.destroyAllWindows()


class RemoteControlClient:
    def __init__(self, config):
        self.config = config
        self.fernet = Fernet(self.config.fernet_key)
        self.sock: socket.socket | None = None
        self.channel: EncryptedChannel | None = None
        self.stop_event = threading.Event()
        self.screen_thread: threading.Thread | None = None
        self.mouse_thread: threading.Thread | None = None

    def require_channel(self) -> EncryptedChannel:
        if self.channel is None:
            raise ConnectionError("Encrypted channel is not established")
        return self.channel

    def connect(self) -> bool:
        if not is_trusted_remote_ip(self.config.host):
            raise ValueError(
                "RDK_SERVER_HOST must be in a trusted IPv4 network "
                f"({describe_trusted_ipv4_networks()}). "
                "Add your ZeroTier subnet to RDK_TRUSTED_IPV4_CIDRS if it is not RFC1918."
            )

        for attempt in range(1, self.config.connect_retries + 1):
            try:
                self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                tune_socket(self.sock)
                self.sock.settimeout(SOCKET_TIMEOUT_SECONDS)
                self.sock.connect((self.config.host, self.config.port))
                logging.info(
                    "Connected to %s:%s on attempt %s",
                    self.config.host,
                    self.config.port,
                    attempt,
                )
                handshake = recv_handshake(self.sock)
                return self._handle_handshake(handshake)
            except (ConnectionError, OSError) as exc:
                logging.warning("Connection attempt %s failed: %s", attempt, exc)
                self.close_socket_only()
                if attempt == self.config.connect_retries:
                    break
                time.sleep(self.config.connect_retry_delay)

        return False

    def _handle_handshake(self, handshake: str) -> bool:
        if handshake == HANDSHAKE_OK:
            logging.info("Permission granted by target user")
            self.channel = EncryptedChannel(self.require_socket(), self.fernet, self.config.max_packet_size)
            return True
        if handshake == HANDSHAKE_DENIED:
            logging.warning("Access denied by target user")
            return False
        if handshake == HANDSHAKE_BUSY:
            logging.warning("Target machine is busy with another client")
            return False
        if handshake == HANDSHAKE_NOT_PRIVATE:
            logging.warning(
                "Target rejected this client because the address is outside the trusted IPv4 ranges: %s",
                describe_trusted_ipv4_networks(),
            )
            return False
        raise ConnectionError(f"Unexpected handshake: {handshake}")

    def require_socket(self) -> socket.socket:
        if self.sock is None:
            raise ConnectionError("Socket is not connected")
        return self.sock

    def authenticate(self) -> bool:
        channel = self.require_channel()
        channel.send_json({"type": "auth", "password": self.config.auth_password})
        response = channel.recv_json()
        if not response.get("ok"):
            logging.warning("Authentication failed")
            return False

        screen = response.get("screen", {})
        remote_width = int(screen.get("width", 1))
        remote_height = int(screen.get("height", 1))

        self.require_socket().settimeout(None)
        mouse_streamer = MouseEventStreamer(
            channel=channel,
            stop_event=self.stop_event,
            remote_width=remote_width,
            remote_height=remote_height,
        )
        self.mouse_thread = mouse_streamer.start()
        receiver = ScreenReceiver(channel, self.stop_event, mouse_streamer)
        self.screen_thread = threading.Thread(target=receiver.run, daemon=True)
        self.screen_thread.start()
        logging.info("Authenticated successfully")
        return True

    def command_loop(self) -> None:
        print_help()

        while not self.stop_event.is_set():
            try:
                command_text = input("remote> ")
            except (EOFError, KeyboardInterrupt):
                print()
                command_text = "disconnect"

            message = parse_user_command(command_text)
            if message is None:
                continue

            try:
                post_send = message.pop("post_send", None)
                self.require_channel().send_json(message)
                if post_send is not None:
                    self.require_channel().send_json(post_send)
            except Exception:
                logging.exception("Failed to send command")
                self.stop_event.set()
                break

            if message["command"] == "DISCONNECT":
                self.stop_event.set()
                break

    def close_socket_only(self) -> None:
        if self.sock is not None:
            try:
                self.sock.close()
            except OSError:
                pass
        self.sock = None
        self.channel = None

    def close(self) -> None:
        self.stop_event.set()
        self.close_socket_only()
        cv2.destroyAllWindows()


def main() -> None:
    config = load_client_config()
    configure_logging(config.log_file)
    client = RemoteControlClient(config)

    try:
        if client.connect() and client.authenticate():
            client.command_loop()
    except (ConnectionError, InvalidToken, OSError, ValueError) as exc:
        logging.error("Client error: %s", exc)
    except Exception:
        logging.exception("Unexpected client error")
    finally:
        client.close()


if __name__ == "__main__":
    main()
