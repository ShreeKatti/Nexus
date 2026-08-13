import { useState } from 'react'
import './App.css'
import solarWindsLogo from './assets/integrations/solarwinds.png'
import catoLogo from './assets/integrations/cato.png'
import site24x7Logo from './assets/integrations/site24x7.png'
import microsoftSqlServerLogo from './assets/integrations/microsoft-sql-server.png'

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

function LandingView({ mode, showAuth, message, messageType, showSignupSuccess, createdUsername, onOpenAuth, onCloseAuth, onDismissMessage, onSignInNow, onEnterDashboard }) {
  return (
    <div className="landing-shell">
      <div className="bg-grid" />

      <header className="landing-header">
        <NexusLogo />
      </header>

      <main className="landing-grid">
        <section className={`hero-copy ${showAuth ? 'blurred' : ''}`}>
          <p className="eyebrow">AI Powered Wissen Platform</p>
          <h1>Welcome to Wissen Nexus </h1>
          <p className="hero-subtext">
            Unified observability and digital experience for modern IT.
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

                <div className="form-header">
                  <h2>{mode === 'signin' ? 'Sign in to Nexus' : 'Create your Nexus account'}</h2>
                </div>

                {message && (
                  <div className={`auth-message ${messageType}`} role="alert">
                    <span>{message}</span>
                    <button type="button" onClick={onDismissMessage} aria-label="Dismiss message">×</button>
                  </div>
                )}

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

                {showSignupSuccess && (
                  <div className="signup-success-popup" role="dialog" aria-modal="true" aria-labelledby="signup-success-title">
                    <div className="success-icon" aria-hidden="true">✓</div>
                    <h3 id="signup-success-title">Account created!</h3>
                    <p>
                      Your Nexus account for <strong>{createdUsername}</strong> is ready. Please sign in with the username and password you just created.
                    </p>
                    <button type="button" className="primary-btn full-width" onClick={onSignInNow}>
                      Sign in now
                    </button>
                  </div>
                )}
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
  const [showDatasources, setShowDatasources] = useState(false)
  const [selectedDatasource, setSelectedDatasource] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [connectionSearch, setConnectionSearch] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [savedDatasources, setSavedDatasources] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('nexus-datasources') || '[]')
    } catch {
      return []
    }
  })

  const currentUser = JSON.parse(localStorage.getItem('nexus-demo-user') || '{}')
  const username = currentUser.username || 'Nexus'
  const userInitial = username.charAt(0).toUpperCase()

  const datasourceCards = [
    {
      name: 'SolarWinds SWIS API',
      logoUrl: solarWindsLogo,
      authType: 'basic',
      description: 'Connect to the SolarWinds Information Service (SWIS) API.',
      endpointLabel: 'Server URL',
      endpointPlaceholder: 'https://solarwinds.example.com',
      endpointHint: 'Enter only the scheme and host. Nexus uses the SWIS API on port 17774 automatically.',
    },
    {
      name: 'Cato',
      logoUrl: catoLogo,
      authType: 'basic',
      description: 'Connect to your Cato SASE account with an API key.',
      endpointLabel: 'API URL',
      endpointPlaceholder: 'https://api.catonetworks.com/api/v1',
      endpointHint: 'Use the Cato API endpoint for your account and a read-only API key where possible.',
    },
    {
      name: 'Site24x7',
      logoUrl: site24x7Logo,
      authType: 'basic',
      description: 'Import monitoring data from Site24x7 using an API key.',
      endpointLabel: 'API URL',
      endpointPlaceholder: 'https://www.site24x7.com/api',
      endpointHint: 'Use the Site24x7 API endpoint that applies to your account region.',
    },
    {
      name: 'Microsoft SQL Server',
      logoUrl: microsoftSqlServerLogo,
      authType: 'basic',
      description: 'Connect to a Microsoft SQL Server database.',
      endpointLabel: 'Server',
      endpointPlaceholder: 'sql.example.com',
      endpointHint: 'Provide the SQL Server host name or IP address. Use a dedicated read-only account.',
    },
  ]

  const openDatasourceConfiguration = (datasource) => {
    setSelectedDatasource(datasource)
    setConnectionStatus(null)
  }

  const filteredDatasourceCards = datasourceCards.filter((datasource) => (
    datasource.name.toLowerCase().includes(connectionSearch.trim().toLowerCase())
  ))

  const returnToConnections = () => {
    setSelectedDatasource(null)
    setConnectionStatus(null)
  }

  const saveAndTestConnection = (event) => {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const requiredFields = ['username', 'password']

    if (requiredFields.some((field) => !values.get(field)?.trim())) {
      setConnectionStatus({ type: 'error', text: 'Complete all required connection details before testing.' })
      return
    }

    setConnectionStatus({
      type: 'success',
      text: 'Configuration saved.',
    })

    const datasource = {
      id: `${selectedDatasource.name}-${Date.now()}`,
      name: values.get('name').trim(),
      type: selectedDatasource.name,
      endpoint: values.get('endpoint').trim(),
      logoUrl: selectedDatasource.logoUrl,
      configuredAt: new Date().toLocaleString(),
      demoData: {
        hosts: 3,
        metrics: 12,
        status: 'Demo data imported',
      },
    }

    setSavedDatasources((sources) => {
      const nextSources = [...sources.filter((source) => source.name !== datasource.name), datasource]
      localStorage.setItem('nexus-datasources', JSON.stringify(nextSources))
      return nextSources
    })
    setSelectedDatasource(null)
    setShowConnectionForm(false)
    setShowDatasources(true)
  }

  return (
    <div
      className={`dashboard-body ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}
      onClick={() => setProfileOpen(false)}
    >
      <aside className="sidebar">
        <div className="sidebar-top">
          <NexusLogo />
        </div>

        <nav className="sidebar-menu">
          <button
            type="button"
            className={`menu-item ${!showConnectionForm && !showDatasources ? 'active' : ''}`}
            onClick={() => {
              setShowConnectionForm(false)
              setShowDatasources(false)
              setConnectionsOpen(false)
              setSelectedDatasource(null)
              setConnectionStatus(null)
            }}
          >
            Home
          </button>

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
                  onClick={() => {
                    setShowConnectionForm(true)
                    setShowDatasources(false)
                    setConnectionsOpen(false)
                    setSelectedDatasource(null)
                    setConnectionStatus(null)
                    setConnectionSearch('')
                  }}
                >
                  Add New Connection
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className={`menu-item ${showDatasources ? 'active' : ''}`}
            onClick={() => {
              setShowDatasources(true)
              setShowConnectionForm(false)
              setSelectedDatasource(null)
              setConnectionStatus(null)
              setConnectionsOpen(false)
            }}
          >
            Datasource
          </button>
        </nav>
      </aside>

      <main className="main-area">
        <header className="top-toolbar">
          <div className="top-toolbar-left">
            <button
              className="nav-toggle"
              onClick={() => {
                setSidebarOpen((open) => !open)
                setConnectionsOpen(false)
              }}
            >
              ☰
            </button>
            <div className="breadcrumbs">Dashboard</div>
          </div>
          <div className="toolbar-controls">
            <input className="search-box" type="text" placeholder="Search..." />

            <div className="profile-menu-wrap" onClick={(event) => event.stopPropagation()}>
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

        {showConnectionForm && !selectedDatasource && (
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
                <input
                  type="text"
                  value={connectionSearch}
                  onChange={(event) => setConnectionSearch(event.target.value)}
                  placeholder="Search connections"
                  aria-label="Search connections"
                />

                {connectionSearch && (
                  <div className="connection-suggestions">
                    {filteredDatasourceCards.length ? (
                      filteredDatasourceCards.map((card) => (
                        <button
                          type="button"
                          key={card.name}
                          className="connection-suggestion"
                          onClick={() => openDatasourceConfiguration(card)}
                        >
                          <img src={card.logoUrl} alt="" />
                          <span>{card.name}</span>
                        </button>
                      ))
                    ) : (
                      <p>No matching connections found.</p>
                    )}
                  </div>
                )}
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
                {filteredDatasourceCards.map((card) => (
                  <button
                    type="button"
                    key={card.name}
                    className={`connection-card ${card.name === 'SolarWinds SWIS API' ? 'connection-card-wide' : ''}`}
                    onClick={() => openDatasourceConfiguration(card)}
                  >
                    <div className="connection-card-left">
                      <div className="connection-logo">
                        <img src={card.logoUrl} alt={`${card.name} logo`} />
                      </div>
                      <span>{card.name}</span>
                    </div>
                    <div className="connection-check">✓</div>
                  </button>
                ))}
                {!filteredDatasourceCards.length && (
                  <p className="connection-empty-results">Try a different connection name.</p>
                )}
              </div>
            </div>
          </section>
        )}

        {showConnectionForm && selectedDatasource && (
          <section className="datasource-config-card">
            <button type="button" className="back-to-connections" onClick={returnToConnections}>
              ← All connections
            </button>

            <div className="datasource-config-heading">
              <div className="datasource-config-logo">
                <img src={selectedDatasource.logoUrl} alt={`${selectedDatasource.name} logo`} />
              </div>
              <div>
                <p>DATA SOURCE</p>
                <h2>Configure {selectedDatasource.name}</h2>
                <span>{selectedDatasource.description}</span>
              </div>
            </div>

            <form className="datasource-config-form" onSubmit={saveAndTestConnection}>
              <div className="config-section">
                <h3>Settings</h3>
                <label>
                  <span>Name <em>*</em></span>
                  <input name="name" type="text" defaultValue={selectedDatasource.name} required />
                  <small>A unique name for this data source in Nexus.</small>
                </label>
                <label className="config-switch-row">
                  <span>
                    <strong>Default data source</strong>
                    <small>Use this source by default for new dashboards.</small>
                  </span>
                  <input name="isDefault" type="checkbox" />
                </label>
              </div>

              <div className="config-section">
                <h3>Connection</h3>
                <label>
                  <span>{selectedDatasource.endpointLabel}</span>
                  <input name="endpoint" type="text" defaultValue={selectedDatasource.endpointPlaceholder} />
                  <small>{selectedDatasource.endpointHint}</small>
                </label>

                {selectedDatasource.authType === 'sql' && (
                  <div className="config-field-grid">
                    <label>
                      <span>Port</span>
                      <input name="port" type="number" placeholder="1433" />
                    </label>
                    <label>
                      <span>Database</span>
                      <input name="database" type="text" placeholder="master" />
                    </label>
                  </div>
                )}
              </div>

              <div className="config-section">
                <h3>Authentication</h3>
                {selectedDatasource.authType === 'apiKey' ? (
                  <label>
                    <span>API key <em>*</em></span>
                    <input name="apiKey" type="password" placeholder="Enter API key" required />
                    <small>Use an API key with the minimum read permissions needed.</small>
                  </label>
                ) : (
                  <div className="config-field-grid">
                    <label>
                      <span>Username <em>*</em></span>
                      <input name="username" type="text" autoComplete="username" required />
                    </label>
                    <label>
                      <span>Password <em>*</em></span>
                      <input name="password" type="password" autoComplete="current-password" required />
                    </label>
                  </div>
                )}
                <label className="config-check-row">
                  <input name="skipTlsValidation" type="checkbox" />
                  <span>Skip TLS certificate validation</span>
                </label>
              </div>

              {connectionStatus && (
                <div className={`connection-status ${connectionStatus.type}`} role="status">
                  {connectionStatus.text}
                </div>
              )}

              <div className="config-actions">
                <button type="button" className="config-cancel" onClick={returnToConnections}>Cancel</button>
                <button type="submit" className="config-save">Save &amp; test</button>
              </div>
            </form>
          </section>
        )}

        {showDatasources && (
          <section className="datasource-list-card">
            <div className="datasource-list-header">
              <div>
                <p>CONNECTIONS</p>
                <h2>Data sources</h2>
                <span>Manage the data sources available to your Nexus dashboards.</span>
              </div>
              <button
                type="button"
                className="overview-action"
                onClick={() => {
                  setShowDatasources(false)
                  setShowConnectionForm(true)
                }}
              >
                <span>+</span> Add data source
              </button>
            </div>

            {savedDatasources.length ? (
              <div className="saved-datasource-grid">
                {savedDatasources.map((datasource) => (
                  <article key={datasource.id} className="saved-datasource-card">
                    <div className="saved-datasource-logo">
                      <img src={datasource.logoUrl} alt={`${datasource.type} logo`} />
                    </div>
                    <div className="saved-datasource-details">
                      <h3>{datasource.name}</h3>
                      <span>{datasource.type}</span>
                      <small>{datasource.endpoint}</small>
                    </div>
                    <div className="saved-datasource-status">
                      <span>Configured</span>
                      <small>{datasource.configuredAt}</small>
                    </div>
                    <div className="saved-datasource-demo">
                      <span>{datasource.demoData?.status || 'Demo data imported'}</span>
                      <small>{datasource.demoData?.hosts || 3} hosts · {datasource.demoData?.metrics || 12} metrics</small>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="datasource-empty-state">
                <div>+</div>
                <h3>No data sources yet</h3>
                <p>Add a connection, enter its authentication details, and save it here.</p>
              </div>
            )}
          </section>
        )}

        {!showConnectionForm && !showDatasources && (
          <section className="monitor-shell empty-state">
            <div className="overview-header">
              <div>
                <p className="overview-eyebrow">Observability workspace</p>
                <h1>Hello, {username}</h1>
                <p>Connect a data source to start bringing your infrastructure into focus.</p>
              </div>
              {/* <button type="button" className="overview-action" onClick={() => setShowConnectionForm(true)}>
                <span>+</span> Add connection
              </button> */}
            </div>

            <div className="overview-stats">
              <article className="overview-stat">
                <span className="stat-label">Data sources</span>
                <strong>{savedDatasources.length}</strong>
                <span className="stat-caption">{savedDatasources.length ? 'Ready to use' : 'Connect your first source'}</span>
              </article>
              <article className="overview-stat">
                <span className="stat-label">Services monitored</span>
                <strong>0</strong>
                <span className="stat-caption">Awaiting telemetry</span>
              </article>
              <article className="overview-stat">
                <span className="stat-label">Active alerts</span>
                <strong className="status-ok">0</strong>
                <span className="stat-caption">Everything looks quiet</span>
              </article>
            </div>

            <div className="getting-started-card">
              <div className="getting-started-icon">N</div>
              <div>
                <span>GET STARTED</span>
                <h2>Bring your signals together</h2>
                <p>Connect InfluxDB, Elasticsearch, Alertmanager, Azure Monitor, and more.</p>
              </div>
              <button type="button" onClick={() => setShowConnectionForm(true)}>Browse connections →</button>
            </div>
          </section>
        )}
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
    localStorage.removeItem('nexus-demo-user')
    setView('landing')
    setShowAuth(false)
    setMessage('')
    setMessageType('error')
    setShowSignupSuccess(false)
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
      setCreatedUsername(username)
      setShowSignupSuccess(true)
      form.reset()
      return
    }

    const persistedUsers = JSON.parse(localStorage.getItem('nexus-demo-users') || '[]')
    const demoUsernameMatches = username === DEMO_CREDENTIALS.username
    const storedUser = persistedUsers.find((entry) => entry.username === username)
    const isDemoUser = demoUsernameMatches && password === DEMO_CREDENTIALS.password
    const isPersistedUser = storedUser?.password === password

    if (!isDemoUser && !isPersistedUser) {
      setMessage(
        demoUsernameMatches || storedUser
          ? 'Incorrect password. Please try again.'
          : 'No account was found with this username. Please create an account first.',
      )
      setMessageType('error')
      return
    }

    localStorage.setItem('nexus-demo-user', JSON.stringify({ username, password }))
    setMessage('')
    setMessageType('error')
    setView('dashboard')
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
        <DashboardView onLogout={handleLogout} />
      ) : (
        <LandingView
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
