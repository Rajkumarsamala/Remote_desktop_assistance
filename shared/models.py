"""
Data models for Remote Desktop Application
"""
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import json


class SessionState(Enum):
    """Session state enumeration"""
    WAITING = "waiting"           # Host waiting for client
    CONNECTING = "connecting"    # Client is connecting
    CONNECTED = "connected"       # Active session
    DISCONNECTED = "disconnected" # Session ended
    EXPIRED = "expired"           # Session timed out


class PeerType(Enum):
    """Peer type enumeration"""
    HOST = "host"
    CLIENT = "client"


@dataclass
class InputEvent:
    """Input event data structure"""
    event_type: str  # 'mouse_move', 'mouse_click', 'mouse_release', 'keyboard', 'scroll'
    x: Optional[int] = None
    y: Optional[int] = None
    button: Optional[str] = None  # 'left', 'right', 'middle'
    key: Optional[str] = None
    delta_x: Optional[int] = None
    delta_y: Optional[int] = None
    timestamp: float = 0.0

    def to_json(self) -> str:
        """Convert to JSON string"""
        return json.dumps({
            'event_type': self.event_type,
            'x': self.x,
            'y': self.y,
            'button': self.button,
            'key': self.key,
            'delta_x': self.delta_x,
            'delta_y': self.delta_y,
            'timestamp': self.timestamp,
        })

    @classmethod
    def from_json(cls, data: str) -> 'InputEvent':
        """Create from JSON string"""
        obj = json.loads(data)
        return cls(
            event_type=obj['event_type'],
            x=obj.get('x'),
            y=obj.get('y'),
            button=obj.get('button'),
            key=obj.get('key'),
            delta_x=obj.get('delta_x'),
            delta_y=obj.get('delta_y'),
            timestamp=obj.get('timestamp', 0.0),
        )


@dataclass
class Session:
    """Session data structure"""
    code: str
    host_ws: Any = None  # WebSocket connection to host
    client_ws: Any = None  # WebSocket connection to client
    state: SessionState = SessionState.WAITING
    created_at: datetime = field(default_factory=datetime.now)
    last_activity: datetime = field(default_factory=datetime.now)
    host_connected: bool = False
    client_connected: bool = False

    def is_expired(self, expiry_seconds: int = 3600) -> bool:
        """Check if session is expired"""
        elapsed = (datetime.now() - self.created_at).total_seconds()
        return elapsed > expiry_seconds

    def is_active(self) -> bool:
        """Check if session is active"""
        return self.state == SessionState.CONNECTED

    def mark_connected(self):
        """Mark session as connected when both peers are ready"""
        if self.host_connected and self.client_connected:
            self.state = SessionState.CONNECTED
            self.last_activity = datetime.now()

    def update_activity(self):
        """Update last activity timestamp"""
        self.last_activity = datetime.now()


@dataclass
class WebRTCMessage:
    """WebRTC signaling message"""
    type: str  # 'offer', 'answer', 'ice_candidate'
    sdp: Optional[str] = None
    candidate: Optional[Dict[str, Any]] = None
    sdpMid: Optional[str] = None
    sdpMLineIndex: Optional[int] = None

    def to_json(self) -> str:
        """Convert to JSON string"""
        data = {'type': self.type}
        if self.sdp:
            data['sdp'] = self.sdp
        if self.candidate:
            data['candidate'] = self.candidate
        if self.sdpMid:
            data['sdpMid'] = self.sdpMid
        if self.sdpMLineIndex is not None:
            data['sdpMLineIndex'] = self.sdpMLineIndex
        return json.dumps(data)

    @classmethod
    def from_json(cls, data: str) -> 'WebRTCMessage':
        """Create from JSON string"""
        obj = json.loads(data)
        return cls(
            type=obj['type'],
            sdp=obj.get('sdp'),
            candidate=obj.get('candidate'),
            sdpMid=obj.get('sdpMid'),
            sdpMLineIndex=obj.get('sdpMLineIndex'),
        )


@dataclass
class ScreenFrame:
    """Screen frame data structure"""
    width: int
    height: int
    timestamp: float
    frame_number: int
    data: bytes

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'width': self.width,
            'height': self.height,
            'timestamp': self.timestamp,
            'frame_number': self.frame_number,
            'data_size': len(self.data),
        }
