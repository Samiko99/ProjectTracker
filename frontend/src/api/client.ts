// HTTP klient pro komunikaci s backendem.
// Base URL lze přepsat v localStorage (klíč 'apiBaseUrl') — užitečné pro VPS.

// V produkci (Docker) servíruje frontend nginx, který /api proxuje na backend
// → stačí relativní '/api' (same-origin). Ve vývoji běží backend na portu 3001.
const isProd = Boolean(import.meta.env?.PROD)
const DEFAULT_BASE = isProd ? '/api' : 'http://localhost:3001/api'

export function getApiBaseUrl(): string {
  return localStorage.getItem('apiBaseUrl') || DEFAULT_BASE
}

export function setApiBaseUrl(url: string): void {
  localStorage.setItem('apiBaseUrl', url.replace(/\/$/, ''))
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

interface FetchOptions {
  method?: string
  body?: unknown
  token?: string | null
}

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { method = 'GET', body, token } = options

  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${getApiBaseUrl()}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Server není dostupný (zkontroluj připojení)')
  }

  let data: unknown = null
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!res.ok) {
    const msg =
      (data as { error?: string } | null)?.error ??
      `Chyba serveru (${res.status})`
    throw new ApiError(res.status, msg)
  }

  return data as T
}
