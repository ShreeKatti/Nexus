function DashboardOverviewPage({ dashboardOverview, overviewError, savedDatasources, navigate }) {
  return (
          <section className="monitor-shell empty-state">
            <div className="overview-header">
              <div>
                <p className="overview-eyebrow">Observability workspace</p>
                <h1>Your systems, clearly in view.</h1>
                <p>Connect a data source to start bringing your infrastructure into focus.</p>
              </div>
            </div>

            {overviewError && (
              <div className="connection-status error" role="status">{overviewError}</div>
            )}

            <div className="overview-stats">
              <article className="overview-stat">
                <span className="stat-label">Data sources</span>
                <strong>{savedDatasources.length}</strong>
                <span className="stat-caption">{savedDatasources.length ? 'Ready to use' : 'Connect your first source'}</span>
              </article>
              <article className="overview-stat">
                <span className="stat-label">Site24x7 monitors</span>
                <strong>{dashboardOverview.monitors.total}</strong>
                <span className="stat-caption">
                  {dashboardOverview.lastSyncedAt
                    ? `Last sync: ${new Date(`${dashboardOverview.lastSyncedAt.replace(' ', 'T')}Z`).toLocaleTimeString()}`
                    : 'Awaiting the first live sync'}
                </span>
              </article>
              <article className="overview-stat">
                <span className="stat-label">Monitors down / unknown</span>
                <strong className={dashboardOverview.monitors.alerts ? 'analysis-warning' : 'status-ok'}>
                  {dashboardOverview.monitors.alerts}
                </strong>
                <span className="stat-caption">
                  {dashboardOverview.monitors.up} monitors up
                </span>
              </article>
              <article className="overview-stat">
                <span className="stat-label">Availability</span>
                <strong>{dashboardOverview.availability == null ? '—' : `${dashboardOverview.availability}%`}</strong>
                <span className="stat-caption">Average across current monitors</span>
              </article>
            </div>

            {dashboardOverview.lastSyncedAt && (
              <section className="insights-section">
                <div className="insights-header">
                  <div>
                    <p className="overview-eyebrow">Live telemetry</p>
                    <h2>Latest Site24x7 monitor snapshot</h2>
                    <span>
                      Latest snapshot: {new Date(`${dashboardOverview.lastSyncedAt.replace(' ', 'T')}Z`).toLocaleString()}.
                      The summary refreshes automatically; open a saved Site24x7 connection for per-monitor details.
                    </span>
                  </div>
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
              <button type="button" onClick={() => navigate('/dashboard/datasources')}>Browse connections →</button>
            </div>
          </section>
  )
}

export default DashboardOverviewPage
