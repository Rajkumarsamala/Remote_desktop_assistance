import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: 'rgba(18, 18, 26, 0.95)',
          color: '#fff',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
        },
        success: {
          iconTheme: {
            primary: '#00ff88',
            secondary: '#fff',
          },
        },
        error: {
          iconTheme: {
            primary: '#ff4444',
            secondary: '#fff',
          },
        },
      }}
    />
  </React.StrictMode>,
)
