// API URL - uses nginx proxy in docker, direct URL in development
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api'

let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

export function getAuthToken(): string | null {
  return authToken
}

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || errorData.error || `API Error: ${response.status}`)
  }

  return response.json()
}

export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint),
  post: <T>(endpoint: string, data: unknown) => apiRequest<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
}
