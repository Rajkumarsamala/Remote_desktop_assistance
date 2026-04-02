import logging
import socket
import threading
import time
import tkinter as tk
from tkinter import messagebox

import cv2
import mss
import numpy as np
from cryptography.fernet import Fernet, InvalidToken
from pynput.keyboard import Controller as KeyboardController
from pynput.mouse import Button, Controller as MouseController

from shared import EncryptedChannel
from shared import HANDSHAKE_BUSY
from shared import HANDSHAKE_DENIED
from shared import HANDSHAKE_NOT_PRIVATE
from shared import HANDSHAKE_OK
from shared import SOCKET_TIMEOUT_SECONDS
from shared import configure_logging
from shared import constant_time_password_match
from shared import describe_trusted_ipv4_networks
from shared import is_trusted_remote_ip
from shared import load_server_config
from shared import send_handshake
from shared import tune_socket


def ask_permission(client_ip: str) -> bool:
    root = None

    try:
        root = tk.Tk()
        root.withdraw()
        return messagebox.askyesno(
            "Remote Access Request",
            f"{client_ip} wants to control this computer.\nAllow access?",
        )
    except Exception:
        logging.exception("Permission dialog failed")
        return False
    finally:
        if root is not None:
            root.destroy()


def get_primary_monitor() -> dict[str, int]:
    with mss.mss() as sct:
        monitor = sct.monitors[1]
        return {
            "top": int(monitor["top"]),
            "left": int(monitor["left"]),
            "width": int(monitor["width"]),
            "height": int(monitor["height"]),
        }


class ScreenStreamer:
    def __init__(
        self,
        channel: EncryptedChannel,
        monitor: dict[str, int],
        fps: int,
        jpeg_quality: int,
        frame_scale: float,
    ):
        self.channel = channel
        self.monitor = monitor
        self.max_fps = max(1, fps)
        self.base_jpeg_quality = jpeg_quality
        self.frame_scale = frame_scale
        self.stop_event: threading.Event | None = None
        self.capture_lock = threading.Lock()
        self.frame_ready = threading.Event()
        self.latest_frame: np.ndarray | None = None
        self.latest_frame_id = 0
        self.last_encoded_id = 0
        self.last_change_ratio = 1.0
        self.last_input_at = time.monotonic()

    def note_input_activity(self) -> None:
        self.last_input_at = time.monotonic()

    def start(self, stop_event: threading.Event) -> list[threading.Thread]:
        self.stop_event = stop_event
        capture_thread = threading.Thread(target=self.capture_loop, daemon=True)
        send_thread = threading.Thread(target=self.encode_and_send_loop, daemon=True)
        capture_thread.start()
        send_thread.start()
        return [capture_thread, send_thread]

    def capture_loop(self) -> None:
        assert self.stop_event is not None
        previous_preview = None

        with mss.mss() as sct:
            while not self.stop_event.is_set():
                loop_started_at = time.perf_counter()

                try:
                    image = sct.grab(self.monitor)
                    frame = np.array(image)
                    frame = cv2.cvtColor(frame, cv2.COLOR_BGRA2BGR)

                    preview = cv2.resize(frame, (160, 90), interpolation=cv2.INTER_AREA)
                    preview = cv2.cvtColor(preview, cv2.COLOR_BGR2GRAY)
                    change_ratio = self.compute_change_ratio(previous_preview, preview)
                    previous_preview = preview

                    if self.frame_scale != 1.0:
                        frame = cv2.resize(
                            frame,
                            None,
                            fx=self.frame_scale,
                            fy=self.frame_scale,
                            interpolation=cv2.INTER_AREA,
                        )

                    with self.capture_lock:
                        self.latest_frame = frame
                        self.latest_frame_id += 1
                        self.last_change_ratio = change_ratio
                    self.frame_ready.set()
                except Exception:
                    logging.exception("Frame capture failed")
                    self.stop_event.set()
                    break

                target_interval = 1 / self.choose_target_fps(change_ratio)
                elapsed = time.perf_counter() - loop_started_at
                if elapsed < target_interval:
                    time.sleep(target_interval - elapsed)

    def encode_and_send_loop(self) -> None:
        assert self.stop_event is not None

        while not self.stop_event.is_set():
            self.frame_ready.wait(timeout=0.5)
            if self.stop_event.is_set():
                break

            frame_to_send = None
            frame_id = 0
            change_ratio = 0.0

            with self.capture_lock:
                if self.latest_frame is not None and self.latest_frame_id != self.last_encoded_id:
                    frame_to_send = self.latest_frame.copy()
                    frame_id = self.latest_frame_id
                    change_ratio = self.last_change_ratio
                else:
                    self.frame_ready.clear()
                    continue

            try:
                quality = self.choose_jpeg_quality(change_ratio)
                ok, encoded = cv2.imencode(
                    ".jpg",
                    frame_to_send,
                    [int(cv2.IMWRITE_JPEG_QUALITY), quality],
                )
                if not ok:
                    logging.warning("Frame encoding failed")
                    continue

                self.channel.send_video(encoded.tobytes())
                self.last_encoded_id = frame_id
                with self.capture_lock:
                    if self.last_encoded_id == self.latest_frame_id:
                        self.frame_ready.clear()
            except (ConnectionError, OSError, ValueError):
                logging.info("Screen streaming stopped because the connection ended")
                self.stop_event.set()
                break
            except Exception:
                logging.exception("Unexpected frame encode/send failure")
                self.stop_event.set()
                break

    def choose_target_fps(self, change_ratio: float) -> int:
        active_input = (time.monotonic() - self.last_input_at) < 0.35
        if change_ratio < 0.002:
            fps = 6
        elif change_ratio < 0.01:
            fps = 12
        elif change_ratio < 0.03:
            fps = 18
        else:
            fps = self.max_fps

        if active_input:
            fps = max(fps, min(self.max_fps, 30))

        return max(4, min(self.max_fps, fps))

    def choose_jpeg_quality(self, change_ratio: float) -> int:
        active_input = (time.monotonic() - self.last_input_at) < 0.35
        if change_ratio < 0.002:
            quality = self.base_jpeg_quality + 8
        elif change_ratio < 0.01:
            quality = self.base_jpeg_quality + 2
        elif change_ratio < 0.03:
            quality = self.base_jpeg_quality - 4
        else:
            quality = self.base_jpeg_quality - 10

        if active_input:
            quality -= 4

        return max(35, min(70, quality))

    @staticmethod
    def compute_change_ratio(previous_preview, current_preview) -> float:
        if previous_preview is None:
            return 1.0
        diff = cv2.absdiff(previous_preview, current_preview)
        return float(np.mean(diff) / 255.0)


class RemoteControlServer:
    def __init__(self, config):
        self.config = config
        self.fernet = Fernet(self.config.fernet_key)
        self.mouse = MouseController()
        self.keyboard = KeyboardController()
        self.active_client: socket.socket | None = None
        self.lock = threading.Lock()
        self.active_streamer: ScreenStreamer | None = None

    def start(self) -> None:
        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        tune_socket(server)
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.bind((self.config.host, self.config.port))
        server.listen(5)
        logging.info("Server listening on %s:%s", self.config.host, self.config.port)
        logging.info("Server accepts trusted IPv4 ranges: %s", describe_trusted_ipv4_networks())

        try:
            while True:
                client, address = server.accept()
                tune_socket(client)
                client.settimeout(SOCKET_TIMEOUT_SECONDS)
                threading.Thread(
                    target=self.handle_client,
                    args=(client, address),
                    daemon=True,
                ).start()
        finally:
            server.close()

    def handle_client(self, client: socket.socket, address: tuple[str, int]) -> None:
        client_ip, client_port = address
        stop_event = threading.Event()
        channel = EncryptedChannel(client, self.fernet, self.config.max_packet_size)
        streamer: ScreenStreamer | None = None

        logging.info("Incoming connection from %s:%s", client_ip, client_port)

        try:
            if not is_trusted_remote_ip(client_ip):
                send_handshake(client, HANDSHAKE_NOT_PRIVATE)
                logging.warning(
                    "Rejected %s:%s because the source IP is outside the trusted IPv4 ranges: %s",
                    client_ip,
                    client_port,
                    describe_trusted_ipv4_networks(),
                )
                return

            with self.lock:
                if self.active_client is not None:
                    send_handshake(client, HANDSHAKE_BUSY)
                    logging.warning("Rejected %s:%s because another client is active", client_ip, client_port)
                    return
                self.active_client = client

            if not ask_permission(client_ip):
                send_handshake(client, HANDSHAKE_DENIED)
                logging.info("User denied access for %s:%s", client_ip, client_port)
                return

            send_handshake(client, HANDSHAKE_OK)

            auth_message = channel.recv_json()
            if auth_message.get("type") != "auth":
                channel.send_json({"ok": False, "error": "INVALID_AUTH_MESSAGE"})
                logging.warning("Rejected %s:%s because auth payload was malformed", client_ip, client_port)
                return

            submitted_password = str(auth_message.get("password", ""))
            if not constant_time_password_match(submitted_password, self.config.auth_password):
                channel.send_json({"ok": False, "error": "AUTH_FAILED"})
                logging.warning("Authentication failed for %s:%s", client_ip, client_port)
                return

            monitor = get_primary_monitor()
            channel.send_json(
                {
                    "ok": True,
                    "screen": {
                        "width": monitor["width"],
                        "height": monitor["height"],
                    },
                }
            )
            logging.info("Authenticated client: %s:%s", client_ip, client_port)

            client.settimeout(None)
            streamer = ScreenStreamer(
                channel=channel,
                monitor=monitor,
                fps=self.config.stream_fps,
                jpeg_quality=self.config.jpeg_quality,
                frame_scale=self.config.frame_scale,
            )
            self.active_streamer = streamer
            streamer.start(stop_event)

            while True:
                message = channel.recv_json()
                command = message.get("command")
                args = message.get("args", {})
                streamer.note_input_activity()

                if command == "MOVE":
                    x = int(args["x"])
                    y = int(args["y"])
                    self.mouse.position = (x, y)
                    logging.info("MOVE from %s:%s -> (%s, %s)", client_ip, client_port, x, y)
                elif command == "MOUSE_MOVE":
                    x = int(args["x"])
                    y = int(args["y"])
                    self.mouse.position = (x, y)
                elif command == "CLICK":
                    self.mouse.click(Button.left, 1)
                    logging.info("CLICK from %s:%s", client_ip, client_port)
                elif command == "MOUSE_BUTTON":
                    button_name = str(args["button"]).lower()
                    action = str(args["action"]).lower()
                    button = self.resolve_button(button_name)
                    if action == "down":
                        self.mouse.press(button)
                    elif action == "up":
                        self.mouse.release(button)
                    else:
                        raise ValueError(f"Unsupported mouse action: {action}")
                elif command == "MOUSE_SCROLL":
                    dx = int(args.get("dx", 0))
                    dy = int(args.get("dy", 0))
                    self.mouse.scroll(dx, dy)
                elif command == "TYPE":
                    text = str(args["text"])
                    self.keyboard.type(text)
                    logging.info("TYPE from %s:%s -> %s chars", client_ip, client_port, len(text))
                elif command == "DISCONNECT":
                    logging.info("DISCONNECT from %s:%s", client_ip, client_port)
                    break
                else:
                    raise ValueError(f"Unsupported command: {command}")
        except (ConnectionError, InvalidToken, KeyError, OSError, ValueError) as exc:
            logging.warning("Session error for %s:%s: %s", client_ip, client_port, exc)
        except Exception:
            logging.exception("Unexpected server failure for %s:%s", client_ip, client_port)
        finally:
            stop_event.set()
            try:
                client.close()
            except OSError:
                pass
            with self.lock:
                if self.active_client is client:
                    self.active_client = None
            if streamer is not None and self.active_streamer is streamer:
                self.active_streamer = None
            logging.info("Client disconnected: %s:%s", client_ip, client_port)

    @staticmethod
    def resolve_button(button_name: str) -> Button:
        if button_name == "left":
            return Button.left
        if button_name == "right":
            return Button.right
        raise ValueError(f"Unsupported mouse button: {button_name}")


def main() -> None:
    config = load_server_config()
    configure_logging(config.log_file)
    server = RemoteControlServer(config)
    server.start()


if __name__ == "__main__":
    main()
