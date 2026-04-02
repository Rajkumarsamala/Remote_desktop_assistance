import math
import sys
import time

from PySide6.QtCore import QEasingCurve, QObject, QPoint, QRect, Qt, QPropertyAnimation, QTimer, Signal
from PySide6.QtGui import (
    QAction,
    QColor,
    QEnterEvent,
    QFont,
    QIcon,
    QImage,
    QPaintEvent,
    QPainter,
    QPainterPath,
    QPen,
    QPixmap,
    QResizeEvent,
    QShowEvent,
)
from PySide6.QtSvg import QSvgRenderer
from PySide6.QtWidgets import (
    QApplication,
    QFrame,
    QGraphicsDropShadowEffect,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMainWindow,
    QPushButton,
    QSizePolicy,
    QStackedWidget,
    QToolButton,
    QVBoxLayout,
    QWidget,
)


APP_STYLE = """
QWidget {
    color: #edf4ff;
    font-family: "Segoe UI";
    font-size: 13px;
}
QMainWindow {
    background: transparent;
}
QFrame#GlassCard, QFrame#GlassToolbar, QFrame#GlassOverlay, QFrame#GlassStatus {
    background: rgba(10, 16, 30, 0.76);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 24px;
}
QLabel#HeroTitle {
    font-size: 34px;
    font-weight: 700;
    letter-spacing: 0.2px;
}
QLabel#HeroSub {
    color: #9fb2ca;
    font-size: 15px;
    line-height: 1.4;
}
QLabel#SectionTitle {
    font-size: 16px;
    font-weight: 600;
    color: #f5f8ff;
}
QLabel#FieldLabel {
    color: #87a0c1;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.6px;
    text-transform: uppercase;
}
QLabel#Muted {
    color: #87a0c1;
    font-size: 12px;
}
QLineEdit {
    background: rgba(15, 23, 42, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 15px 16px 13px 16px;
    selection-background-color: #38bdf8;
}
QLineEdit:focus {
    border: 1px solid rgba(96, 165, 250, 0.85);
    background: rgba(15, 23, 42, 0.92);
}
QPushButton#PrimaryButton {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
        stop:0 #2563eb, stop:0.55 #0ea5e9, stop:1 #22d3ee);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 18px;
    padding: 15px 20px;
    font-size: 14px;
    font-weight: 700;
}
QPushButton#PrimaryButton:hover {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
        stop:0 #3b82f6, stop:0.55 #38bdf8, stop:1 #67e8f9);
}
QPushButton#PrimaryButton:pressed {
    background: #2563eb;
}
QToolButton {
    background: rgba(15, 23, 42, 0.94);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 16px;
    padding: 10px;
}
QToolButton:checked {
    background: rgba(37, 99, 235, 0.28);
    border: 1px solid rgba(96, 165, 250, 0.6);
}
"""


ICON_SVG = {
    "mouse": """
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="7" y="2.5" width="10" height="19" rx="5" stroke="white" stroke-width="1.7"/>
        <path d="M12 2.5V9" stroke="white" stroke-width="1.7" stroke-linecap="round"/>
        </svg>
    """,
    "keyboard": """
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="6" width="18" height="12" rx="2.5" stroke="white" stroke-width="1.7"/>
        <path d="M6 10H8M10 10H12M14 10H16M18 10H18.5M6 13H16M18 13H18.5M8 16H16" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
    """,
    "fullscreen": """
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 4H4V8M16 4H20V8M8 20H4V16M20 16V20H16" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    """,
    "camera": """
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="7" width="18" height="12" rx="3" stroke="white" stroke-width="1.7"/>
        <circle cx="12" cy="13" r="3.2" stroke="white" stroke-width="1.7"/>
        <path d="M8 7L9.5 5H14.5L16 7" stroke="white" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    """,
    "stats": """
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 18V10M12 18V6M19 18V13" stroke="white" stroke-width="1.9" stroke-linecap="round"/>
        <path d="M4 19.5H20" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
    """,
    "disconnect": """
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 7L20 12L15 17" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M20 12H9" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M11 5H8C6.34315 5 5 6.34315 5 8V16C5 17.6569 6.34315 19 8 19H11" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
    """,
}


def svg_icon(name: str, size: int = 20, color: QColor | None = None) -> QPixmap:
    svg = ICON_SVG[name]
    if color is not None:
        svg = svg.replace("white", color.name())
    renderer = QSvgRenderer(bytes(svg, encoding="utf-8"))
    pixmap = QPixmap(size, size)
    pixmap.fill(Qt.GlobalColor.transparent)
    painter = QPainter(pixmap)
    renderer.render(painter)
    painter.end()
    return pixmap


def add_shadow(widget: QWidget, blur: int, color: QColor, offset_y: int = 12) -> QGraphicsDropShadowEffect:
    effect = QGraphicsDropShadowEffect(widget)
    effect.setBlurRadius(blur)
    effect.setOffset(0, offset_y)
    effect.setColor(color)
    widget.setGraphicsEffect(effect)
    return effect


class AuroraBackground(QWidget):
    def paintEvent(self, _event: QPaintEvent) -> None:
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        painter.fillRect(self.rect(), QColor("#060b16"))

        blobs = [
            (QColor(37, 99, 235, 115), QRect(-40, -20, 420, 320)),
            (QColor(14, 165, 233, 82), QRect(780, 20, 380, 300)),
            (QColor(168, 85, 247, 60), QRect(1020, 440, 340, 260)),
            (QColor(34, 211, 238, 48), QRect(120, 560, 440, 280)),
        ]
        for color, rect in blobs:
            path = QPainterPath()
            path.addEllipse(rect)
            painter.fillPath(path, color)

        painter.setPen(QPen(QColor(255, 255, 255, 18), 1))
        for y in range(60, self.height(), 80):
            painter.drawLine(60, y, self.width() - 60, y)


class AnimatedConnectButton(QPushButton):
    def __init__(self, text: str):
        super().__init__(text)
        self.setObjectName("PrimaryButton")
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.shadow = add_shadow(self, 32, QColor(37, 99, 235, 110), 0)
        self._idle_blur = 28.0
        self._hover_blur = 48.0
        self.anim = QPropertyAnimation(self.shadow, b"blurRadius", self)
        self.anim.setDuration(220)
        self.anim.setEasingCurve(QEasingCurve.Type.OutCubic)

    def enterEvent(self, event: QEnterEvent) -> None:
        self.anim.stop()
        self.anim.setStartValue(self.shadow.blurRadius())
        self.anim.setEndValue(self._hover_blur)
        self.anim.start()
        super().enterEvent(event)

    def leaveEvent(self, event: QEnterEvent) -> None:
        self.anim.stop()
        self.anim.setStartValue(self.shadow.blurRadius())
        self.anim.setEndValue(self._idle_blur)
        self.anim.start()
        super().leaveEvent(event)


class PulseLoader(QWidget):
    def __init__(self):
        super().__init__()
        self.setFixedSize(40, 40)
        self.angle = 0
        self.timer = QTimer(self)
        self.timer.timeout.connect(self._advance)

    def start(self):
        self.timer.start(24)
        self.show()

    def stop(self):
        self.timer.stop()
        self.hide()

    def _advance(self):
        self.angle = (self.angle + 18) % 360
        self.update()

    def paintEvent(self, _event: QPaintEvent) -> None:
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        center = self.rect().center()

        for idx in range(12):
            alpha = int(35 + 220 * (idx / 12))
            color = QColor(56, 189, 248, alpha)
            painter.setPen(Qt.PenStyle.NoPen)
            painter.setBrush(color)
            angle = math.radians(self.angle - idx * 30)
            x = center.x() + math.cos(angle) * 12
            y = center.y() + math.sin(angle) * 12
            painter.drawEllipse(QPoint(int(x), int(y)), 2, 2)


class FloatingField(QFrame):
    def __init__(self, label: str, placeholder: str, password: bool = False):
        super().__init__()
        self.setObjectName("GlassCard")
        self.setStyleSheet("QFrame { border-radius: 18px; }")
        layout = QVBoxLayout(self)
        layout.setContentsMargins(16, 10, 16, 12)
        layout.setSpacing(6)

        self.label = QLabel(label)
        self.label.setObjectName("FieldLabel")
        self.input = QLineEdit()
        self.input.setPlaceholderText(placeholder)
        self.input.setFrame(False)
        if password:
            self.input.setEchoMode(QLineEdit.EchoMode.Password)

        layout.addWidget(self.label)
        layout.addWidget(self.input)


class StatusBadge(QFrame):
    def __init__(self, label: str, color: str):
        super().__init__()
        self.setObjectName("GlassCard")
        layout = QHBoxLayout(self)
        layout.setContentsMargins(12, 8, 12, 8)
        layout.setSpacing(8)
        self.dot = QLabel()
        self.dot.setFixedSize(10, 10)
        self.text = QLabel(label)
        self.text.setObjectName("Muted")
        layout.addWidget(self.dot)
        layout.addWidget(self.text)
        self.set_status(label, color)

    def set_status(self, label: str, color: str):
        self.dot.setStyleSheet(f"background:{color}; border-radius:5px;")
        self.text.setText(label)


class InfoChip(QFrame):
    def __init__(self, title: str, accent: str):
        super().__init__()
        self.setObjectName("GlassCard")
        layout = QHBoxLayout(self)
        layout.setContentsMargins(12, 10, 12, 10)
        layout.setSpacing(10)
        glow = QLabel()
        glow.setFixedSize(8, 28)
        glow.setStyleSheet(f"background:{accent}; border-radius:4px;")
        text = QLabel(title)
        text.setObjectName("Muted")
        layout.addWidget(glow)
        layout.addWidget(text)


class MetricPill(QFrame):
    def __init__(self, title: str, value: str):
        super().__init__()
        self.setObjectName("GlassOverlay")
        layout = QVBoxLayout(self)
        layout.setContentsMargins(14, 10, 14, 10)
        layout.setSpacing(2)
        title_label = QLabel(title)
        title_label.setObjectName("Muted")
        self.value_label = QLabel(value)
        self.value_label.setStyleSheet("font-size: 18px; font-weight: 700; color: #f8fbff;")
        layout.addWidget(title_label)
        layout.addWidget(self.value_label)

    def set_value(self, value: str):
        self.value_label.setText(value)


class MetricsOverlay(QFrame):
    def __init__(self):
        super().__init__()
        self.setObjectName("GlassOverlay")
        add_shadow(self, 28, QColor(15, 23, 42, 120), 8)
        layout = QHBoxLayout(self)
        layout.setContentsMargins(14, 14, 14, 14)
        layout.setSpacing(10)
        self.fps = MetricPill("FPS", "0")
        self.bandwidth = MetricPill("Bandwidth", "0 KB/s")
        self.latency = MetricPill("Latency", "0 ms")
        layout.addWidget(self.fps)
        layout.addWidget(self.bandwidth)
        layout.addWidget(self.latency)

    def update_metrics(self, fps: float, bandwidth_kbps: float, latency_ms: float):
        self.fps.set_value(f"{fps:.0f}")
        self.bandwidth.set_value(f"{bandwidth_kbps:.0f} KB/s")
        self.latency.set_value(f"{latency_ms:.0f} ms")


class RemoteViewport(QLabel):
    def __init__(self):
        super().__init__("Waiting for secure stream")
        self.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.setMinimumSize(960, 560)
        self.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
        self.setStyleSheet(
            "background: qlineargradient(x1:0, y1:0, x2:1, y2:1,"
            " stop:0 rgba(7, 11, 22, 0.98), stop:1 rgba(13, 22, 40, 0.98));"
            "border-radius: 28px;"
            "border: 1px solid rgba(255, 255, 255, 0.06);"
            "color: #6f88a9;"
            "font-size: 20px;"
            "font-weight: 600;"
        )
        self._pixmap: QPixmap | None = None

    def set_frame(self, image: QImage):
        self._pixmap = QPixmap.fromImage(image)
        self._update_pixmap()

    def resizeEvent(self, event: QResizeEvent) -> None:
        super().resizeEvent(event)
        self._update_pixmap()

    def _update_pixmap(self):
        if self._pixmap is None:
            return
        scaled = self._pixmap.scaled(
            self.size(),
            Qt.AspectRatioMode.KeepAspectRatio,
            Qt.TransformationMode.SmoothTransformation,
        )
        self.setPixmap(scaled)


def make_tool_button(icon_name: str, tooltip: str, checkable: bool = False, checked: bool = False) -> QToolButton:
    button = QToolButton()
    pixmap = svg_icon(icon_name)
    button.setCursor(Qt.CursorShape.PointingHandCursor)
    button.setIcon(QIcon(pixmap))
    button.setIconSize(pixmap.size())
    button.setToolTip(tooltip)
    button.setCheckable(checkable)
    button.setChecked(checked)
    button.setFixedSize(48, 48)
    add_shadow(button, 18, QColor(9, 14, 25, 100), 6)
    return button


class FadeInWidget:
    _active_animations: list[QPropertyAnimation] = []

    @staticmethod
    def apply(widget: QWidget, duration: int = 380, offset: int = 18) -> None:
        start_pos = widget.pos() + QPoint(0, offset)
        end_pos = widget.pos()
        widget.move(start_pos)

        pos_anim = QPropertyAnimation(widget, b"pos", widget)
        pos_anim.setDuration(duration)
        pos_anim.setStartValue(start_pos)
        pos_anim.setEndValue(end_pos)
        pos_anim.setEasingCurve(QEasingCurve.Type.OutCubic)
        FadeInWidget._active_animations.append(pos_anim)
        pos_anim.finished.connect(lambda: FadeInWidget._active_animations.remove(pos_anim))
        pos_anim.start()


class ConnectionView(QWidget):
    connect_requested = Signal(str, int, str)

    def __init__(self):
        super().__init__()
        root = QHBoxLayout(self)
        root.setContentsMargins(38, 36, 38, 36)
        root.setSpacing(26)

        self.hero = self._build_hero()
        self.panel = self._build_panel()
        root.addWidget(self.hero, 3)
        root.addWidget(self.panel, 2)

    def showEvent(self, event: QShowEvent) -> None:
        super().showEvent(event)
        FadeInWidget.apply(self.hero)
        FadeInWidget.apply(self.panel)

    def _build_hero(self):
        panel = QFrame()
        panel.setObjectName("GlassCard")
        add_shadow(panel, 48, QColor(10, 20, 38, 180), 12)
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(30, 30, 30, 30)
        layout.setSpacing(18)

        status = StatusBadge("Private LAN secure session", "#34d399")
        title = QLabel("A premium remote workspace for real assistance sessions.")
        title.setObjectName("HeroTitle")
        title.setWordWrap(True)
        copy = QLabel(
            "Designed with the clarity of modern AI tools and the confidence of "
            "professional support software, this interface keeps connection, control, "
            "and telemetry in one elegant surface."
        )
        copy.setWordWrap(True)
        copy.setObjectName("HeroSub")

        chips_layout = QHBoxLayout()
        chips_layout.setSpacing(12)
        chips_layout.addWidget(InfoChip("Encrypted transport", "#38bdf8"))
        chips_layout.addWidget(InfoChip("Live stream telemetry", "#a78bfa"))
        chips_layout.addWidget(InfoChip("Low-latency input", "#f59e0b"))

        layout.addWidget(status, alignment=Qt.AlignmentFlag.AlignLeft)
        layout.addSpacing(10)
        layout.addWidget(title)
        layout.addWidget(copy)
        layout.addSpacing(8)
        layout.addLayout(chips_layout)
        layout.addStretch(1)
        return panel

    def _build_panel(self):
        panel = QFrame()
        panel.setObjectName("GlassCard")
        add_shadow(panel, 48, QColor(10, 20, 38, 180), 12)
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(28, 28, 28, 28)
        layout.setSpacing(14)

        heading = QLabel("Launch Remote Session")
        heading.setObjectName("SectionTitle")
        helper = QLabel("Enter your secure session endpoint and connect when ready.")
        helper.setObjectName("Muted")

        self.host_field = FloatingField("Host", "192.168.1.10")
        self.port_field = FloatingField("Port", "5000")
        self.port_field.input.setText("5000")
        self.password_field = FloatingField("Password", "Secure session password", password=True)

        self.status_badge = StatusBadge("Idle", "#64748b")
        self.loader = PulseLoader()
        self.loader.hide()
        self.connect_button = AnimatedConnectButton("Connect Securely")
        self.connect_button.clicked.connect(self._emit_connect)

        footer = QHBoxLayout()
        footer.setSpacing(12)
        footer.addWidget(self.status_badge)
        footer.addStretch(1)
        footer.addWidget(self.loader)

        layout.addWidget(heading)
        layout.addWidget(helper)
        layout.addSpacing(8)
        layout.addWidget(self.host_field)
        layout.addWidget(self.port_field)
        layout.addWidget(self.password_field)
        layout.addSpacing(4)
        layout.addLayout(footer)
        layout.addStretch(1)
        layout.addWidget(self.connect_button)
        return panel

    def _emit_connect(self):
        host = self.host_field.input.text().strip()
        password = self.password_field.input.text()
        port_text = self.port_field.input.text().strip() or "5000"
        try:
            port = int(port_text)
        except ValueError:
            self.set_status("Invalid port", "#ef4444", loading=False)
            return
        self.set_status("Connecting", "#f59e0b", loading=True)
        self.connect_requested.emit(host, port, password)

    def set_status(self, text: str, color: str, loading: bool = False):
        self.status_badge.set_status(text, color)
        if loading:
            self.loader.start()
        else:
            self.loader.stop()


class SessionView(QWidget):
    disconnect_requested = Signal()

    def __init__(self):
        super().__init__()
        root = QVBoxLayout(self)
        root.setContentsMargins(24, 22, 24, 22)
        root.setSpacing(16)

        self.viewport = RemoteViewport()
        self.toolbar = self._build_toolbar()
        self.overlay = MetricsOverlay()
        self.status_bar = self._build_status_bar()

        viewer_shell = QWidget()
        viewer_shell_layout = QVBoxLayout(viewer_shell)
        viewer_shell_layout.setContentsMargins(0, 0, 0, 0)
        viewer_shell_layout.addWidget(self.viewport)

        root.addWidget(
            self.toolbar,
            0,
            alignment=Qt.AlignmentFlag.AlignTop | Qt.AlignmentFlag.AlignHCenter,
        )
        root.addWidget(viewer_shell, 1)
        root.addWidget(self.overlay, 0, alignment=Qt.AlignmentFlag.AlignRight)
        root.addWidget(self.status_bar)

    def _build_toolbar(self):
        frame = QFrame()
        frame.setObjectName("GlassToolbar")
        add_shadow(frame, 36, QColor(9, 14, 25, 140), 10)
        layout = QHBoxLayout(frame)
        layout.setContentsMargins(16, 12, 16, 12)
        layout.setSpacing(12)

        self.mouse_toggle = make_tool_button("mouse", "Mouse control", checkable=True, checked=True)
        self.keyboard_toggle = make_tool_button("keyboard", "Keyboard input", checkable=True, checked=True)
        self.fullscreen_button = make_tool_button("fullscreen", "Fullscreen", checkable=True)
        self.screenshot_button = make_tool_button("camera", "Capture screenshot")
        self.stats_button = make_tool_button("stats", "Session statistics", checkable=True, checked=True)
        self.disconnect_button = make_tool_button("disconnect", "Disconnect")
        self.disconnect_button.clicked.connect(self.disconnect_requested.emit)

        for widget in [
            self.mouse_toggle,
            self.keyboard_toggle,
            self.fullscreen_button,
            self.screenshot_button,
            self.stats_button,
        ]:
            layout.addWidget(widget)

        spacer = QLabel("Session Controls")
        spacer.setObjectName("Muted")
        spacer.setStyleSheet("padding-left: 6px;")
        layout.addWidget(spacer)
        layout.addStretch(1)
        layout.addWidget(self.disconnect_button)
        return frame

    def _build_status_bar(self):
        frame = QFrame()
        frame.setObjectName("GlassStatus")
        add_shadow(frame, 26, QColor(9, 14, 25, 120), 8)
        layout = QHBoxLayout(frame)
        layout.setContentsMargins(14, 12, 14, 12)
        layout.setSpacing(12)

        self.connection_badge = StatusBadge("Disconnected", "#64748b")
        self.endpoint_label = QLabel("No active endpoint")
        self.endpoint_label.setObjectName("Muted")
        self.resolution_label = QLabel("Resolution: --")
        self.resolution_label.setObjectName("Muted")

        layout.addWidget(self.connection_badge)
        layout.addWidget(self.endpoint_label)
        layout.addStretch(1)
        layout.addWidget(self.resolution_label)
        return frame

    def set_resolution(self, width: int, height: int):
        self.resolution_label.setText(f"Resolution: {width} x {height}")

    def set_connection_state(self, label: str, color: str, detail: str):
        self.connection_badge.set_status(label, color)
        self.endpoint_label.setText(detail)


class DemoSessionBridge(QObject):
    status_changed = Signal(str, str, str)
    session_ready = Signal(int, int)
    frame_ready = Signal(QImage)
    metrics_changed = Signal(float, float, float)
    disconnected = Signal()

    def __init__(self):
        super().__init__()
        self.frame_timer = QTimer(self)
        self.frame_timer.timeout.connect(self._tick)
        self.phase = 0.0
        self.width = 1440
        self.height = 900
        self.last_frame_at = time.perf_counter()

    def connect_to_session(self, host: str, port: int, _password: str):
        self.status_changed.emit("Connecting", "#f59e0b", f"Negotiating secure link to {host}:{port}")
        QTimer.singleShot(900, lambda: self._finish_connect(host, port))

    def _finish_connect(self, host: str, port: int):
        self.session_ready.emit(self.width, self.height)
        self.status_changed.emit("Connected", "#22c55e", f"Live session with {host}:{port}")
        self.frame_timer.start(33)

    def disconnect_from_session(self):
        self.frame_timer.stop()
        self.status_changed.emit("Disconnected", "#64748b", "Session closed")
        self.disconnected.emit()

    def _tick(self):
        image = QImage(self.width, self.height, QImage.Format.Format_RGB32)
        image.fill(QColor("#0c1222"))

        painter = QPainter(image)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        glow_shapes = [
            (QColor(37, 99, 235, 85), QRect(60, 80, 520, 260)),
            (QColor(34, 211, 238, 52), QRect(860, 120, 360, 260)),
            (QColor(168, 85, 247, 44), QRect(280, 520, 420, 180)),
        ]
        for color, rect in glow_shapes:
            path = QPainterPath()
            path.addRoundedRect(rect, 36, 36)
            painter.fillPath(path, color)

        painter.setBrush(QColor(255, 255, 255, 16))
        painter.setPen(QPen(QColor(255, 255, 255, 24), 1))
        for idx in range(4):
            rect = QRect(140 + idx * 230, 220 + (idx % 2) * 28, 190, 120)
            painter.drawRoundedRect(rect, 24, 24)

        cursor_x = 260 + int(520 * (0.5 + 0.45 * math.sin(self.phase)))
        cursor_y = 240 + int(180 * (0.5 + 0.45 * math.cos(self.phase * 1.25)))
        painter.setBrush(QColor("#67e8f9"))
        painter.setPen(Qt.PenStyle.NoPen)
        painter.drawEllipse(QPoint(cursor_x, cursor_y), 10, 10)

        painter.setPen(QColor("#f8fbff"))
        painter.setFont(QFont("Segoe UI", 30, QFont.Weight.Bold))
        painter.drawText(
            QRect(110, 96, 800, 80),
            Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter,
            "Remote Desktop Assistance",
        )

        painter.setPen(QColor("#94a3b8"))
        painter.setFont(QFont("Segoe UI", 13))
        painter.drawText(
            QRect(112, 148, 650, 30),
            Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter,
            "Premium AI-inspired session workspace",
        )
        painter.end()

        now = time.perf_counter()
        fps = 1.0 / max(0.001, now - self.last_frame_at)
        self.last_frame_at = now
        self.phase += 0.05

        self.frame_ready.emit(image)
        self.metrics_changed.emit(fps, 410 + 46 * math.sin(self.phase), 12 + 3.5 * math.cos(self.phase))


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Remote Desktop Assistance")
        self.resize(1460, 940)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)

        shell = AuroraBackground()
        shell_layout = QVBoxLayout(shell)
        shell_layout.setContentsMargins(16, 16, 16, 16)

        self.stack = QStackedWidget()
        self.stack.setStyleSheet("background: transparent;")
        shell_layout.addWidget(self.stack)
        self.setCentralWidget(shell)

        self.connection_view = ConnectionView()
        self.session_view = SessionView()
        self.stack.addWidget(self.connection_view)
        self.stack.addWidget(self.session_view)

        self.bridge = DemoSessionBridge()
        self._wire_signals()
        self._build_actions()

    def _wire_signals(self):
        self.connection_view.connect_requested.connect(self.bridge.connect_to_session)
        self.session_view.disconnect_requested.connect(self.bridge.disconnect_from_session)
        self.session_view.fullscreen_button.toggled.connect(self._toggle_fullscreen)
        self.session_view.stats_button.toggled.connect(self.session_view.overlay.setVisible)

        self.bridge.status_changed.connect(self._apply_status)
        self.bridge.session_ready.connect(self._start_session)
        self.bridge.frame_ready.connect(self.session_view.viewport.set_frame)
        self.bridge.metrics_changed.connect(self.session_view.overlay.update_metrics)
        self.bridge.disconnected.connect(self._show_connection)

    def _build_actions(self):
        disconnect_action = QAction("Disconnect", self)
        disconnect_action.setShortcut("Ctrl+Shift+D")
        disconnect_action.triggered.connect(self.bridge.disconnect_from_session)
        self.addAction(disconnect_action)

        fullscreen_action = QAction("Fullscreen", self)
        fullscreen_action.setShortcut("F11")
        fullscreen_action.triggered.connect(
            lambda: self.session_view.fullscreen_button.setChecked(not self.session_view.fullscreen_button.isChecked())
        )
        self.addAction(fullscreen_action)

    def _apply_status(self, label: str, color: str, detail: str):
        loading = label == "Connecting"
        self.connection_view.set_status(label, color, loading=loading)
        self.session_view.set_connection_state(label, color, detail)

    def _start_session(self, width: int, height: int):
        self.connection_view.set_status("Connected", "#22c55e", loading=False)
        self.session_view.set_resolution(width, height)
        self.stack.setCurrentWidget(self.session_view)

    def _show_connection(self):
        self.connection_view.set_status("Idle", "#64748b", loading=False)
        self.stack.setCurrentWidget(self.connection_view)

    def _toggle_fullscreen(self, enabled: bool):
        if enabled:
            self.showFullScreen()
        else:
            self.showNormal()


def main():
    app = QApplication(sys.argv)
    app.setStyleSheet(APP_STYLE)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
