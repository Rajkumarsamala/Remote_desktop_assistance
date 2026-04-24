import { motion } from 'framer-motion'
import { Monitor, Users, Zap, Shield, Download, Command } from 'lucide-react'

const features = [
  {
    icon: Monitor,
    title: 'Screen Sharing',
    description: 'Crystal clear real-time screen streaming',
  },
  {
    icon: Users,
    title: 'Remote Control',
    description: 'Full mouse and keyboard control',
  },
  {
    icon: Zap,
    title: 'Low Latency',
    description: 'WebRTC peer-to-peer connection',
  },
  {
    icon: Shield,
    title: 'Secure',
    description: 'Encrypted communication',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

function HomePage({ onJoinSession, isConnecting }) {
  const GITHUB_RELEASES_URL = "https://github.com/Rajkumarsamala/Remote_desktop_assistance/releases/latest/download";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-cyan/10 rounded-full blur-3xl"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl"
          animate={{
            x: [0, -50, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16 relative z-10"
      >
        {/* Logo */}
        <motion.div
          className="inline-flex items-center gap-3 mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-cyan to-accent-purple flex items-center justify-center glow-cyan shadow-premium">
            <Monitor className="w-8 h-8 text-white" />
          </div>
        </motion.div>

        {/* Title */}
        <h1 className="text-5xl md:text-7xl font-extrabold mb-4 tracking-tight">
          Welcome to <span className="gradient-text">RemoteView</span>
        </h1>
        <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed">
          The ultimate peer-to-peer remote desktop system. Download the native host application to share your screen, or join an active session directly from your browser.
        </p>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col md:flex-row gap-6 mb-20 relative z-10 w-full max-w-4xl justify-center items-center"
      >
        {/* Download Windows Button */}
        <motion.a
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -4 }}
          whileTap={{ scale: 0.98 }}
          href={`${GITHUB_RELEASES_URL}/RemoteViewHost-Windows.exe`}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative px-6 py-5 rounded-2xl overflow-hidden w-full md:w-auto shadow-lg border border-accent-cyan/30"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-accent-cyan/80 to-blue-500/80 opacity-100 group-hover:opacity-90 transition-opacity" />
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-black/20 flex items-center justify-center shadow-inner">
              <Download className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <div className="text-lg font-bold text-white">Download for Windows</div>
              <div className="text-sm text-white/80 font-medium">.exe installer</div>
            </div>
          </div>
        </motion.a>

        {/* Download Mac Button */}
        <motion.a
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -4 }}
          whileTap={{ scale: 0.98 }}
          href={`${GITHUB_RELEASES_URL}/RemoteViewHost-Mac`}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative px-6 py-5 rounded-2xl overflow-hidden w-full md:w-auto shadow-lg border border-accent-purple/30"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-accent-purple/80 to-pink-500/80 opacity-100 group-hover:opacity-90 transition-opacity" />
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-black/20 flex items-center justify-center shadow-inner">
              <Command className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <div className="text-lg font-bold text-white">Download for Mac</div>
              <div className="text-sm text-white/80 font-medium">Standalone Binary</div>
            </div>
          </div>
        </motion.a>

        {/* Join Session Button */}
        <motion.button
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={onJoinSession}
          disabled={isConnecting}
          className="group glass-strong px-8 py-5 rounded-2xl hover:bg-white/10 transition-all duration-300 w-full md:w-auto border border-white/20 shadow-lg"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-accent-cyan/20 transition-colors shadow-inner">
              <Users className="w-6 h-6 text-white group-hover:text-accent-cyan transition-colors" />
            </div>
            <div className="text-left">
              <div className="text-lg font-bold text-white">Join Session</div>
              <div className="text-sm text-white/60">View remote screen</div>
            </div>
          </div>
        </motion.button>
      </motion.div>

      {/* Features */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl relative z-10 w-full"
      >
        {features.map((feature, index) => (
          <motion.div
            key={index}
            variants={itemVariants}
            className="glass rounded-3xl p-6 text-center hover:bg-white/5 transition-all duration-300 border border-white/5 hover:border-white/20 shadow-premium"
          >
            <feature.icon className="w-8 h-8 text-accent-cyan mx-auto mb-4" />
            <h3 className="font-semibold text-white mb-2 text-lg">{feature.title}</h3>
            <p className="text-sm text-white/60 leading-relaxed">{feature.description}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-20 text-center text-white/40 text-sm font-medium tracking-wide"
      >
        Powered by WebRTC & Native APIs • End-to-end encrypted
      </motion.div>
    </div>
  )
}

export default HomePage
