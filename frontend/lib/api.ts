/**
 * API Client Module
 *
 * This module provides a centralized HTTP client for making API requests to the
 * FastAPI backend. It handles authentication token management and provides
 * type-safe request methods.
 *
 * Features:
 * - Automatic JWT token injection in Authorization header
 * - Configurable API URL via environment variable
 * - Error handling with meaningful error messages
 * - Type-safe generic request methods
 *
 * Usage:
 *   import { api, setAuthToken } from '@/lib/api'
 *   setAuthToken(token) // Set token after login
 *   const data = await api.get<User[]>('/users')
 */

// Base API URL configuration
// In Docker: Uses nginx proxy at /api (defined in NEXT_PUBLIC_API_URL)
// In development: Falls back to /api which is proxied by nginx
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api'

// In-memory storage for the current authentication token
// This is set during login and used for all subsequent requests
let authToken: string | null = null

/**
 * Set the authentication token for API requests.
 * Called after successful login to enable authenticated requests.
 *
 * @param token - JWT access token or null to clear authentication
 */
export function setAuthToken(token: string | null) {
  authToken = token
}

/**
 * Get the current authentication token.
 *
 * @returns Current JWT token or null if not authenticated
 */
export function getAuthToken(): string | null {
  return authToken
}

/**
 * Make an authenticated API request.
 *
 * This is the core function that handles all HTTP requests to the backend.
 * It automatically adds authentication headers and handles error responses.
 *
 * @template T - Expected response type
 * @param endpoint - API endpoint path (e.g., '/rooms/', '/bookings/1')
 * @param options - Standard fetch options (method, body, headers, etc.)
 * @returns Promise resolving to the typed response data
 * @throws Error with message from API or generic error for failed requests
 *
 * @example
 * const rooms = await apiRequest<Room[]>('/rooms/')
 * const booking = await apiRequest<Booking>('/bookings/1', { method: 'DELETE' })
 */
export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Build request headers with JSON content type
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  // Add Bearer token if authenticated
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  // Make the request to the backend
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  // Handle error responses
  if (!response.ok) {
    // Try to extract error message from response body
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || errorData.error || `API Error: ${response.status}`)
  }

  // Parse and return JSON response
  return response.json()
}

/**
 * Convenience API client with pre-configured methods for common operations.
 *
 * Provides a cleaner interface for GET and POST requests.
 *
 * @example
 * const rooms = await api.get<Room[]>('/rooms/')
 * const newRoom = await api.post<Room>('/rooms/', roomData)
 */
export const api = {
  /**
   * Make a GET request to the specified endpoint.
   * @template T - Expected response type
   */
  get: <T>(endpoint: string) => apiRequest<T>(endpoint),

  /**
   * Make a POST request with JSON body to the specified endpoint.
   * @template T - Expected response type
   */
  post: <T>(endpoint: string, data: unknown) => apiRequest<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
}
