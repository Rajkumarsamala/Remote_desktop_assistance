import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import HomePage from './components/HomePage'
import HostPage from './components/HostPage'
import ClientPage from './components/ClientPage'
import RemotePage from './components/RemotePage'
import { useWebRTC } from './hooks/useWebRTC'

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
}

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.4,
}

function App() {
  const [currentPage, setCurrentPage] = useState('home')
  const webrtc = useWebRTC()

  const navigateTo = (page) => {
    setCurrentPage(page)
  }

  const handleStartHost = async () => {
    try {
      await webrtc.startHost()
      navigateTo('host')
    } catch (e) {
      // Error handled in hook
    }
  }

  const handleJoinSession = async (code) => {
    try {
      await webrtc.joinSession(code)
      navigateTo('remote')
    } catch (e) {
      // Error handled in hook
    }
  }

  const handleDisconnect = () => {
    webrtc.disconnect()
    navigateTo('home')
  }

  const handleClientConnect = () => {
    navigateTo('remote')
  }

  return (
    <div className="min-h-screen bg-gradient-animated grid-pattern">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial="initial"
          animate="in"
          exit="out"
          variants={pageVariants}
          transition={pageTransition}
          className="min-h-screen"
        >
          {currentPage === 'home' && (
            <HomePage
              onStartHost={handleStartHost}
              onJoinSession={() => navigateTo('client')}
              isConnecting={webrtc.connectionState === 'connecting'}
            />
          )}

          {currentPage === 'host' && (
            <HostPage
              sessionCode={webrtc.sessionCode}
              connectionState={webrtc.connectionState}
              onDisconnect={() => {
                webrtc.disconnect()
                navigateTo('home')
              }}
              onClientConnected={handleClientConnect}
              webrtc={webrtc}
            />
          )}

          {currentPage === 'client' && (
            <ClientPage
              onConnect={handleJoinSession}
              onBack={() => navigateTo('home')}
            />
          )}

          {currentPage === 'remote' && (
            <RemotePage
              webrtc={webrtc}
              onDisconnect={handleDisconnect}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default App
