/**
 * Backend API client for Critical website.
 *
 * Reads `NEXT_PUBLIC_BACKEND_URL` from env. Falls back to localhost:4000 in dev.
 * All POST requests automatically include the CSRF token from cookie (set by
 * backend's csrfCookieSetter middleware).
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Read a cookie by name (browser-only). Returns undefined on server. */
function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.split('=')[1] ?? '') : undefined
}

/**
 * Issue a JSON request to the backend with CSRF + credentials.
 * Throws `ApiError` for non-2xx responses.
 */
export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${BACKEND_URL}${path}`
  const csrfToken = getCookie('critical_csrf')

  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  if (csrfToken) headers.set('X-CSRF-Token', csrfToken)

  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      headers,
      credentials: 'include',
    })
  } catch (err) {
    // Network error / CORS / timeout
    throw new ApiError(0, err instanceof Error ? err.message : 'Network error')
  }

  let body: unknown = null
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    try {
      body = await response.json()
    } catch {
      body = null
    }
  }

  if (!response.ok) {
    const errorMessage =
      (body as { error?: string })?.error ?? `Request failed with status ${response.status}`
    throw new ApiError(response.status, errorMessage, body)
  }

  return body as T
}

// ─── Lead API ────────────────────────────────────────────────────────────────

export interface CreateLeadInput {
  name: string
  email: string
  company?: string
  phone?: string
  message: string
  source?: string
  locale?: 'zh' | 'en'
  /** Honeypot — leave empty. */
  website?: string
}

export interface CreateLeadResponse {
  ok: boolean
  id?: string
}

/** Submit a lead to the backend. */
export async function createLead(input: CreateLeadInput): Promise<CreateLeadResponse> {
  return apiFetch<CreateLeadResponse>('/api/leads', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
