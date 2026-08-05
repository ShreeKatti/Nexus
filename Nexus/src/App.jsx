import { useState } from 'react'
import './App.css'

const DEMO_CREDENTIALS = {
  username: 'nexusadmin',
  password: 'nexus123',
}

function NexusLogo() {
  return (
    <div className="brand-row">
      <svg className="brand-logo" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" rx="42" fill="#0B1220" />
        <path d="M52 128C52 87.1309 85.1309 54 126 54H144V72H126C95.0721 72 70 97.0721 70 128V140H52V128Z" fill="#F97316" />
        <path d="M88 142H110V56H88V142Z" fill="#FB923C" />
        <path d="M120 56H142V142H120V56Z" fill="#F97316" />
        <path d="M92 154H144C146.209 154 148 155.791 148 158C148 160.209 146.209 162 144 162H92C89.7909 162 88 160.209 88 158C88 155.791 89.7909 154 92 154Z" fill="#334155" />
      </svg>
      <span className="brand-name">Nexus</span>
    </div>
  )
}

function LandingView({ mode, showAuth, message, messageType, onOpenAuth, onCloseAuth, onEnterDashboard }) {
  return (
    <div className="landing-shell">
      <div className="bg-grid" />

      <header className="landing-header">
        <NexusLogo />
      </header>

      <main className="landing-grid">
        <section className={`hero-copy ${showAuth ? 'blurred' : ''}`}>
          <p className="eyebrow">Operational intelligence for teams</p>
          <h1>Welcome to Nexus</h1>
          <p className="hero-subtext">
            Unified observability and digital experience monitoring for modern IT teams.
          </p>

          <div className="hero-actions">
            <button className="primary-btn large-btn" onClick={() => onOpenAuth('signup')}>Get Started</button>
            <button className="ghost-btn large-btn" onClick={() => onOpenAuth('signin')}>Sign In</button>
          </div>

        </section>

        {showAuth && (
          <div className="auth-popup-backdrop" onClick={onCloseAuth}>
            <section className="auth-panel" onClick={(event) => event.stopPropagation()}>
              <div className="auth-card">
                <button type="button" className="close-btn" onClick={onCloseAuth} aria-label="Close authentication panel">
                  ×
                </button>

                <div className="auth-tabs">
                  <button className={`tab-btn ${mode === 'signin' ? 'active' : ''}`} onClick={() => onOpenAuth('signin')}>Sign In</button>
                  <button className={`tab-btn ${mode === 'signup' ? 'active' : ''}`} onClick={() => onOpenAuth('signup')}>Sign Up</button>
                </div>

                <div className="form-header">
                  <h2>{mode === 'signin' ? 'Sign in to Nexus' : 'Create your Nexus account'}</h2>
                </div>

                {message && <p className={`auth-message ${messageType}`}>{message}</p>}

                <form onSubmit={onEnterDashboard} className="auth-form">
                  <label>
                    <span>Username</span>
                    <input name="username" type="text" placeholder="" required />
                  </label>

                  <label>
                    <span>Password</span>
                    <input name="password" type="password" placeholder="" required />
                  </label>

                  <div className="remember-row">
                    <label className="checkbox">
                      <input type="checkbox" defaultChecked />
                      <span>Remember me</span>
                    </label>
                    <a href="#" className="text-link">Forgot password?</a>
                  </div>

                  <button type="submit" className="primary-btn full-width">
                    {mode === 'signin' ? 'Continue' : 'Create account'}
                  </button>
                </form>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

function DashboardView({ onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [connectionsOpen, setConnectionsOpen] = useState(false)
  const [showConnectionForm, setShowConnectionForm] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const currentUser = JSON.parse(localStorage.getItem('nexus-demo-user') || '{}')
  const username = currentUser.username || 'Nexus'
  const userInitial = username.charAt(0).toUpperCase()

  const datasourceCards = [
    { name: 'InfluxDB', badge: 'DB' },
    { name: 'Elasticsearch', badge: 'ES' },
    { name: 'Alertmanager', badge: 'AM' },
    { name: 'Azure Monitor', badge: 'AZ' },
  ]

  return (
    <div className={`dashboard-body ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <NexusLogo />
        </div>

        <nav className="sidebar-menu">
          <a className="menu-item active" href="#">Home</a>

          <div className="connection-group">
            <button
              type="button"
              className={`menu-item connection-toggle ${connectionsOpen ? 'open' : ''}`}
              onClick={() => setConnectionsOpen((open) => !open)}
            >
              <span>Connections</span>
              <span className="dropdown-caret">{connectionsOpen ? '▾' : '▸'}</span>
            </button>

            {connectionsOpen && (
              <div className="connection-submenu">
                <button
                  type="button"
                  className="submenu-item"
                  onClick={() => setShowConnectionForm(true)}
                >
                  Add New Connection
                </button>
              </div>
            )}
          </div>

          <a className="menu-item" href="#">Datasource</a>
        </nav>
      </aside>

      <main className="main-area">
        <header className="top-toolbar">
          <div className="top-toolbar-left">
            <button className="nav-toggle" onClick={() => setSidebarOpen((open) => !open)}>
              ☰
            </button>
            <div className="breadcrumbs">Dashboard</div>
          </div>
          <div className="toolbar-controls">
            <input className="search-box" type="text" placeholder="Search..." />

            <div className="profile-menu-wrap">
              <button
                type="button"
                className="profile-chip"
                onClick={() => setProfileOpen((open) => !open)}
              >
                <span className="profile-avatar">{userInitial}</span>
              </button>

              {profileOpen && (
                <div className="profile-dropdown">
                  <button type="button" className="profile-dropdown-item" onClick={() => setProfileOpen(false)}>
                    <span className="profile-action-icon">👤</span>
                    <span>Account</span>
                  </button>
                  <button
                    type="button"
                    className="profile-dropdown-item"
                    onClick={() => {
                      setProfileOpen(false)
                      onLogout()
                    }}
                  >
                    <span className="profile-action-icon">⎋</span>
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {showConnectionForm && (
          <section className="connection-feature-card">
            <div className="connection-feature-head">
              <div>
                <h2>Add new connection</h2>
                <p>Browse and create new connections</p>
              </div>
            </div>

            <div className="connection-search-row">
              <div className="connection-search-box">
                <span className="search-icon">⌕</span>
                <input type="text" placeholder="Search connections" />
              </div>
            </div>

            <div className="connection-filter-row">
              <button type="button" className="filter-pill active">Data source</button>
            </div>

            <div className="connections-data-section">
              <div className="connection-section-title">
                <span>Data source</span>
              </div>

              <div className="connection-card-grid">
                {datasourceCards.map((card) => (
                  <article key={card.name} className="connection-card">
                    <div className="connection-card-left">
                      <div className="connection-logo">{card.badge}</div>
                      <span>{card.name}</span>
                    </div>
                    <div className="connection-check">✓</div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="monitor-shell empty-state" />
      </main>
    </div>
  )
}

function App() {
  const [view, setView] = useState('landing')
  const [mode, setMode] = useState('signin')
  const [showAuth, setShowAuth] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('error')

  const openAuth = (nextMode) => {
    setMode(nextMode)
    setShowAuth(true)
    setView('landing')
    setMessage('')
    setMessageType('error')
  }

  const closeAuth = () => {
    setShowAuth(false)
    setMessage('')
    setMessageType('error')
  }

  const handleLogout = () => {
    localStorage.removeItem('nexus-demo-user')
    setView('landing')
    setShowAuth(false)
    setMessage('')
    setMessageType('error')
  }

  const handleAuthSubmit = (event) => {
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
      const existingUsers = JSON.parse(localStorage.getItem('nexus-demo-users') || '[]')
      const userExists = existingUsers.some((entry) => entry.username === username)

      if (userExists) {
        setMessage('Username already exists. Please sign in or choose another username.')
        setMessageType('error')
        return
      }

      existingUsers.push({ username, password })
      localStorage.setItem('nexus-demo-users', JSON.stringify(existingUsers))
      localStorage.setItem('nexus-demo-user', JSON.stringify({ username, password }))

      setMode('signin')
      setMessage('Account created successfully. Please sign in.')
      setMessageType('success')
      form.reset()
      return
    }

    const persistedUsers = JSON.parse(localStorage.getItem('nexus-demo-users') || '[]')
    const isDemoUser = username === DEMO_CREDENTIALS.username && password === DEMO_CREDENTIALS.password
    const isPersistedUser = persistedUsers.some((entry) => entry.username === username && entry.password === password)

    if (!isDemoUser && !isPersistedUser) {
      setMessage('Invalid username or password.')
      setMessageType('error')
      return
    }

    localStorage.setItem('nexus-demo-user', JSON.stringify({ username, password }))
    setMessage('')
    setMessageType('error')
    setView('dashboard')
  }

  return (
    <>
      {view === 'dashboard' ? (
        <DashboardView onLogout={handleLogout} />
      ) : (
        <LandingView
          mode={mode}
          showAuth={showAuth}
          message={message}
          messageType={messageType}
          onOpenAuth={openAuth}
          onCloseAuth={closeAuth}
          onEnterDashboard={handleAuthSubmit}
        />
      )}
    </>
  )
}

export default App
