# RemoteView - Production Remote Desktop System

Welcome to **RemoteView**, a production-ready, peer-to-peer remote desktop system inspired by AnyDesk and TeamViewer. Fast, highly secure, and driven by WebRTC native APIs, RemoteView lets you control host devices effortlessly through any modern browser!

## 🚀 Features
- **SaaS-Grade Security:** Hosts must explicitly approve connection requests via a GUI prompt before screen sharing begins.
- **Cross-Platform Host Integration:** Packaged natively for Windows, macOS, and Linux.
- **Sub-30ms Latency:** Peer-to-peer WebRTC eliminates server processing delays (up to 30 FPS).
- **Complete Control:** Full mouse events (move/click/drag) and keyboard inputs (keys/combinations).
- **High-Quality Audio:** Synchronized system audio streaming natively mapped (WASAPI on Windows. Audio securely disabled by default on Mac/Linux to prevent hot-miking).
- **Relay Supported:** Implements reliable NAT-busting via OpenRelay STUN and TURN architectures.
- **Commercial Landing Page:** Vercel-deployed modern gateway.

---

## 💻 Running the Host (Desktop App)
The host machinery is now an entirely native application. You no longer need Python setups or terminals to share your screen!

1. Download the latest `RemoteViewHost-Windows.exe` or `RemoteViewHost-Mac` direct from our [Releases Page](https://github.com/Rajkumarsamala/Remote_desktop_assistance/releases).
2. Simply double-click the executable to launch the GUI.
3. Your unique 8-digit **Session Code** displays instantly. Leave it running!

---

## 🌐 Joining a Session (Viewer)
1. Go to your assigned Vercel URL landing page.
2. Click **Join Session**.
3. Input the Session Code provided by the Host Application.
4. Interact directly using natural inputs while the host dynamically processes events seamlessly on the other side of the planet!

---

## 🛠️ Deploying from Scratch

### 1. Backend Signaling Server (Render)
Controls ICE Candidates, Offer/Answers, and bridging.
```bash
cd signaling_server
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 10000
```
*Note: We highly recommend pushing this directly to Render for simple hosting!*

### 2. Frontend Interface (Vercel)
Built leveraging React + Tailwind CSS + Framer Motion.
```bash
cd frontend
npm install
npm run build
npm start
``` 

### 3. Compiling the Host App (GitHub Actions)
Continuous Integration natively generates the bundles for platforms! Simply push to the `main` branch with changes to seamlessly spawn new release artifacts. If you prefer compiling manually locally:
```bash
pyinstaller --noconfirm --onefile --noconsole --name "RemoteViewHost" --hidden-import "aiortc" --hidden-import "av" --hidden-import "mss" --hidden-import "pyautogui" --hidden-import "pynput" --hidden-import "pynput.keyboard._win32" --hidden-import "pynput.mouse._win32" --hidden-import "pyaudiowpatch" --hidden-import "websockets" --hidden-import "aiohttp" host\host.py
```
