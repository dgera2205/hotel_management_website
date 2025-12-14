'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { loginHotel, logoutHotel, getHotelUser, getToken, setToken, clearToken } from '@/lib/auth'
import { setAuthToken } from '@/lib/api'

interface User {
  user_id: string
  username: string
  role: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (password: string, rememberMe?: boolean) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedToken = getToken()
    if (storedToken) {
      setAuthToken(storedToken)
      getHotelUser()
        .then(setUser)
        .catch(() => {
          clearToken()
        })
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = useCallback(async (password: string, rememberMe = false) => {
    await loginHotel(password, rememberMe)
    const userProfile = await getHotelUser()
    setUser(userProfile)
  }, [])

  const logout = useCallback(async () => {
    await logoutHotel()
    clearToken()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
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