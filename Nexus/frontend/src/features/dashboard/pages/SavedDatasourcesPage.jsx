import { getProviderLogo } from '../../datasources/catalog.js'

function SavedDatasourcesPage({ connectionStatus, savedDatasources, navigate, editSavedDatasource, deleteSavedDatasource, analyseDatasource, analysisLoadingId }) {
  return (
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
                  navigate('/dashboard/datasources')
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
                      {datasource.type?.toLowerCase() === 'site24x7' ? (
                        <>
                          <span>Live monitoring enabled</span>
                          <small>Monitor data syncs automatically</small>
                        </>
                      ) : (
                        <>
                          <span>{datasource.demoData?.status || 'Demo data imported'}</span>
                          <small>{datasource.demoData?.hosts || 3} hosts · {datasource.demoData?.metrics || 12} metrics</small>
                        </>
                      )}
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
  )
}

export default SavedDatasourcesPage
