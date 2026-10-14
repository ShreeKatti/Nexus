export const getStoredSession = () => {
  try {
    const user = JSON.parse(sessionStorage.getItem('nexus-demo-user') || 'null')
    return user?.username ? user : null
  } catch {
    sessionStorage.removeItem('nexus-demo-user')
    return null
  }
}

export const storeSession = ({ uniqueID, username }) => {
  sessionStorage.setItem('nexus-demo-user', JSON.stringify({ uniqueID, username }))
}

export const clearStoredSession = () => {
  sessionStorage.removeItem('nexus-demo-user')
}
