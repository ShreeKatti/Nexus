const getCacheKey = (userId) => `nexus-datasources:${userId}`

export const loadCachedDatasources = (userId) => {
  if (!userId) return []

  try {
    return JSON.parse(localStorage.getItem(getCacheKey(userId)) || '[]')
  } catch {
    return []
  }
}

export const cacheDatasources = (userId, datasources) => {
  if (!userId) return

  localStorage.setItem(getCacheKey(userId), JSON.stringify(datasources))
}
