import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Monitor, Users, Zap, Shield, Download, Command, ChevronRight, Globe, Laptop, Server, Menu, X, ArrowRight, CheckCircle2, Github, Twitter, Linkedin } from 'lucide-react'

// Features Data
const features = [
  {
    icon: Zap,
    title: 'High Performance',
    description: 'WebRTC peer-to-peer connection ensures sub-millisecond response times.',
  },
  {
    icon: Shield,
    title: 'End-to-End Secure',
    description: 'Fully encrypted communication via DTLS/SRTP protocols.',
  },
  {
    icon: Monitor,
    title: 'Crystal Clear',
    description: 'Adaptive bitrate streaming for flawless 60fps screen sharing.',
  },
  {
    icon: Users,
    title: 'Precise Control',
    description: '1:1 pixel-perfect mouse and full system keyboard mapping.',
  },
  {
    icon: Globe,
    title: 'Global Access',
    description: 'Connect to any machine across the world with seamless NAT traversal.',
  },
  {
    icon: Command,
    title: 'Zero Installation',
    description: 'Viewer works directly in any modern browser without plugins.',
  }
]

// Animation Variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
}

function HomePage({ onJoinSession, isConnecting }) {
  const GITHUB_RELEASES_URL = "https://github.com/Rajkumarsamala/Remote_desktop_assistance/releases/latest/download";
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden font-sans selection:bg-accent-cyan/30">
      {/* Dynamic Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-accent-cyan/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-accent-purple/10 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[60rem] h-[60rem] bg-accent-green/5 rounded-full blur-[150px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      {/* Navigation */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-[#0a0a0a]/80 backdrop-blur-lg border-b border-white/10 py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-cyan to-accent-purple flex items-center justify-center shadow-[0_0_15px_rgba(0,212,255,0.3)]">
              <Monitor className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Remote<span className="text-accent-cyan">View</span></span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection('features')} className="text-sm font-medium text-white/70 hover:text-white transition-colors">Features</button>
            <button onClick={() => scrollToSection('how-it-works')} className="text-sm font-medium text-white/70 hover:text-white transition-colors">How it Works</button>
            <button onClick={() => scrollToSection('download')} className="text-sm font-medium text-white/70 hover:text-white transition-colors">Download</button>
            <div className="h-4 w-px bg-white/20"></div>
            <button 
              onClick={onJoinSession} 
              disabled={isConnecting}
              className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-sm font-medium transition-all hover:scale-105 flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              Join Session
            </button>
          </nav>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden text-white/70 hover:text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-0 top-[72px] z-40 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/10 py-6 px-6 md:hidden flex flex-col gap-4"
          >
            <button onClick={() => scrollToSection('features')} className="text-left text-lg font-medium text-white/80 py-2 border-b border-white/5">Features</button>
            <button onClick={() => scrollToSection('how-it-works')} className="text-left text-lg font-medium text-white/80 py-2 border-b border-white/5">How it Works</button>
            <button onClick={() => scrollToSection('download')} className="text-left text-lg font-medium text-white/80 py-2 border-b border-white/5">Download</button>
            <button 
              onClick={onJoinSession} 
              disabled={isConnecting}
              className="mt-4 py-3 rounded-xl bg-accent-cyan text-black font-bold flex items-center justify-center gap-2 w-full"
            >
              Join Session Now
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10 pt-32 pb-20">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 min-h-[80vh] flex flex-col lg:flex-row items-center justify-center gap-16">
          <motion.div 
            initial="hidden" animate="visible" variants={staggerContainer}
            className="flex-1 text-center lg:text-left"
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-strong border border-white/10 mb-8">
              <span className="flex h-2 w-2 rounded-full bg-accent-green animate-pulse"></span>
              <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">RemoteView 2.0 is Live</span>
            </motion.div>
            
            <motion.h1 variants={fadeInUp} className="text-6xl lg:text-7xl xl:text-8xl font-extrabold tracking-tight mb-6 leading-[1.1]">
              Access any device, <br className="hidden lg:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan via-blue-500 to-accent-purple">anywhere.</span>
            </motion.h1>
            
            <motion.p variants={fadeInUp} className="text-lg md:text-xl text-white/60 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-light">
              The fastest, most secure remote desktop software built for modern teams. Experience ultra-low latency control directly from your browser—no viewer installation required.
            </motion.p>
            
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <button onClick={() => scrollToSection('download')} className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-black font-bold text-lg hover:bg-gray-200 hover:scale-105 transition-all flex items-center justify-center gap-2 group">
                Download Host <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={onJoinSession} disabled={isConnecting} className="w-full sm:w-auto px-8 py-4 rounded-full glass-strong border border-white/20 text-white font-bold text-lg hover:bg-white/10 hover:border-white/30 hover:scale-105 transition-all flex items-center justify-center gap-2">
                <Globe className="w-5 h-5" /> Launch Web Viewer
              </button>
            </motion.div>

            <motion.div variants={fadeInUp} className="mt-10 flex items-center justify-center lg:justify-start gap-6 text-sm text-white/40">
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-accent-green" /> Free forever</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-accent-green" /> End-to-end encrypted</div>
            </motion.div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9, rotateY: 20 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="flex-1 w-full max-w-2xl lg:max-w-none perspective-[2000px]"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,212,255,0.15)] border border-white/10 rotate-y-[-10deg] rotate-x-[5deg] transition-transform duration-700 hover:rotate-y-0 hover:rotate-x-0">
              <div className="absolute inset-0 bg-gradient-to-tr from-accent-cyan/20 to-transparent opacity-20" />
              <img src="/client-screenshot.png" alt="RemoteView Dashboard" className="w-full h-auto object-cover" />
            </div>
          </motion.div>
        </section>

        {/* Social Proof */}
        <section className="py-20 border-y border-white/5 bg-white/[0.02] mt-20">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <p className="text-sm font-semibold text-white/40 uppercase tracking-widest mb-8">Trusted by forward-thinking teams</p>
            <div className="flex flex-wrap justify-center gap-12 md:gap-24 opacity-40 grayscale">
              {['Acme Corp', 'GlobalTech', 'Nexus', 'Starlight', 'Quantum'].map((company) => (
                <div key={company} className="text-xl md:text-2xl font-bold font-serif">{company}</div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-32 max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-accent-cyan font-semibold tracking-wider uppercase text-sm mb-4">Enterprise Grade</h2>
            <h3 className="text-4xl md:text-5xl font-bold mb-6">Built for ultimate performance</h3>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">We've engineered RemoteView from the ground up to provide the most fluid, responsive remote desktop experience possible.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeInUp}
                className="glass-strong rounded-[2rem] p-8 border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all duration-300 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:bg-accent-cyan/10 group-hover:scale-110 transition-all duration-300">
                  <feature.icon className="w-7 h-7 text-white/70 group-hover:text-accent-cyan transition-colors" />
                </div>
                <h4 className="text-xl font-bold text-white mb-3">{feature.title}</h4>
                <p className="text-white/50 leading-relaxed font-light">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* How It Works - Split Sections */}
        <section id="how-it-works" className="py-20 max-w-7xl mx-auto px-6 overflow-hidden">
          {/* Section 1: Host */}
          <div className="flex flex-col lg:flex-row items-center gap-16 mb-32">
            <motion.div 
              initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
              className="flex-1 relative"
            >
              <div className="absolute -inset-4 bg-gradient-to-tr from-accent-cyan/20 to-transparent blur-2xl -z-10 rounded-full" />
              <img src="/host-screenshot.png" alt="Host Interface" className="rounded-2xl shadow-2xl border border-white/10 w-full" />
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
              className="flex-1"
            >
              <div className="w-12 h-12 rounded-full bg-accent-cyan/10 flex items-center justify-center mb-6">
                <Server className="w-6 h-6 text-accent-cyan" />
              </div>
              <h3 className="text-3xl md:text-4xl font-bold mb-6">Lightweight Native Host</h3>
              <p className="text-lg text-white/60 mb-8 font-light leading-relaxed">
                Install our native host application on any Windows or Mac device to make it accessible from anywhere. It runs silently in the background with minimal CPU footprint.
              </p>
              <ul className="space-y-4">
                {['One-click start/stop hosting', 'Secure generated session IDs', 'Runs as a background service', 'Auto-starts on boot (optional)'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/80">
                    <CheckCircle2 className="w-5 h-5 text-accent-cyan shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Section 2: Viewer */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
            <motion.div 
              initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
              className="flex-1 relative"
            >
              <div className="absolute -inset-4 bg-gradient-to-bl from-accent-purple/20 to-transparent blur-2xl -z-10 rounded-full" />
              <img src="/client-screenshot.png" alt="Client Interface" className="rounded-2xl shadow-2xl border border-white/10 w-full" />
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
              className="flex-1"
            >
              <div className="w-12 h-12 rounded-full bg-accent-purple/10 flex items-center justify-center mb-6">
                <Laptop className="w-6 h-6 text-accent-purple" />
              </div>
              <h3 className="text-3xl md:text-4xl font-bold mb-6">Zero-Install Web Viewer</h3>
              <p className="text-lg text-white/60 mb-8 font-light leading-relaxed">
                Control your devices securely from any modern web browser. No need to install clunky software or browser extensions on the client side.
              </p>
              <ul className="space-y-4">
                {['No admin privileges required', 'Works on Chrome, Firefox, Safari', 'Full screen & multi-monitor support', 'Dynamic toolbar for quick actions'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/80">
                    <CheckCircle2 className="w-5 h-5 text-accent-purple shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="download" className="py-32 max-w-5xl mx-auto px-6">
          <div className="relative rounded-[3rem] overflow-hidden border border-white/10 p-12 md:p-20 text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-accent-cyan/20 via-[#0a0a0a] to-accent-purple/20" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
            
            <div className="relative z-10">
              <h2 className="text-4xl md:text-6xl font-extrabold mb-6">Ready to take control?</h2>
              <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto">
                Download the host application for your device and start your first remote session in seconds.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <a 
                  href={`${GITHUB_RELEASES_URL}/RemoteViewHost-Windows.exe`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-full sm:w-auto px-8 py-5 rounded-2xl bg-white text-black font-bold hover:scale-105 transition-all flex items-center justify-center gap-3 group shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                >
                  <Download className="w-6 h-6" />
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-500 leading-tight">Download for</div>
                    <div className="text-lg leading-tight">Windows</div>
                  </div>
                </a>
                
                <a 
                  href={`${GITHUB_RELEASES_URL}/RemoteViewHost-Mac`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-full sm:w-auto px-8 py-5 rounded-2xl glass-strong border border-white/20 text-white font-bold hover:bg-white/10 hover:scale-105 transition-all flex items-center justify-center gap-3 group"
                >
                  <Command className="w-6 h-6 group-hover:text-accent-purple transition-colors" />
                  <div className="text-left">
                    <div className="text-sm font-medium text-white/50 leading-tight">Download for</div>
                    <div className="text-lg leading-tight group-hover:text-accent-purple transition-colors">Mac OS</div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#050505] pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 mb-16">
            <div className="col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <Monitor className="w-6 h-6 text-accent-cyan" />
                <span className="text-2xl font-bold tracking-tight">Remote<span className="text-accent-cyan">View</span></span>
              </div>
              <p className="text-white/40 mb-6 max-w-sm">
                Next-generation peer-to-peer remote desktop software. Fast, secure, and built for modern workflows.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"><Twitter className="w-5 h-5" /></a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"><Github className="w-5 h-5" /></a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"><Linkedin className="w-5 h-5" /></a>
              </div>
            </div>
            
            <div>
              <h4 className="font-bold mb-6 text-white/90">Product</h4>
              <ul className="space-y-4 text-sm text-white/50">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-6 text-white/90">Resources</h4>
              <ul className="space-y-4 text-sm text-white/50">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-6 text-white/90">Legal</h4>
              <ul className="space-y-4 text-sm text-white/50">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/40 text-sm">© {new Date().getFullYear()} RemoteView. All rights reserved.</p>
            <div className="flex items-center gap-2 text-sm text-white/40">
              <span className="w-2 h-2 rounded-full bg-accent-green"></span>
              All systems operational
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default HomePage
