/**
 * Authentication Context Module
 *
 * This module provides React Context-based authentication state management
 * for the Hotel Management System. It handles:
 * - Global authentication state accessible from any component
 * - Automatic token restoration on app initialization
 * - Login and logout functionality
 * - Loading states during authentication checks
 *
 * Usage:
 *   // In a component
 *   const { user, isAuthenticated, login, logout } = useAuth()
 *
 *   // Protected route pattern
 *   if (!isAuthenticated) redirect('/login')
 */

'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { loginHotel, logoutHotel, getHotelUser, getToken, clearToken } from '@/lib/auth'
import { setAuthToken } from '@/lib/api'

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * User profile structure stored in context.
 */
interface User {
  user_id: string    // Unique user identifier
  username: string   // Display name
  role: string       // User role (e.g., "hotel_admin")
}

/**
 * Shape of the authentication context value.
 * Provides user state and authentication actions to consumers.
 */
interface AuthContextType {
  user: User | null                                           // Current user or null if not authenticated
  token: string | null                                        // JWT token for API requests
  isAuthenticated: boolean                                    // Convenience boolean for auth status
  isLoading: boolean                                          // True during initial auth check
  login: (password: string, rememberMe?: boolean) => Promise<void>  // Login function
  logout: () => void                                          // Logout function
}

// Create context with null default (will be provided by AuthProvider)
const AuthContext = createContext<AuthContextType | null>(null)

// =============================================================================
// Custom Hook
// =============================================================================

/**
 * Hook to access authentication context.
 *
 * Must be used within an AuthProvider component tree.
 * Throws an error if used outside the provider for easy debugging.
 *
 * @returns Authentication context with user state and actions
 * @throws Error if used outside of AuthProvider
 *
 * @example
 * function ProtectedComponent() {
 *   const { user, isAuthenticated, logout } = useAuth()
 *   if (!isAuthenticated) return <Navigate to="/login" />
 *   return <div>Welcome, {user.username}!</div>
 * }
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// =============================================================================
// Provider Component
// =============================================================================

/**
 * Authentication provider component.
 *
 * Wraps the application to provide authentication state and actions
 * to all child components. Handles:
 * - Automatic token restoration from localStorage on mount
 * - User profile fetching after token restoration
 * - Token cleanup if restoration fails (expired/invalid token)
 *
 * @param children - Child components to render within the provider
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // State for current authenticated user (null if not authenticated)
  const [user, setUser] = useState<User | null>(null)

  // State for JWT token
  const [token, setToken] = useState<string | null>(null)

  // Loading state during initial authentication check
  const [isLoading, setIsLoading] = useState(true)

  // Effect to restore authentication state on app initialization
  useEffect(() => {
    const storedToken = getToken()
    if (storedToken) {
      // Token found in localStorage - attempt to restore session
      setAuthToken(storedToken)  // Set token for API requests
      setToken(storedToken)      // Store token in state

      // Verify token and get user profile
      getHotelUser()
        .then(setUser)  // Token valid - set user
        .catch(() => {
          // Token invalid/expired - clear it
          clearToken()
          setToken(null)
        })
        .finally(() => setIsLoading(false))
    } else {
      // No stored token - not authenticated
      setIsLoading(false)
    }
  }, [])

  /**
   * Login with password and optional remember me flag.
   * On success, fetches and stores user profile.
   */
  const login = useCallback(async (password: string, rememberMe = false) => {
    await loginHotel(password, rememberMe)
    const storedToken = getToken()
    if (storedToken) {
      setToken(storedToken)
    }
    const userProfile = await getHotelUser()
    setUser(userProfile)
  }, [])

  /**
   * Logout the current user.
   * Clears token and resets user state.
   */
  const logout = useCallback(async () => {
    await logoutHotel()
    clearToken()
    setToken(null)
    setUser(null)
  }, [])

  // Provide authentication state and actions to children
  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}