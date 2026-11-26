import NexusLogo from '../../shared/components/brand/NexusLogo.jsx'
import DashboardRoutes from './DashboardRoutes.jsx'

function DashboardLayout({ dashboard, onLogout }) {
  const {
    connectionsOpen, navigate, profileOpen, setAnalysisData,
    setConnectionSearch, setConnectionStatus, setConnectionsOpen,
    setEditedDatasource, setProfileOpen, setSidebarOpen,
    showConnectionForm, showDatasources, sidebarOpen, userInitial, username,
  } = dashboard

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
              setConnectionsOpen(false)
              setEditedDatasource(null)
              setConnectionStatus(null)
              navigate('/dashboard')
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
                    setConnectionsOpen(false)
                    setEditedDatasource(null)
                    setConnectionStatus(null)
                    setConnectionSearch('')
                    navigate('/dashboard/datasources')
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
              setEditedDatasource(null)
              setConnectionStatus(null)
              setConnectionsOpen(false)
              navigate('/dashboard/saved-datasources')
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

        <DashboardRoutes dashboard={dashboard} />
      </main>
    </div>
  )
}

export default DashboardLayout
