import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import toast from 'react-hot-toast'

import { authApi } from '@/api/auth.api'
import { useAuthStore } from '@/stores/auth.store'
import type { User } from '@/types'


interface LoginCredentials {
  email: string
  password: string
  rememberMe: boolean
}

interface AuthContextValue {
  loading: boolean
  isInitialized: boolean
  login: (credentials: LoginCredentials) => Promise<void>
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

  const login = useCallback(async (credentials: LoginCredentials) => {
    const res = await authApi.login(credentials.email, credentials.password, credentials.rememberMe)
    const { user, tokens } = res.data.data
    setAuth(user, tokens.accessToken, tokens.refreshToken, credentials.rememberMe)
  }, [setAuth])

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
    } catch {
      toast.error('Failed to refresh user data')
    } finally {
      setLoading(false)
    }
  }, [])

  const value: AuthContextValue = {
    loading,
    isInitialized,
    login,
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
