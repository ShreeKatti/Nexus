import { useEffect, useState } from 'react'
import { API_BASE_URL, readApiResponse } from '../services/api.js'
import { getStoredSession } from '../features/auth/session.js'
import { DATASOURCE_CARDS, getProviderLogo } from '../data/datasources.js'
import { cacheDatasources, loadCachedDatasources } from '../features/datasources/storage.js'
import NexusLogo from '../components/brand/NexusLogo.jsx'

function DashboardPage({ onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [connectionsOpen, setConnectionsOpen] = useState(false)
  const [showConnectionForm, setShowConnectionForm] = useState(false)
  const [showDatasources, setShowDatasources] = useState(false)
  const [analysisData, setAnalysisData] = useState(null)
  const [analysisLoadingId, setAnalysisLoadingId] = useState(null)
  const [selectedDatasource, setSelectedDatasource] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [connectionSearch, setConnectionSearch] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [showDateRangePicker, setShowDateRangePicker] = useState(false)
  const [dateRange, setDateRange] = useState(null)
  const currentUser = getStoredSession() || {}
  const [savedDatasources, setSavedDatasources] = useState(() => loadCachedDatasources(currentUser.uniqueID))
  const username = currentUser.username || 'Nexus'
  const userInitial = username.charAt(0).toUpperCase()

  const openDatasourceConfiguration = (datasource) => {
    setSelectedDatasource(datasource)
    setConnectionStatus(null)
  }

  useEffect(() => {
    if (!currentUser.uniqueID) return

    let isCurrent = true
    const loadSavedDatasources = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/datasources?userId=${encodeURIComponent(currentUser.uniqueID)}`)
        const data = await readApiResponse(response)
        if (!response.ok || !isCurrent) return
        setSavedDatasources(data.datasources || [])
        cacheDatasources(currentUser.uniqueID, data.datasources || [])
      } catch {
        // Keep the local copy visible if the backend is temporarily unavailable.
      }
    }

    loadSavedDatasources()
    return () => { isCurrent = false }
  }, [currentUser.uniqueID])

  useEffect(() => {
    if (!connectionStatus) return
    const timer = setTimeout(() => {
      setConnectionStatus(null)
    }, 2000)
    return () => clearTimeout(timer)
  }, [connectionStatus])

  const editSavedDatasource = (datasource) => {
    const sourceTemplate = DATASOURCE_CARDS.find((card) => card.name === datasource.type) || DATASOURCE_CARDS.find((card) => card.name === datasource.name)
    setSelectedDatasource({
      ...(sourceTemplate || datasource),
      savedId: datasource.id,
      savedFromDatabase: datasource.databaseId === true,
      savedName: datasource.name,
      savedEndpoint: datasource.endpoint,
      savedSettings: datasource.settings || {},
      savedConfiguredAt: datasource.configuredAt,
    })
    setConnectionStatus(null)
    setShowDatasources(false)
    setShowConnectionForm(true)
  }

  const deleteSavedDatasource = async (datasource) => {
    const { id: datasourceId, databaseId } = datasource
    if (!currentUser.uniqueID) return

    if (!databaseId) {
      setSavedDatasources((sources) => {
        const nextSources = sources.filter((source) => source.id !== datasourceId)
        cacheDatasources(currentUser.uniqueID, nextSources)
        return nextSources
      })
      setConnectionStatus({ type: 'success', text: 'Data source deleted.' })
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/datasources/${datasourceId}?userId=${encodeURIComponent(currentUser.uniqueID)}`, {
        method: 'DELETE',
      })
      const data = await readApiResponse(response)
      if (!response.ok) {
        setConnectionStatus({ type: 'error', text: data.message || 'Unable to delete this data source.' })
        return
      }
      setSavedDatasources((sources) => {
        const nextSources = sources.filter((source) => source.id !== datasourceId)
        cacheDatasources(currentUser.uniqueID, nextSources)
        return nextSources
      })
    } catch {
      setConnectionStatus({ type: 'error', text: 'Database API is not running. The data source was not deleted.' })
    }
  }

  const analyseDatasource = async (datasource) => {
    if (!currentUser.uniqueID || analysisLoadingId) return
    setAnalysisLoadingId(datasource.id)
    setConnectionStatus(null)
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/datasources/${datasource.id}/analysis?userId=${encodeURIComponent(currentUser.uniqueID)}`,
      )
      const data = await readApiResponse(response)
      if (!response.ok) {
        setConnectionStatus({ type: 'error', text: data.message || 'Unable to analyse this data source.' })
        return
      }
      setAnalysisData(data)
      setShowDatasources(false)
      setShowConnectionForm(false)
      setSelectedDatasource(null)
      setConnectionStatus(null)
    } catch {
      setConnectionStatus({ type: 'error', text: 'Database API is not running. Unable to load analysis.' })
    } finally {
      setAnalysisLoadingId(null)
    }
  }

  const filteredDatasourceCards = DATASOURCE_CARDS.filter((datasource) => (
    datasource.name.toLowerCase().includes(connectionSearch.trim().toLowerCase())
  ))

  const returnToConnections = () => {
    setSelectedDatasource(null)
    setConnectionStatus(null)
  }

  const saveAndTestConnection = async (event) => {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const requiredFields = selectedDatasource.authType === 'cato'
      ? ['endpoint', 'apiKey', 'accountId', 'siteIds']
      : selectedDatasource.authType === 'site24x7'
        ? ['accessToken']
        : ['username', 'password']

    if (requiredFields.some((field) => !values.get(field)?.trim())) {
      setConnectionStatus({ type: 'error', text: 'Complete all required connection details before testing.' })
      return
    }

    const datasource = {
      id: selectedDatasource.savedId || `${selectedDatasource.name}-${Date.now()}`,
      name: values.get('name').trim(),
      type: selectedDatasource.name,
      endpoint: values.get('endpoint').trim(),
      logoUrl: selectedDatasource.logoUrl,
      settings: {
        isDefault: values.get('isDefault') === 'on',
        port: values.get('port') || '',
        database: values.get('database') || '',
        accountId: values.get('accountId') || '',
        siteIds: values.get('siteIds') || '',
        skipTlsValidation: values.get('skipTlsValidation') === 'on',
      },
      configuredAt: new Date().toLocaleString(),
      demoData: {
        hosts: 3,
        metrics: 12,
        status: 'Demo data imported',
      },
    }

    const cato = selectedDatasource.authType === 'cato'
      ? {
          CATO_API_URL: datasource.endpoint,
          CATO_API_KEY: values.get('apiKey')?.trim() || '',
          CATO_ACCOUNT_ID: values.get('accountId')?.trim() || '',
          CATO_SITE_IDS: values.get('siteIds')?.trim() || '',
        }
      : null

    const payload = {
      userId: currentUser.uniqueID,
      name: datasource.name,
      provider: datasource.type,
      endpoint: datasource.endpoint,
      logoUrl: datasource.logoUrl,
      settings: datasource.settings,
      secrets: {
        username: values.get('username') || '',
        password: values.get('password') || '',
        apiKey: cato ? '' : values.get('apiKey') || '',
        accessToken: values.get('accessToken') || '',
      },
      ...(cato ? { cato } : {}),
    }

    try {
      const isDatabaseEdit = Boolean(selectedDatasource.savedId && selectedDatasource.savedFromDatabase)
      const response = await fetch(
        isDatabaseEdit
          ? `${API_BASE_URL}/api/datasources/${selectedDatasource.savedId}`
          : `${API_BASE_URL}/api/datasources`,
        {
          method: isDatabaseEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )
      const data = await readApiResponse(response)
      if (!response.ok) {
        setConnectionStatus({ type: 'error', text: data.message || 'Unable to save this data source.' })
        return
      }

      const savedDatasource = data.datasource
      setSavedDatasources((sources) => {
        const nextSources = selectedDatasource.savedId
          ? sources.map((source) => (source.id === selectedDatasource.savedId ? savedDatasource : source))
          : [...sources, savedDatasource]
        cacheDatasources(currentUser.uniqueID, nextSources)
        return nextSources
      })
      setConnectionStatus({
        type: 'success',
        text: savedDatasource.type === 'Cato'
          ? 'Cato connection saved to dbo.NexusDataSources.'
          : 'Configuration saved.',
      })
    } catch {
      setConnectionStatus({ type: 'error', text: 'Database API is not running. The data source was not saved.' })
      return
    }
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
              setAnalysisData(null)
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
                    setAnalysisData(null)
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
              setAnalysisData(null)
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
            <div className="breadcrumbs">Hello, {username}</div>
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
                    className="connection-card"
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
                  <input name="name" type="text" defaultValue={selectedDatasource.savedName || selectedDatasource.name} required />
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
                  <input name="endpoint" type="text" defaultValue={selectedDatasource.savedEndpoint || selectedDatasource.endpointPlaceholder} />
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
                {selectedDatasource.authType === 'cato' ? (
                  <>
                    <label>
                      <span>Cato API key <em>*</em></span>
                      <input name="apiKey" type="password" placeholder="Enter your Cato API key" autoComplete="off" required />
                      <small>Your API key is encrypted before database storage and is never returned to the browser.</small>
                    </label>
                    <div className="config-field-grid">
                      <label>
                        <span>Cato account ID <em>*</em></span>
                        <input name="accountId" type="text" placeholder="3741" defaultValue={selectedDatasource.savedSettings?.accountId || ''} required />
                      </label>
                      <label>
                        <span>Cato site ID(s) <em>*</em></span>
                        <input name="siteIds" type="text" placeholder="81551 or 81551, 81552" defaultValue={selectedDatasource.savedSettings?.siteIds || ''} required />
                      </label>
                    </div>
                  </>
                ) : selectedDatasource.authType === 'site24x7' ? (
                  <label>
                    <span>OAuth access token <em>*</em></span>
                    <input name="accessToken" type="password" defaultValue={selectedDatasource.savedId ? '' : 'demo-site24x7-access-token'} placeholder="Enter your Site24x7 OAuth access token" autoComplete="off" required />
                    <small>Fake demo token, stored encrypted. Analyse data reads local database samples and does not call Site24x7.</small>
                  </label>
                ) : selectedDatasource.authType === 'apiKey' ? (
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

            {connectionStatus && (
              <div className={`connection-status ${connectionStatus.type}`} role="status">
                {connectionStatus.text}
              </div>
            )}

            {savedDatasources.length ? (
              <div className="saved-datasource-grid">
                {savedDatasources.map((datasource) => (
                  <article key={datasource.id} className="saved-datasource-card">
                    <div className="saved-datasource-logo">
                      <img src={getProviderLogo(datasource.type)} alt={`${datasource.type} logo`} />
                    </div>
                    <div className="saved-datasource-details">
                      <h3>{datasource.name}</h3>
                      <span>{datasource.type}</span>
                      <small>{datasource.endpoint}</small>
                    </div>
                    <div className="saved-datasource-status">
                      <div className="saved-datasource-status-row">
                        <span>Configured</span>
                        <button
                          type="button"
                          className="datasource-edit-btn"
                          onClick={() => editSavedDatasource(datasource)}
                          aria-label={`Edit ${datasource.name}`}
                          title="Edit data source"
                        >
                          <span aria-hidden="true">✎</span> Edit
                        </button>
                      </div>
                      <small>{datasource.configuredAt}</small>
                      <button
                        type="button"
                        className="datasource-delete-btn"
                        onClick={() => deleteSavedDatasource(datasource)}
                        aria-label={`Delete ${datasource.name}`}
                        title="Delete data source"
                      >
                        <span aria-hidden="true">×</span> Delete
                      </button>
                      {datasource.type?.toLowerCase() === 'site24x7' && (
                        <button
                          type="button"
                          className="datasource-analyse-btn"
                          onClick={() => analyseDatasource(datasource)}
                          disabled={analysisLoadingId !== null}
                        >
                          {analysisLoadingId === datasource.id ? 'Loading…' : 'Analyse data'}
                        </button>
                      )}
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

        {analysisData && !showConnectionForm && !showDatasources && (
          <section className="monitor-shell analysis-dashboard">
            <div className="overview-header">
              <div>
                <p className="overview-eyebrow">Site24x7 · Database analysis</p>
                <h1>{analysisData.datasource.name}</h1>
                <p>Sample monitoring measurements loaded from the Nexus database.</p>
              </div>
              <div className="overview-actions">
                <button type="button" className="overview-action" onClick={() => setAnalysisData(null)}>
                  Back to overview
                </button>
              </div>
            </div>

            {(() => {
              const averageFor = (metricName) => {
                const values = analysisData.metrics.filter((metric) => metric.name === metricName)
                if (!values.length) return '—'
                return (values.reduce((sum, metric) => sum + metric.value, 0) / values.length).toFixed(1)
              }
              const warningCount = analysisData.metrics.filter((metric) => metric.status === 'Warning').length
              return (
                <>
                  <div className="overview-stats analysis-stats">
                    <article className="overview-stat">
                      <span className="stat-label">Average CPU</span>
                      <strong>{averageFor('CPU utilization')}%</strong>
                      <span className="stat-caption">Across monitored hosts</span>
                    </article>
                    <article className="overview-stat">
                      <span className="stat-label">Average memory</span>
                      <strong>{averageFor('Memory usage')}%</strong>
                      <span className="stat-caption">Across monitored hosts</span>
                    </article>
                    <article className="overview-stat">
                      <span className="stat-label">Availability</span>
                      <strong>{averageFor('Availability')}%</strong>
                      <span className="stat-caption">Mean availability</span>
                    </article>
                    <article className="overview-stat">
                      <span className="stat-label">Warnings</span>
                      <strong className={warningCount ? 'analysis-warning' : 'status-ok'}>{warningCount}</strong>
                      <span className="stat-caption">Metric readings to review</span>
                    </article>
                  </div>

                  <section className="analysis-table-section">
                    <div className="analysis-table-heading">
                      <div>
                        <p className="overview-eyebrow">Measurements</p>
                        <h2>Host telemetry</h2>
                      </div>
                      <span>{analysisData.metrics.length} readings · {new Set(analysisData.metrics.map((metric) => metric.host)).size} hosts</span>
                    </div>
                    <div className="analysis-table-wrap">
                      <table className="analysis-table">
                        <thead>
                          <tr><th>Host</th><th>Metric</th><th>Value</th><th>Status</th><th>Recorded</th></tr>
                        </thead>
                        <tbody>
                          {analysisData.metrics.map((metric) => (
                            <tr key={`${metric.host}-${metric.name}`}>
                              <td>{metric.host}</td>
                              <td>{metric.name}</td>
                              <td>{metric.value}{metric.unit === '%' ? '%' : ` ${metric.unit}`}</td>
                              <td><span className={`analysis-status ${metric.status.toLowerCase()}`}>{metric.status}</span></td>
                              <td>{metric.recordedAt}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </>
              )
            })()}
          </section>
        )}

        {!analysisData && !showConnectionForm && !showDatasources && (
          <section className="monitor-shell empty-state">
            <div className="overview-header">
              <div>
                <p className="overview-eyebrow">Observability workspace</p>
                <h1>Your systems, clearly in view.</h1>
                <p>Connect a data source to start bringing your infrastructure into focus.</p>
              </div>
              <div className="overview-actions">
                <button
                  type="button"
                  className="overview-action date-range-btn"
                  onClick={() => setShowDateRangePicker((open) => !open)}
                >
                  <span>📅</span>
                  {dateRange ? `${dateRange.start} → ${dateRange.end}` : 'Date range'}
                </button>
              </div>
            </div>

            {showDateRangePicker && (
              <div className="date-range-popup" onClick={(event) => event.stopPropagation()}>
                <div className="date-range-popup-head">
                  <h3>Select date range</h3>
                  <button
                    type="button"
                    className="date-range-close"
                    onClick={() => setShowDateRangePicker(false)}
                    aria-label="Close date range picker"
                  >
                    ×
                  </button>
                </div>
                <div className="date-range-fields">
                  <label>
                    <span>From</span>
                    <input
                      type="date"
                      defaultValue={dateRange?.start || ''}
                      onChange={(event) => setDateRange((range) => ({ ...(range || {}), start: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>To</span>
                    <input
                      type="date"
                      defaultValue={dateRange?.end || ''}
                      onChange={(event) => setDateRange((range) => ({ ...(range || {}), end: event.target.value }))}
                    />
                  </label>
                </div>
                <div className="date-range-actions">
                  <button
                    type="button"
                    className="date-range-clear"
                    onClick={() => {
                      setDateRange(null)
                      setShowDateRangePicker(false)
                    }}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    className="date-range-apply"
                    onClick={() => setShowDateRangePicker(false)}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}

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

            {dateRange && (
              <section className="insights-section">
                <div className="insights-header">
                  <div>
                    <p className="overview-eyebrow">Insights</p>
                    <h2>Telemetry from {dateRange.start} to {dateRange.end}</h2>
                    <span>Showing metrics across {savedDatasources.length || 1} data source{savedDatasources.length === 1 ? '' : 's'}</span>
                  </div>
                </div>

                <div className="insights-grid">
                  <article className="insight-card">
                    <div className="insight-card-head">
                      <h3>CPU Utilization</h3>
                      <span className="insight-badge">%</span>
                    </div>
                    <div className="insight-chart insight-chart-cpu">
                      <div className="insight-bar" style={{ height: '42%' }} />
                      <div className="insight-bar" style={{ height: '58%' }} />
                      <div className="insight-bar" style={{ height: '35%' }} />
                      <div className="insight-bar" style={{ height: '72%' }} />
                      <div className="insight-bar" style={{ height: '48%' }} />
                      <div className="insight-bar" style={{ height: '64%' }} />
                      <div className="insight-bar" style={{ height: '38%' }} />
                      <div className="insight-bar" style={{ height: '55%' }} />
                      <div className="insight-bar" style={{ height: '80%' }} />
                      <div className="insight-bar" style={{ height: '46%' }} />
                      <div className="insight-bar" style={{ height: '62%' }} />
                      <div className="insight-bar" style={{ height: '50%' }} />
                    </div>
                    <div className="insight-chart-labels">
                      <span>Start</span>
                      <span>End</span>
                    </div>
                  </article>

                  <article className="insight-card">
                    <div className="insight-card-head">
                      <h3>Memory Usage</h3>
                      <span className="insight-badge">GB</span>
                    </div>
                    <div className="insight-chart insight-chart-memory">
                      <div className="insight-bar" style={{ height: '30%' }} />
                      <div className="insight-bar" style={{ height: '45%' }} />
                      <div className="insight-bar" style={{ height: '38%' }} />
                      <div className="insight-bar" style={{ height: '62%' }} />
                      <div className="insight-bar" style={{ height: '50%' }} />
                      <div className="insight-bar" style={{ height: '70%' }} />
                      <div className="insight-bar" style={{ height: '44%' }} />
                      <div className="insight-bar" style={{ height: '58%' }} />
                      <div className="insight-bar" style={{ height: '66%' }} />
                      <div className="insight-bar" style={{ height: '40%' }} />
                      <div className="insight-bar" style={{ height: '52%' }} />
                      <div className="insight-bar" style={{ height: '60%' }} />
                    </div>
                    <div className="insight-chart-labels">
                      <span>Start</span>
                      <span>End</span>
                    </div>
                  </article>

                  <article className="insight-card">
                    <div className="insight-card-head">
                      <h3>Network Traffic</h3>
                      <span className="insight-badge">Mbps</span>
                    </div>
                    <div className="insight-chart insight-chart-network">
                      <div className="insight-bar" style={{ height: '55%' }} />
                      <div className="insight-bar" style={{ height: '40%' }} />
                      <div className="insight-bar" style={{ height: '68%' }} />
                      <div className="insight-bar" style={{ height: '35%' }} />
                      <div className="insight-bar" style={{ height: '75%' }} />
                      <div className="insight-bar" style={{ height: '48%' }} />
                      <div className="insight-bar" style={{ height: '60%' }} />
                      <div className="insight-bar" style={{ height: '42%' }} />
                      <div className="insight-bar" style={{ height: '70%' }} />
                      <div className="insight-bar" style={{ height: '52%' }} />
                      <div className="insight-bar" style={{ height: '38%' }} />
                      <div className="insight-bar" style={{ height: '64%' }} />
                    </div>
                    <div className="insight-chart-labels">
                      <span>Start</span>
                      <span>End</span>
                    </div>
                  </article>

                  <article className="insight-card">
                    <div className="insight-card-head">
                      <h3>Disk I/O</h3>
                      <span className="insight-badge">IOPS</span>
                    </div>
                    <div className="insight-chart insight-chart-disk">
                      <div className="insight-bar" style={{ height: '48%' }} />
                      <div className="insight-bar" style={{ height: '62%' }} />
                      <div className="insight-bar" style={{ height: '36%' }} />
                      <div className="insight-bar" style={{ height: '70%' }} />
                      <div className="insight-bar" style={{ height: '44%' }} />
                      <div className="insight-bar" style={{ height: '58%' }} />
                      <div className="insight-bar" style={{ height: '66%' }} />
                      <div className="insight-bar" style={{ height: '40%' }} />
                      <div className="insight-bar" style={{ height: '54%' }} />
                      <div className="insight-bar" style={{ height: '72%' }} />
                      <div className="insight-bar" style={{ height: '46%' }} />
                      <div className="insight-bar" style={{ height: '60%' }} />
                    </div>
                    <div className="insight-chart-labels">
                      <span>Start</span>
                      <span>End</span>
                    </div>
                  </article>
                </div>
              </section>
            )}

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

export default DashboardPage
