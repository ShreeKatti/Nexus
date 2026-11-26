import { useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import { signIn, signUp } from './features/auth/authService.js'
import { clearStoredSession, getStoredSession, storeSession } from './features/auth/session.js'
import LandingPage from './pages/LandingPage.jsx'
import DashboardPage from './features/dashboard/DashboardPage.jsx'

function App() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const mode = pathname === '/signup' ? 'signup' : 'signin'
  const isAuthenticated = Boolean(getStoredSession())
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('error')
  const [showSignupSuccess, setShowSignupSuccess] = useState(false)
  const [createdUsername, setCreatedUsername] = useState('')

  const openAuth = (nextMode) => {
    navigate(nextMode === 'signup' ? '/signup' : '/signin')
    setMessage('')
    setMessageType('error')
    setShowSignupSuccess(false)
  }

  const closeAuth = () => {
    navigate('/home')
    setMessage('')
    setMessageType('error')
    setShowSignupSuccess(false)
  }

  const handleLogout = () => {
    clearStoredSession()
    navigate('/home')
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

        setCreatedUsername(data.username || username)
        setShowSignupSuccess(true)
        navigate('/signin')
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
      navigate('/dashboard')
    } catch {
      setMessage('Database API is not running. Please start the Python backend and try again.')
      setMessageType('error')
      return
    }
  }

  const signInWithNewAccount = () => {
    setShowSignupSuccess(false)
    setCreatedUsername('')
    navigate('/signin')
    setMessage('')
    setMessageType('error')
  }

  const renderLandingPage = (authVisible = false) => (
    <LandingPage
      mode={mode}
      showAuth={authVisible}
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
  )

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/home" element={renderLandingPage()} />
      <Route path="/signin" element={renderLandingPage(true)} />
      <Route path="/signup" element={renderLandingPage(true)} />
      <Route
        path="/dashboard/*"
        element={isAuthenticated ? <DashboardPage onLogout={handleLogout} /> : <Navigate to="/signin" replace />}
      />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}

export default App
