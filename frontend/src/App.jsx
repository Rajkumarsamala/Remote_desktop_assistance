import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import HomePage from './components/HomePage'
import ClientPage from './components/ClientPage'
import RemotePage from './components/RemotePage'
import { useWebRTC } from './hooks/useWebRTC'

const pageVariants = {
  initial: { opacity: 0, scale: 0.95, filter: 'blur(10px)' },
  in: { opacity: 1, scale: 1, filter: 'blur(0px)' },
  out: { opacity: 0, scale: 1.05, filter: 'blur(10px)' },
}

const pageTransition = {
  type: 'spring',
  stiffness: 260,
  damping: 20,
}

function App() {
  const [currentPage, setCurrentPage] = useState('home')
  const webrtc = useWebRTC()

  const navigateTo = (page) => {
    setCurrentPage(page)
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
              onJoinSession={() => navigateTo('client')}
              isConnecting={webrtc.connectionState === 'connecting'}
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
