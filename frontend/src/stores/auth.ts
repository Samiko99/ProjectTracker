import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiFetch, ApiError } from '../api/client'

export interface AuthUser {
  id: string
  email: string
  name: string
}

interface AuthResponse {
  user: AuthUser
  accessToken: string
  refreshToken: string
}

const LS_USER = 'auth.user'
const LS_ACCESS = 'auth.accessToken'
const LS_REFRESH = 'auth.refreshToken'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const accessToken = ref<string | null>(null)
  const refreshToken = ref<string | null>(null)

  const isAuthenticated = computed(() => !!accessToken.value && !!user.value)

  function persist() {
    if (user.value) localStorage.setItem(LS_USER, JSON.stringify(user.value))
    else localStorage.removeItem(LS_USER)
    if (accessToken.value) localStorage.setItem(LS_ACCESS, accessToken.value)
    else localStorage.removeItem(LS_ACCESS)
    if (refreshToken.value) localStorage.setItem(LS_REFRESH, refreshToken.value)
    else localStorage.removeItem(LS_REFRESH)
  }

  function setSession(res: AuthResponse) {
    user.value = res.user
    accessToken.value = res.accessToken
    refreshToken.value = res.refreshToken
    persist()
  }

  function clearSession() {
    user.value = null
    accessToken.value = null
    refreshToken.value = null
    persist()
  }

  // Načtení z localStorage při startu aplikace
  function init() {
    const u = localStorage.getItem(LS_USER)
    user.value = u ? (JSON.parse(u) as AuthUser) : null
    accessToken.value = localStorage.getItem(LS_ACCESS)
    refreshToken.value = localStorage.getItem(LS_REFRESH)
  }

  async function register(email: string, password: string, name: string) {
    const res = await apiFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: { email, password, name },
    })
    setSession(res)
    return res.user
  }

  async function login(email: string, password: string) {
    const res = await apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    setSession(res)
    return res.user
  }

  async function logout() {
    if (refreshToken.value) {
      await apiFetch('/auth/logout', {
        method: 'POST',
        body: { refreshToken: refreshToken.value },
      }).catch(() => {})
    }
    clearSession()
  }

  // Obnova access tokenu pomocí refresh tokenu (rotace)
  async function doRefresh(): Promise<boolean> {
    if (!refreshToken.value) return false
    try {
      const res = await apiFetch<AuthResponse>('/auth/refresh', {
        method: 'POST',
        body: { refreshToken: refreshToken.value },
      })
      setSession(res)
      return true
    } catch {
      clearSession()
      return false
    }
  }

  /**
   * Autentizované volání API. Při 401 zkusí jednou obnovit token a zopakovat.
   */
  async function authedFetch<T = unknown>(
    path: string,
    options: { method?: string; body?: unknown } = {},
  ): Promise<T> {
    if (!accessToken.value) throw new ApiError(401, 'Nepřihlášen')
    try {
      return await apiFetch<T>(path, { ...options, token: accessToken.value })
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        const ok = await doRefresh()
        if (ok) {
          return await apiFetch<T>(path, {
            ...options,
            token: accessToken.value,
          })
        }
      }
      throw e
    }
  }

  return {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    init,
    register,
    login,
    logout,
    authedFetch,
  }
})
