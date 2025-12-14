import { api, setAuthToken } from './api'

interface AuthTokens {
  access_token: string
  token_type: string
  expires_in: number
}

interface HotelUser {
  user_id: string
  username: string
  role: string
}

export async function loginHotel(password: string, rememberMe = false): Promise<AuthTokens> {
  const tokens = await api.post<AuthTokens>('/auth/login', {
    password,
    remember_me: rememberMe
  })
  setAuthToken(tokens.access_token)
  setToken(tokens.access_token)
  return tokens
}

export async function logoutHotel(): Promise<void> {
  try {
    await api.post('/auth/logout')
  } catch (error) {
    // Ignore errors on logout
  }
}

export async function getHotelUser(): Promise<HotelUser> {
  return api.get<HotelUser>('/auth/me')
}

export async function verifyAuth(): Promise<{ authenticated: boolean; user: HotelUser }> {
  return api.get('/auth/verify')
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('hotel_token')
}

export function setToken(token: string): void {
  localStorage.setItem('hotel_token', token)
}

export function clearToken(): void {
  localStorage.removeItem('hotel_token')
  setAuthToken(null)
}