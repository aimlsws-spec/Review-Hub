import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { toast } from 'react-hot-toast'

import { authApi } from '@/api/auth.api'
import { merchantApi } from '@/api/merchant.api'
import { useAuthStore } from '@/stores/auth.store'
import type { LoginChallenge, LoginResponse, User } from '@/types'


interface LoginCredentials {
  email: string
  password: string
  rememberMe: boolean
}

interface AuthContextValue {
  loading: boolean
  isInitialized: boolean
  /** Signs in. Resolves to null once signed in, or to the challenge to finish with verifyDevice for a new browser. */
  login: (credentials: LoginCredentials) => Promise<LoginChallenge | null>
  /** Finishes a sign-in from a new browser with the code that was sent. */
  verifyDevice: (challenge: LoginChallenge, code: string, rememberMe: boolean) => Promise<void>
  resendDeviceCode: (challenge: LoginChallenge) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  user: User | null
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, setAuth, logout: storeLogout } = useAuthStore()

  // Start as loading when a persisted session exists so guards never flash
  const hasPersistedSession = useAuthStore.getState().isAuthenticated
  const [loading, setLoading] = useState(hasPersistedSession)
  const [isInitialized, setIsInitialized] = useState(false)

  // Run once on mount to verify the persisted session is still valid
  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      if (useAuthStore.getState().accessToken && useAuthStore.getState().isAuthenticated) {
        try {
          const { data } = await authApi.getMe()
          useAuthStore.getState().setUser(data.data)
        } catch {
          useAuthStore.getState().logout()
        } finally {
          if (mounted) setLoading(false)
        }
      }
      if (mounted) setIsInitialized(true)
    }

    initAuth()
    return () => {
      mounted = false
    }
  }, [])

  const finishLogin = useCallback(async (session: LoginResponse, rememberMe: boolean) => {
    const { user, tokens } = session

    // The request interceptor reads the access token from the auth store, so
    // it has to land there before any authenticated call (getProfile below)
    // can succeed — otherwise that request goes out unauthenticated and
    // silently fails, leaving `merchant` permanently null for the session.
    useAuthStore.getState().setTokens(tokens.accessToken, tokens.refreshToken)

    let merchant = null
    try {
      const mRes = await merchantApi.getProfile()
      merchant = mRes.data.data
    } catch {
      // ignore
    }
    setAuth(user, merchant, tokens.accessToken, tokens.refreshToken, rememberMe)
  }, [setAuth])

  const login = useCallback(async (credentials: LoginCredentials) => {
    const res = await authApi.login(credentials.email, credentials.password, credentials.rememberMe)
    const data = res.data.data
    if ('requiresVerification' in data) return data
    await finishLogin(data, credentials.rememberMe)
    return null
  }, [finishLogin])

  const verifyDevice = useCallback(async (challenge: LoginChallenge, code: string, rememberMe: boolean) => {
    const res = await authApi.verifyDevice(challenge.challengeToken, code)
    await finishLogin(res.data.data, rememberMe)
  }, [finishLogin])

  const resendDeviceCode = useCallback(async (challenge: LoginChallenge) => {
    await authApi.resendDeviceCode(challenge.challengeToken)
  }, [])

  const logout = useCallback(async () => {
    try { 
      await authApi.logout()
    } catch {
      // ignore
    } finally {
      storeLogout()
    }
  }, [storeLogout])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await authApi.getMe()
      useAuthStore.getState().setUser(data.data)
    } catch (error) {
      toast.error('Failed to refresh user data')
    } finally {
      setLoading(false)
    }
  }, [])

  const value: AuthContextValue = {
    loading,
    isInitialized,
    login,
    verifyDevice,
    resendDeviceCode,
    logout,
    refresh,
    user,
    isAuthenticated,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
