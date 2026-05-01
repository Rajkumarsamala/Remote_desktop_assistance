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
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: 'spring', stiffness: 120, damping: 20 }
  },
}

function HomePage({ onJoinSession, isConnecting }) {
  const GITHUB_RELEASES_URL = "https://github.com/Rajkumarsamala/Remote_desktop_assistance/releases/latest/download";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[30rem] h-[30rem] bg-accent-cyan/10 rounded-full blur-[100px] animate-float-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-accent-purple/10 rounded-full blur-[100px] animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-accent-green/5 rounded-full blur-[120px] animate-pulse" />
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
          className="inline-flex items-center gap-3 mb-6 animate-float"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 100, damping: 15 }}
        >
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-accent-cyan to-accent-purple flex items-center justify-center glow-cyan shadow-premium">
            <Monitor className="w-10 h-10 text-white" />
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
          whileHover={{ scale: 1.05, y: -5 }}
          whileTap={{ scale: 0.98 }}
          href={`${GITHUB_RELEASES_URL}/RemoteViewHost-Windows.exe`}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative px-8 py-5 rounded-[2rem] w-full md:w-auto border border-white/10 shadow-premium overflow-hidden bg-white/5"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-accent-cyan/20 via-blue-500/20 to-accent-cyan/20 bg-[length:200%_auto] opacity-0 group-hover:opacity-100 group-hover:animate-[border-gradient_2s_linear_infinite] transition-opacity duration-500" />
          <div className="absolute inset-0 bg-white/5 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative flex items-center gap-5 z-10">
            <div className="w-14 h-14 rounded-2xl bg-black/50 flex items-center justify-center shadow-inner group-hover:bg-accent-cyan/20 group-hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] transition-all duration-300">
              <Download className="w-6 h-6 text-accent-cyan group-hover:text-white transition-colors" />
            </div>
            <div className="text-left">
              <div className="text-lg font-bold text-white group-hover:text-accent-cyan transition-colors">Download for Windows</div>
              <div className="text-sm text-white/50 font-medium group-hover:text-white/80">.exe installer</div>
            </div>
          </div>
        </motion.a>

        {/* Download Mac Button */}
        <motion.a
          variants={itemVariants}
          whileHover={{ scale: 1.05, y: -5 }}
          whileTap={{ scale: 0.98 }}
          href={`${GITHUB_RELEASES_URL}/RemoteViewHost-Mac`}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative px-8 py-5 rounded-[2rem] w-full md:w-auto border border-white/10 shadow-premium overflow-hidden bg-white/5"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-accent-purple/20 via-pink-500/20 to-accent-purple/20 bg-[length:200%_auto] opacity-0 group-hover:opacity-100 group-hover:animate-[border-gradient_2s_linear_infinite] transition-opacity duration-500" />
          <div className="absolute inset-0 bg-white/5 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative flex items-center gap-5 z-10">
            <div className="w-14 h-14 rounded-2xl bg-black/50 flex items-center justify-center shadow-inner group-hover:bg-accent-purple/20 group-hover:shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-all duration-300">
              <Command className="w-6 h-6 text-accent-purple group-hover:text-white transition-colors" />
            </div>
            <div className="text-left">
              <div className="text-lg font-bold text-white group-hover:text-accent-purple transition-colors">Download for Mac</div>
              <div className="text-sm text-white/50 font-medium group-hover:text-white/80">Standalone Binary</div>
            </div>
          </div>
        </motion.a>

        {/* Join Session Button */}
        <motion.button
          variants={itemVariants}
          whileHover={{ scale: 1.05, y: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={onJoinSession}
          disabled={isConnecting}
          className="group relative px-10 py-5 rounded-[2rem] w-full md:w-auto border border-white/10 shadow-premium overflow-hidden bg-white/5"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-accent-green/20 via-emerald-500/20 to-accent-green/20 bg-[length:200%_auto] opacity-0 group-hover:opacity-100 group-hover:animate-[border-gradient_2s_linear_infinite] transition-opacity duration-500" />
          <div className="absolute inset-0 bg-white/5 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="flex items-center gap-5 z-10 relative">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center shadow-inner group-hover:bg-accent-green/20 group-hover:shadow-[0_0_15px_rgba(0,255,136,0.5)] transition-all duration-300">
              <Users className="w-7 h-7 text-white group-hover:text-accent-green transition-colors" />
            </div>
            <div className="text-left">
              <div className="text-xl font-bold text-white group-hover:text-accent-green transition-colors">Join Session</div>
              <div className="text-sm text-white/40 group-hover:text-white/80 transition-colors">View remote screen</div>
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
            whileHover={{ y: -12, scale: 1.03, rotateX: 5, rotateY: -5 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="glass-strong rounded-[2rem] p-8 text-center transition-all duration-500 border border-white/10 hover:border-accent-cyan/50 hover:bg-white/10 hover:shadow-[0_20px_40px_-15px_rgba(0,212,255,0.3)] cursor-default relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-white/5 to-transparent rotate-45 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
            <feature.icon className="w-12 h-12 text-white/50 group-hover:text-accent-cyan mx-auto mb-5 transition-colors duration-300 group-hover:drop-shadow-[0_0_10px_rgba(0,212,255,0.8)]" />
            <h3 className="font-bold text-white mb-3 text-xl group-hover:text-accent-cyan transition-colors">{feature.title}</h3>
            <p className="text-sm text-white/60 leading-relaxed group-hover:text-white/90 transition-colors font-medium">{feature.description}</p>
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
