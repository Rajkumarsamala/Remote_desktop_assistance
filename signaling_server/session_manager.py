"""
Session Manager for Remote Desktop Application
Handles session creation, lookup, and lifecycle management
"""
import secrets
import threading
from typing import Dict, Optional
from datetime import datetime, timedelta
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.models import Session, SessionState


class SessionManager:
    """
    Manages all remote desktop sessions in memory.
    Thread-safe session management with automatic expiration.
    """

    def __init__(self, max_sessions: int = 100, expiry_seconds: int = 3600):
        """
        Initialize session manager.

        Args:
            max_sessions: Maximum number of concurrent sessions
            expiry_seconds: Session expiry time in seconds
        """
        self._sessions: Dict[str, Session] = {}
        self._lock = threading.RLock()
        self._max_sessions = max_sessions
        self._expiry_seconds = expiry_seconds

    def _generate_session_code(self) -> str:
        """
        Generate a unique 8-digit session code formatted as XXXX-XXXX.

        Returns:
            A formatted session code string
        """
        while True:
            # Generate 8 random digits
            code = ''.join([str(secrets.randbelow(10)) for _ in range(8)])
            # Format as XXXX-XXXX
            formatted = f"{code[:4]}-{code[4:]}"
            # Check if code is unique
            with self._lock:
                if formatted not in self._sessions:
                    return formatted

    def create_session(self) -> Optional[Session]:
        """
        Create a new session for a host.

        Returns:
            Session object if created successfully, None if max sessions reached
        """
        with self._lock:
            # Check if max sessions reached
            if len(self._sessions) >= self._max_sessions:
                return None

            # Generate unique code
            code = self._generate_session_code()

            # Create session
            session = Session(
                code=code,
                state=SessionState.WAITING,
                created_at=datetime.now(),
                last_activity=datetime.now()
            )

            self._sessions[code] = session
            return session

    def get_session(self, code: str) -> Optional[Session]:
        """
        Get session by code.

        Args:
            code: Session code (formatted as XXXX-XXXX)

        Returns:
            Session object if found, None otherwise
        """
        with self._lock:
            session = self._sessions.get(code)

            if session and not session.is_expired(self._expiry_seconds):
                return session
            elif session:
                # Clean up expired session
                del self._sessions[code]
            return None

    def register_host(self, code: str, host_ws) -> bool:
        """
        Register a host WebSocket connection to a session.

        Args:
            code: Session code
            host_ws: Host's WebSocket connection

        Returns:
            True if registered successfully
        """
        with self._lock:
            session = self._sessions.get(code)
            if not session:
                return False

            session.host_ws = host_ws
            session.host_connected = True
            session.update_activity()
            return True

    def register_client(self, code: str, client_ws) -> bool:
        """
        Register a client WebSocket connection to a session.

        Args:
            code: Session code
            client_ws: Client's WebSocket connection

        Returns:
            True if registered successfully
        """
        with self._lock:
            session = self._sessions.get(code)
            if not session:
                return False

            # If host not registered yet, mark as waiting
            if not session.host_connected:
                return False

            session.client_ws = client_ws
            session.client_connected = True
            session.mark_connected()
            return True

    def set_session_state(self, code: str, state: SessionState) -> bool:
        """
        Update session state.

        Args:
            code: Session code
            state: New session state

        Returns:
            True if updated successfully
        """
        with self._lock:
            session = self._sessions.get(code)
            if not session:
                return False

            session.state = state
            session.update_activity()
            return True

    def close_session(self, code: str) -> bool:
        """
        Close and remove a session.

        Args:
            code: Session code

        Returns:
            True if session was closed
        """
        with self._lock:
            if code in self._sessions:
                session = self._sessions[code]
                session.state = SessionState.DISCONNECTED
                del self._sessions[code]
                return True
            return False

    def cleanup_expired_sessions(self) -> int:
        """
        Remove all expired sessions.

        Returns:
            Number of sessions removed
        """
        with self._lock:
            expired_codes = [
                code for code, session in self._sessions.items()
                if session.is_expired(self._expiry_seconds)
            ]

            for code in expired_codes:
                del self._sessions[code]

            return len(expired_codes)

    def get_active_session_count(self) -> int:
        """Get count of active sessions."""
        with self._lock:
            return len(self._sessions)

    def is_host_connected(self, code: str) -> bool:
        """Check if host is connected to a session."""
        with self._lock:
            session = self._sessions.get(code)
            return session.host_connected if session else False

    def is_client_connected(self, code: str) -> bool:
        """Check if client is connected to a session."""
        with self._lock:
            session = self._sessions.get(code)
            return session.client_connected if session else False
