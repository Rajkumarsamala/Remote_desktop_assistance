import { ICE_SERVERS, MSG_TYPES } from './constants'

/**
 * Create a new RTCPeerConnection with STUN servers
 */
export function createPeerConnection() {
  return new RTCPeerConnection({
    iceServers: ICE_SERVERS,
    iceTransportPolicy: 'all',
  })
}

/**
 * Create a data channel for input events
 */
export function createDataChannel(pc) {
  const dataChannel = pc.createDataChannel('input', {
    ordered: false,
    maxRetransmits: 0,
  })
  return dataChannel
}

/**
 * Convert mouse event to input event JSON
 */
export function mouseEventToInput(event, screenRef) {
  const video = screenRef?.current
  if (!video || !video.videoWidth || !video.videoHeight) return null

  const rect = video.getBoundingClientRect()
  
  // Exact coordinate map without letterbox modifications as explicitly requested
  const x = Math.round((event.clientX - rect.left) * (video.videoWidth / rect.width));
  const y = Math.round((event.clientY - rect.top) * (video.videoHeight / rect.height));

  let eventType = 'mouse_move'
  let button = null

  switch (event.type) {
    case 'mousedown':
      eventType = 'mouse_down'
      button = getButton(event.button)
      break
    case 'mouseup':
      eventType = 'mouse_up'
      button = getButton(event.button)
      break
    case 'wheel':
      eventType = 'scroll'
      break
    case 'click':
    case 'contextmenu':
      // The browser natively handles the click sequence; we already sent mousedown/mouseup
      // But if needed, just pass as move for update tracking
      eventType = 'mouse_move'
      break
    default:
      break
  }
  
  console.log("Sending:", x, y, eventType)

  return {
    event_type: eventType,
    x,
    y,
    button,
    delta_x: event.deltaX,
    delta_y: event.deltaY,
    timestamp: Date.now(),
  }
}

/**
 * Convert keyboard event to input event JSON
 */
export function keyboardEventToInput(event) {
  const specialKeys = {
    'Enter': 'enter',
    'Tab': 'tab',
    'Escape': 'esc',
    'Backspace': 'backspace',
    'Delete': 'delete',
    'ArrowUp': 'up',
    'ArrowDown': 'down',
    'ArrowLeft': 'left',
    'ArrowRight': 'right',
    'Home': 'home',
    'End': 'end',
    'PageUp': 'pageup',
    'PageDown': 'pagedown',
    ' ': 'space',
    'Shift': 'shift',
    'Control': 'ctrl',
    'Alt': 'alt',
    'Meta': 'cmd',
    'OS': 'cmd',
  }

  let key = event.key

  // Handle special keys
  if (specialKeys[key]) {
    key = specialKeys[key]
  }

  return {
    event_type: event.type === 'keyup' ? 'keyup' : 'keydown',
    key,
    code: event.code,
    ctrl: event.ctrlKey,
    shift: event.shiftKey,
    alt: event.altKey,
    timestamp: Date.now(),
  }
}

/**
 * Get button name from button code
 */
function getButton(button) {
  switch (button) {
    case 0: return 'left'
    case 1: return 'middle'
    case 2: return 'right'
    default: return 'left'
  }
}

/**
 * Send message via WebSocket
 */
export function sendWsMessage(ws, type, data = {}) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, ...data }))
  }
}

/**
 * Format session code for display (XXXX-XXXX)
 */
export function formatSessionCode(code) {
  if (!code) return ''
  const clean = code.replace(/[^0-9]/g, '')
  if (clean.length <= 4) return clean
  return `${clean.slice(0, 4)}-${clean.slice(4, 8)}`
}

/**
 * Parse session code (remove dashes)
 */
export function parseSessionCode(code) {
  return code.replace(/[^0-9]/g, '')
}
