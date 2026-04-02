import base64
import functools
import hmac
import ipaddress
import json
import logging
import os
import socket
import struct
import threading
from dataclasses import dataclass
from logging.handlers import RotatingFileHandler
from typing import Any

from cryptography.fernet import Fernet


HANDSHAKE_SIZE = 64
MAX_PACKET_SIZE = 8 * 1024 * 1024
DEFAULT_PORT = 5000
SOCKET_TIMEOUT_SECONDS = 20
CONNECT_RETRIES = 5
CONNECT_RETRY_DELAY_SECONDS = 2

PACKET_TYPE_JSON = b"J"
PACKET_TYPE_VIDEO = b"V"

HANDSHAKE_OK = "OK"
HANDSHAKE_BUSY = "REJECT:BUSY"
HANDSHAKE_DENIED = "REJECT:USER_DENIED"
HANDSHAKE_NOT_PRIVATE = "REJECT:NOT_PRIVATE"
RFC1918_PRIVATE_NETWORKS = (
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
)
TRUSTED_NETWORKS_ENV = "RDK_TRUSTED_IPV4_CIDRS"


@dataclass(frozen=True)
class ServerConfig:
    host: str
    port: int
    fernet_key: bytes
    auth_password: str
    log_file: str
    max_packet_size: int = MAX_PACKET_SIZE
    handshake_size: int = HANDSHAKE_SIZE
    stream_fps: int = 24
    jpeg_quality: int = 52
    frame_scale: float = 0.8


@dataclass(frozen=True)
class ClientConfig:
    host: str
    port: int
    fernet_key: bytes
    auth_password: str
    log_file: str
    max_packet_size: int = MAX_PACKET_SIZE
    handshake_size: int = HANDSHAKE_SIZE
    connect_retries: int = CONNECT_RETRIES
    connect_retry_delay: int = CONNECT_RETRY_DELAY_SECONDS


def configure_logging(log_file: str) -> None:
    root_logger = logging.getLogger()
    if root_logger.handlers:
        root_logger.handlers.clear()

    formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")
    file_handler = RotatingFileHandler(log_file, maxBytes=1_000_000, backupCount=3)
    file_handler.setFormatter(formatter)
    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(formatter)

    root_logger.setLevel(logging.INFO)
    root_logger.addHandler(file_handler)
    root_logger.addHandler(stream_handler)


def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def get_int_env(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw in (None, ""):
        return default
    value = int(raw)
    if value <= 0:
        raise ValueError(f"{name} must be a positive integer")
    return value


def validate_fernet_key(key: str) -> bytes:
    key_bytes = key.encode()
    raw = base64.urlsafe_b64decode(key_bytes)
    if len(raw) != 32:
        raise ValueError("Invalid Fernet key")
    return key_bytes


def constant_time_password_match(candidate: str, expected: str) -> bool:
    return hmac.compare_digest(candidate.encode("utf-8"), expected.encode("utf-8"))


@functools.lru_cache(maxsize=1)
def get_trusted_ipv4_networks() -> tuple[ipaddress.IPv4Network, ...]:
    networks = list(RFC1918_PRIVATE_NETWORKS)
    raw_extra_networks = os.getenv(TRUSTED_NETWORKS_ENV, "")

    for raw_network in raw_extra_networks.split(","):
        cidr = raw_network.strip()
        if not cidr:
            continue

        network = ipaddress.ip_network(cidr, strict=False)
        if network.version != 4:
            raise ValueError(f"{TRUSTED_NETWORKS_ENV} only supports IPv4 CIDR ranges: {cidr}")
        networks.append(network)

    return tuple(networks)


def describe_trusted_ipv4_networks() -> str:
    return ", ".join(str(network) for network in get_trusted_ipv4_networks())


def is_trusted_remote_ip(ip: str) -> bool:
    try:
        address = ipaddress.ip_address(ip)
    except ValueError:
        return False

    if address.version != 4:
        return False

    return any(address in network for network in get_trusted_ipv4_networks())


def recv_exact(sock: socket.socket, size: int) -> bytes:
    data = b""
    while len(data) < size:
        packet = sock.recv(size - len(data))
        if not packet:
            raise ConnectionError("Connection closed")
        data += packet
    return data


def send_handshake(sock: socket.socket, message: str) -> None:
    sock.sendall(message.encode("utf-8").ljust(HANDSHAKE_SIZE, b" "))


def recv_handshake(sock: socket.socket) -> str:
    return recv_exact(sock, HANDSHAKE_SIZE).decode("utf-8").strip()


def send_packet(sock: socket.socket, packet_type: bytes, payload: bytes) -> None:
    sock.sendall(packet_type + struct.pack("!I", len(payload)) + payload)


def recv_packet(sock: socket.socket, max_packet_size: int) -> tuple[bytes, bytes]:
    header = recv_exact(sock, 5)
    packet_type = header[:1]
    payload_size = struct.unpack("!I", header[1:])[0]
    if payload_size > max_packet_size:
        raise ValueError(f"Packet too large: {payload_size}")
    payload = recv_exact(sock, payload_size)
    return packet_type, payload


class EncryptedChannel:
    def __init__(self, sock: socket.socket, fernet: Fernet, max_packet_size: int):
        self.sock = sock
        self.fernet = fernet
        self.max_packet_size = max_packet_size
        self.send_lock = threading.Lock()

    def send_json(self, message: dict[str, Any]) -> None:
        payload = self.fernet.encrypt(json.dumps(message).encode("utf-8"))
        with self.send_lock:
            send_packet(self.sock, PACKET_TYPE_JSON, payload)

    def recv_json(self) -> dict[str, Any]:
        packet_type, payload = recv_packet(self.sock, self.max_packet_size)
        if packet_type != PACKET_TYPE_JSON:
            raise ValueError(f"Unexpected packet type: {packet_type!r}")
        plain = self.fernet.decrypt(payload)
        return json.loads(plain.decode("utf-8"))

    def send_video(self, payload: bytes) -> None:
        with self.send_lock:
            send_packet(self.sock, PACKET_TYPE_VIDEO, payload)

    def recv_packet(self) -> tuple[bytes, bytes]:
        return recv_packet(self.sock, self.max_packet_size)


def tune_socket(sock: socket.socket) -> None:
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1)
    try:
        sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
    except OSError:
        pass


def load_server_config() -> ServerConfig:
    return ServerConfig(
        host="0.0.0.0",
        port=get_int_env("RDK_SERVER_PORT", DEFAULT_PORT),
        fernet_key=validate_fernet_key(require_env("RDK_FERNET_KEY")),
        auth_password=require_env("RDK_AUTH_PASSWORD"),
        log_file="server.log",
    )


def load_client_config() -> ClientConfig:
    return ClientConfig(
        host=require_env("RDK_SERVER_HOST"),
        port=get_int_env("RDK_SERVER_PORT", DEFAULT_PORT),
        fernet_key=validate_fernet_key(require_env("RDK_FERNET_KEY")),
        auth_password=require_env("RDK_AUTH_PASSWORD"),
        log_file="client.log",
    )
