import { useState } from 'react'
import './App.css'
import { signIn, signUp } from './features/auth/authService.js'
import { clearStoredSession, getStoredSession, storeSession } from './features/auth/session.js'
import LandingPage from './pages/LandingPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'

function App() {
  const [view, setView] = useState(() => {
    return getStoredSession() ? 'dashboard' : 'landing'
  })
  const [mode, setMode] = useState('signin')
  const [showAuth, setShowAuth] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('error')
  const [showSignupSuccess, setShowSignupSuccess] = useState(false)
  const [createdUsername, setCreatedUsername] = useState('')

  const openAuth = (nextMode) => {
    setMode(nextMode)
    setShowAuth(true)
    setView('landing')
    setMessage('')
    setMessageType('error')
    setShowSignupSuccess(false)
  }

  const closeAuth = () => {
    setShowAuth(false)
    setMessage('')
    setMessageType('error')
    setShowSignupSuccess(false)
  }

  const handleLogout = () => {
    clearStoredSession()
    setView('landing')
    setShowAuth(false)
    setMessage('')
    setMessageType('error')
    setShowSignupSuccess(false)
  }

  const handleAuthSubmit = async (event) => {
    event.preventDefault()
    const form = event.currentTarget
    const username = form.elements.username.value.trim()
    const password = form.elements.password.value.trim()

    if (!username || !password) {
      setMessage('Please enter both a username and password.')
      setMessageType('error')
      return
    }

    if (mode === 'signup') {
      try {
        const { ok, data } = await signUp(username, password)

        if (!ok) {
          setMessage(data.message || 'Unable to create account right now.')
          setMessageType('error')
          return
        }

        setMode('signin')
        setCreatedUsername(data.username || username)
        setShowSignupSuccess(true)
        form.reset()
      } catch {
        setMessage('Database API is not running. Please start the Python backend and try again.')
        setMessageType('error')
      }
      return
    }

    try {
      const { ok, data } = await signIn(username, password)

      if (!ok) {
        setMessage(data.message || 'Unable to sign in right now.')
        setMessageType('error')
        return
      }

      storeSession({
        uniqueID: data.uniqueID,
        username: data.username,
      })
      setMessage('')
      setMessageType('error')
      setShowAuth(false)
      setView('dashboard')
    } catch {
      setMessage('Database API is not running. Please start the Python backend and try again.')
      setMessageType('error')
      return
    }
  }

  const signInWithNewAccount = () => {
    setShowSignupSuccess(false)
    setCreatedUsername('')
    setMode('signin')
    setMessage('')
    setMessageType('error')
  }

  return (
    <>
      {view === 'dashboard' ? (
        <DashboardPage onLogout={handleLogout} />
      ) : (
        <LandingPage
          mode={mode}
          showAuth={showAuth}
          message={message}
          messageType={messageType}
          showSignupSuccess={showSignupSuccess}
          createdUsername={createdUsername}
          onOpenAuth={openAuth}
          onCloseAuth={closeAuth}
          onDismissMessage={() => setMessage('')}
          onSignInNow={signInWithNewAccount}
          onEnterDashboard={handleAuthSubmit}
        />
      )}
    </>
  )
}

export default App
