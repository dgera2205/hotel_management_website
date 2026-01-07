/**
 * Authentication Utilities Module
 *
 * This module provides authentication-related functions for the Hotel Management
 * System frontend. It handles login/logout operations, token management in
 * localStorage, and user profile retrieval.
 *
 * Token Storage Strategy:
 * - Tokens are stored in localStorage for persistence across page refreshes
 * - In-memory token (via setAuthToken) is used for API requests
 * - Both are synchronized during login/logout
 */

import { api, setAuthToken } from './api'

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Response structure from the login endpoint.
 */
interface AuthTokens {
  access_token: string   // JWT token for API authentication
  token_type: string     // Always "bearer"
  expires_in: number     // Token lifetime in seconds
}

/**
 * User profile structure returned by /auth/me endpoint.
 */
interface HotelUser {
  user_id: string        // Unique user identifier
  username: string       // Display name
  role: string           // User role (e.g., "hotel_admin")
}

// =============================================================================
// Authentication API Functions
// =============================================================================

/**
 * Authenticate with the hotel system using the shared password.
 *
 * On successful authentication, stores the token in both localStorage
 * and in-memory for immediate use.
 *
 * @param password - The shared hotel staff password
 * @param rememberMe - If true, token expires in 30 days; otherwise 24 hours
 * @returns Promise resolving to authentication tokens
 */
export async function loginHotel(password: string, rememberMe = false): Promise<AuthTokens> {
  const tokens = await api.post<AuthTokens>('/auth/login', {
    password,
    remember_me: rememberMe
  })

  // Store token for API requests and persistence
  setAuthToken(tokens.access_token)  // In-memory for current session
  setToken(tokens.access_token)       // localStorage for persistence

  return tokens
}

/**
 * Logout from the hotel system.
 *
 * Calls the logout endpoint to invalidate the session on the server side.
 * Note: Errors are silently ignored since the client-side cleanup happens
 * regardless via clearToken().
 */
export async function logoutHotel(): Promise<void> {
  try {
    await api.post('/auth/logout', {})
  } catch (error) {
    // Ignore logout errors - client will clear token anyway
  }
}

/**
 * Get the current authenticated user's profile.
 *
 * @returns Promise resolving to user profile data
 * @throws Error if not authenticated or token is invalid
 */
export async function getHotelUser(): Promise<HotelUser> {
  return api.get<HotelUser>('/auth/me')
}

/**
 * Verify if the current token is still valid.
 *
 * Useful for checking authentication status on app initialization.
 *
 * @returns Promise with authentication status and user data
 */
export async function verifyAuth(): Promise<{ authenticated: boolean; user: HotelUser }> {
  return api.get('/auth/verify')
}

// =============================================================================
// Token Storage Functions
// =============================================================================

/**
 * Retrieve the stored authentication token from localStorage.
 *
 * Returns null when running on the server (SSR) since localStorage
 * is not available in Node.js environment.
 *
 * @returns The stored JWT token or null if not found/unavailable
 */
export function getToken(): string | null {
  // Guard against server-side rendering where window is undefined
  if (typeof window === 'undefined') return null
  return localStorage.getItem('hotel_token')
}

/**
 * Store the authentication token in localStorage.
 *
 * @param token - JWT token to store
 */
export function setToken(token: string): void {
  localStorage.setItem('hotel_token', token)
}

/**
 * Clear the authentication token from all storage locations.
 *
 * Called during logout to ensure complete session cleanup.
 * Clears both localStorage (persistence) and in-memory (current session).
 */
export function clearToken(): void {
  localStorage.removeItem('hotel_token')
  setAuthToken(null)  // Clear in-memory token as well
}