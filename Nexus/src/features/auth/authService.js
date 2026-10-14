import { API_BASE_URL, readApiResponse } from '../../services/api.js'

const submitCredentials = async (endpoint, credentials) => {
  const response = await fetch(`${API_BASE_URL}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })

  return {
    ok: response.ok,
    data: await readApiResponse(response),
  }
}

export const signUp = (username, password) => (
  submitCredentials('signup', { username, password })
)

export const signIn = (username, password) => (
  submitCredentials('login', { username, password })
)
