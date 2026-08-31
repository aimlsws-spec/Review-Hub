import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import type { User } from '@/types'

const STORAGE_KEY = 'rh-admin-auth'
const REMEMBER_KEY = 'rh-admin-remember'

/**
 * Dynamic storage adapter: delegates to localStorage when "remember me" is set,
 * otherwise sessionStorage. The flag itself is always written to localStorage so
 * it survives the current tab but is cleared on logout.
 */
const dynamicStorage = {
  getItem: (name: string) => {
    const remember = localStorage.getItem(REMEMBER_KEY) === 'true'
    return (remember ? localStorage : sessionStorage).getItem(name)
  },
  setItem: (name: string, value: string) => {
    const remember = localStorage.getItem(REMEMBER_KEY) === 'true'
    ;(remember ? localStorage : sessionStorage).setItem(name, value)
  },
  removeItem: (name: string) => {
    localStorage.removeItem(name)
    sessionStorage.removeItem(name)
  },
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean

  setAuth: (user: User, accessToken: string, refreshToken: string, rememberMe?: boolean) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  setUser: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken, rememberMe = false) => {
        // Write the remember flag BEFORE persist writes state so dynamicStorage picks it up
        if (rememberMe) {
          localStorage.setItem(REMEMBER_KEY, 'true')
        } else {
          localStorage.removeItem(REMEMBER_KEY)
        }
        set({ user, accessToken, refreshToken, isAuthenticated: true })
      },

      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),

      setUser: (user) => set({ user }),

      logout: () => {
        localStorage.removeItem(REMEMBER_KEY)
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        })
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => dynamicStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
