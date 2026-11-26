import DashboardLayout from './DashboardLayout.jsx'
import useDashboardController from './useDashboardController.js'

function DashboardPage({ onLogout }) {
  const dashboard = useDashboardController()
  return <DashboardLayout dashboard={dashboard} onLogout={onLogout} />
}

export default DashboardPage
