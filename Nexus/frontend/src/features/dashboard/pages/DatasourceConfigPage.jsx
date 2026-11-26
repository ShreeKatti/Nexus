function DatasourceConfigPage({ selectedDatasource, returnToConnections, saveAndTestConnection, connectionStatus }) {
  return (
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
                  <span>{selectedDatasource.endpointLabel}{selectedDatasource.authType === 'site24x7' && <em> *</em>}</span>
                  <input name="endpoint" type="text" defaultValue={selectedDatasource.savedEndpoint || selectedDatasource.endpointPlaceholder} required={selectedDatasource.authType === 'site24x7'} />
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
                  <>
                    <label>
                      <span>OAuth client ID <em>*</em></span>
                      <input name="clientId" type="text" placeholder="Enter your Site24x7 OAuth client ID" autoComplete="off" required />
                    </label>
                    <label>
                      <span>OAuth client secret <em>*</em></span>
                      <input name="clientSecret" type="password" placeholder="Enter your Site24x7 OAuth client secret" autoComplete="new-password" required />
                    </label>
                    <label>
                      <span>OAuth refresh token <em>*</em></span>
                      <input name="refreshToken" type="password" placeholder="Enter your Site24x7 OAuth refresh token" autoComplete="off" required />
                      <small>Use your own OAuth app credentials with permission to read monitors and availability for the selected data center. Credentials are encrypted by the backend and never returned to the browser. Re-enter them when editing.</small>
                    </label>
                  </>
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
  )
}

export default DatasourceConfigPage
