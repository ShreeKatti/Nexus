import { Navigate, Route, Routes } from 'react-router-dom'
import ConnectionsPage from './pages/ConnectionsPage.jsx'
import DashboardOverviewPage from './pages/DashboardOverviewPage.jsx'
import DatasourceAnalysisPage from './pages/DatasourceAnalysisPage.jsx'
import DatasourceConfigPage from './pages/DatasourceConfigPage.jsx'
import SavedDatasourcesPage from './pages/SavedDatasourcesPage.jsx'

function DashboardRoutes({ dashboard }) {
  const {
    analysisData,
    connectionSearch,
    connectionStatus,
    dashboardOverview,
    deleteSavedDatasource,
    editSavedDatasource,
    filteredDatasourceCards,
    openDatasourceConfiguration,
    overviewError,
    navigate,
    analyseDatasource,
    analysisLoadingId,
    returnToConnections,
    saveAndTestConnection,
    savedDatasources,
    selectedDatasource,
    setAnalysisData,
    setConnectionSearch,
  } = dashboard

  return (
    <Routes>
      <Route
        index
        element={
          <DashboardOverviewPage
            savedDatasources={savedDatasources}
            dashboardOverview={dashboardOverview}
            overviewError={overviewError}
            navigate={navigate}
          />
        }
      />
      <Route
        path="datasources"
        element={
          <ConnectionsPage
            connectionSearch={connectionSearch}
            setConnectionSearch={setConnectionSearch}
            filteredDatasourceCards={filteredDatasourceCards}
            openDatasourceConfiguration={openDatasourceConfiguration}
          />
        }
      />
      <Route
        path="integrations/:providerSlug"
        element={
          selectedDatasource ? (
            <DatasourceConfigPage
              selectedDatasource={selectedDatasource}
              returnToConnections={returnToConnections}
              saveAndTestConnection={saveAndTestConnection}
              connectionStatus={connectionStatus}
            />
          ) : (
            <Navigate to="/dashboard/datasources" replace />
          )
        }
      />
      <Route
        path="saved-datasources"
        element={
          <SavedDatasourcesPage
            connectionStatus={connectionStatus}
            savedDatasources={savedDatasources}
            navigate={navigate}
            editSavedDatasource={editSavedDatasource}
            deleteSavedDatasource={deleteSavedDatasource}
            analyseDatasource={analyseDatasource}
            analysisLoadingId={analysisLoadingId}
          />
        }
      />
      <Route
        path="analysis"
        element={
          analysisData ? (
            <DatasourceAnalysisPage
              analysisData={analysisData}
              connectionStatus={connectionStatus}
              setAnalysisData={setAnalysisData}
            />
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default DashboardRoutes
