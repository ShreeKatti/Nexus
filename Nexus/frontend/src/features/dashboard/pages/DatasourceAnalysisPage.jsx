function DatasourceAnalysisPage({ analysisData, connectionStatus, setAnalysisData }) {
  return (
          <section className="monitor-shell analysis-dashboard">
            <div className="overview-header">
              <div>
                <p className="overview-eyebrow">Site24x7 · Live monitoring</p>
                <h1>{analysisData.datasource.name}</h1>
                <p>
                  Live monitor data from Nexus, refreshed every 30 seconds.
                  {analysisData.datasource.lastSyncedAt
                    ? ` Last sync: ${new Date(`${analysisData.datasource.lastSyncedAt.replace(' ', 'T')}Z`).toLocaleString()}.`
                    : ' Waiting for the first Site24x7 sync.'}
                </p>
              </div>
              <div className="overview-actions">
                <button type="button" className="overview-action" onClick={() => setAnalysisData(null)}>
                  Back to overview
                </button>
              </div>
            </div>

            {connectionStatus?.type === 'error' && (
              <div className="connection-status error" role="status">{connectionStatus.text}</div>
            )}

            {(() => {
              const monitorStatuses = analysisData.metrics.filter((metric) => metric.name === 'Monitor status')
              const availableMetrics = analysisData.metrics.filter((metric) => metric.name === 'Availability')
              const averageFor = (metricName) => {
                const values = analysisData.metrics.filter((metric) => metric.name === metricName)
                if (!values.length) return '—'
                return (values.reduce((sum, metric) => sum + metric.value, 0) / values.length).toFixed(1)
              }
              const upCount = monitorStatuses.filter((metric) => metric.status === 'UP').length
              const downCount = monitorStatuses.filter((metric) => metric.status !== 'UP').length
              return (
                <>
                  <div className="overview-stats analysis-stats">
                    <article className="overview-stat">
                      <span className="stat-label">Monitors</span>
                      <strong>{monitorStatuses.length}</strong>
                      <span className="stat-caption">Currently monitored</span>
                    </article>
                    <article className="overview-stat">
                      <span className="stat-label">Up</span>
                      <strong className="status-ok">{upCount}</strong>
                      <span className="stat-caption">Healthy monitors</span>
                    </article>
                    <article className="overview-stat">
                      <span className="stat-label">Down / unknown</span>
                      <strong className={downCount ? 'analysis-warning' : 'status-ok'}>{downCount}</strong>
                      <span className="stat-caption">Monitors needing review</span>
                    </article>
                    <article className="overview-stat">
                      <span className="stat-label">Availability</span>
                      <strong>{averageFor('Availability')}{availableMetrics.length ? '%' : ''}</strong>
                      <span className="stat-caption">Mean over the selected Site24x7 period</span>
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
                              <td>{metric.name === 'Monitor status'
                                ? metric.status
                                : `${metric.value}${metric.unit === '%' ? '%' : ` ${metric.unit}`}`}</td>
                              <td>
                                <span className={`analysis-status ${metric.status === 'UP' || metric.status === 'Healthy' ? 'healthy' : 'warning'}`}>
                                  {metric.status}
                                </span>
                              </td>
                              <td>{metric.recordedAt}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!analysisData.metrics.length && (
                        <p className="analysis-empty-state">No live monitor data has been synced yet.</p>
                      )}
                    </div>
                  </section>
                </>
              )
            })()}
          </section>
  )
}

export default DatasourceAnalysisPage
