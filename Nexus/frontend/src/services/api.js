export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export const readApiResponse = async (response) => {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return response.json()
  }
  const message = await response.text()
  return {
    message: contentType.includes('text/html')
      ? 'The backend endpoint was not found. Restart the Python backend and try again.'
      : message,
  }
}
