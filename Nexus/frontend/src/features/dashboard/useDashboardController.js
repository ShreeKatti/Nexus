import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { API_BASE_URL, readApiResponse } from '../../shared/services/api.js'
import { getStoredSession } from '../auth/session.js'
import { DATASOURCE_CARDS, getDatasourceSlug } from '../datasources/catalog.js'
import { cacheDatasources, loadCachedDatasources } from '../datasources/storage.js'

function useDashboardController() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const providerSlug = pathname.match(/^\/dashboard\/integrations\/([^/]+)$/)?.[1] || null
  const routeDatasource = DATASOURCE_CARDS.find((card) => card.slug === providerSlug) || null
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [connectionsOpen, setConnectionsOpen] = useState(false)
  const showConnectionForm = pathname === '/dashboard/datasources' || Boolean(providerSlug)
  const showDatasources = pathname === '/dashboard/saved-datasources'
  const [analysisData, setAnalysisData] = useState(null)
  const [analysisLoadingId, setAnalysisLoadingId] = useState(null)
  const [editedDatasource, setEditedDatasource] = useState(null)
  const selectedDatasource = editedDatasource?.slug === providerSlug ? editedDatasource : routeDatasource
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [connectionSearch, setConnectionSearch] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const currentUser = getStoredSession() || {}
  const [savedDatasources, setSavedDatasources] = useState(() => loadCachedDatasources(currentUser.uniqueID))
  const [dashboardOverview, setDashboardOverview] = useState({
    monitors: { total: 0, up: 0, alerts: 0 },
    availability: null,
    lastSyncedAt: null,
  })
  const [overviewError, setOverviewError] = useState('')
  const username = currentUser.username || 'Nexus'
  const userInitial = username.charAt(0).toUpperCase()

  useEffect(() => {
    if (providerSlug && !routeDatasource) {
      navigate('/dashboard/datasources', { replace: true })
    }
  }, [navigate, providerSlug, routeDatasource])

  const openDatasourceConfiguration = (datasource) => {
    setConnectionStatus(null)
    navigate(`/dashboard/integrations/${datasource.slug || getDatasourceSlug(datasource.name)}`)
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
    if (!currentUser.uniqueID) return

    let isCurrent = true
    let timer
    const refreshOverview = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/dashboard/overview?userId=${encodeURIComponent(currentUser.uniqueID)}`,
        )
        const data = await readApiResponse(response)
        if (!response.ok) {
          throw new Error(data.message || 'Unable to load the live monitoring summary.')
        }
        if (isCurrent) {
          setDashboardOverview(data)
          setOverviewError('')
        }
      } catch (error) {
        if (isCurrent) {
          setOverviewError(error.message || 'Unable to load the live monitoring summary.')
        }
      } finally {
        if (isCurrent) timer = setTimeout(refreshOverview, 30000)
      }
    }

    refreshOverview()
    return () => {
      isCurrent = false
      clearTimeout(timer)
    }
  }, [currentUser.uniqueID])

  useEffect(() => {
    const datasourceId = analysisData?.datasource?.id
    if (pathname !== '/dashboard/analysis' || !datasourceId || !currentUser.uniqueID) return

    let isCurrent = true
    let timer
    const refreshAnalysis = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/datasources/${datasourceId}/analysis?userId=${encodeURIComponent(currentUser.uniqueID)}`,
        )
        const data = await readApiResponse(response)
        if (!response.ok) {
          throw new Error(data.message || 'Unable to refresh Site24x7 data.')
        }
        if (isCurrent) {
          setAnalysisData(data)
          setConnectionStatus(null)
        }
      } catch (error) {
        if (isCurrent) {
          setConnectionStatus({
            type: 'error',
            text: error.message || 'Unable to refresh Site24x7 data.',
          })
        }
      } finally {
        if (isCurrent) timer = setTimeout(refreshAnalysis, 30000)
      }
    }

    timer = setTimeout(refreshAnalysis, 30000)
    return () => {
      isCurrent = false
      clearTimeout(timer)
    }
  }, [analysisData?.datasource?.id, currentUser.uniqueID, pathname])

  useEffect(() => {
    if (!connectionStatus) return
    const timer = setTimeout(() => {
      setConnectionStatus(null)
    }, 2000)
    return () => clearTimeout(timer)
  }, [connectionStatus])

  const editSavedDatasource = (datasource) => {
    const sourceTemplate = DATASOURCE_CARDS.find((card) => card.name === datasource.type) || DATASOURCE_CARDS.find((card) => card.name === datasource.name)
    setEditedDatasource({
      ...(sourceTemplate || datasource),
      slug: sourceTemplate?.slug || getDatasourceSlug(datasource.type),
      savedId: datasource.id,
      savedFromDatabase: datasource.databaseId === true,
      savedName: datasource.name,
      savedEndpoint: datasource.endpoint,
      savedSettings: datasource.settings || {},
      savedConfiguredAt: datasource.configuredAt,
    })
    setConnectionStatus(null)
    navigate(`/dashboard/integrations/${sourceTemplate?.slug || getDatasourceSlug(datasource.type)}`)
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
      setEditedDatasource(null)
      setConnectionStatus(null)
      navigate('/dashboard/analysis')
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
    setEditedDatasource(null)
    setConnectionStatus(null)
    navigate('/dashboard/datasources')
  }

  const saveAndTestConnection = async (event) => {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const requiredFields = selectedDatasource.authType === 'cato'
      ? ['endpoint', 'apiKey', 'accountId', 'siteIds']
      : selectedDatasource.authType === 'site24x7'
        ? ['endpoint', 'clientId', 'clientSecret', 'refreshToken']
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
        clientId: values.get('clientId') || '',
        clientSecret: values.get('clientSecret') || '',
        refreshToken: values.get('refreshToken') || '',
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
          : savedDatasource.type === 'Site24x7'
            ? 'Site24x7 connected. Live monitor data was saved to the database.'
          : 'Configuration saved.',
      })
    } catch {
      setConnectionStatus({ type: 'error', text: 'Database API is not running. The data source was not saved.' })
      return
    }
    setEditedDatasource(null)
    navigate('/dashboard/saved-datasources')
  }

  return {
    analysisData, analysisLoadingId, analyseDatasource,
    connectionSearch, connectionStatus, connectionsOpen,
    dashboardOverview, deleteSavedDatasource, editSavedDatasource,
    filteredDatasourceCards, navigate, openDatasourceConfiguration,
    pathname, profileOpen, providerSlug, returnToConnections,
    overviewError, routeDatasource, saveAndTestConnection, savedDatasources,
    selectedDatasource, setAnalysisData, setConnectionSearch,
    setConnectionStatus, setConnectionsOpen,
    setEditedDatasource, setProfileOpen,
    setSidebarOpen, showConnectionForm, showDatasources,
    sidebarOpen, userInitial, username,
  }
}

export default useDashboardController
