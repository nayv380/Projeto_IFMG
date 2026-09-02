/**
 * Cliente HTTP base da aplicação.
 *
 * Usa `fetch` nativo (sem dependência extra de axios) apontando para a API
 * Django REST em `VITE_API_BASE_URL` (default: http://localhost:8000/api/v1).
 * Basta ajustar a variável de ambiente / os `path` de cada service quando
 * as rotas definitivas do backend forem criadas.
 */

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000/api/v1';

const ACCESS_TOKEN_KEY = 'plataforma:accessToken';
const REFRESH_TOKEN_KEY = 'plataforma:refreshToken';

/** Leitura/escrita centralizada dos tokens JWT (localStorage). */
export const tokenStorage = {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  setTokens(access: string, refresh?: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  },
  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

/** Erro tipado lançado para qualquer resposta HTTP >= 400. */
export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(status: number, data: unknown, message?: string) {
    super(message ?? `Erro na requisição (HTTP ${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Não anexa o header Authorization (ex.: login, registro, refresh) */
  skipAuth?: boolean;
  /** Impede a tentativa automática de refresh em caso de 401 */
  skipRefresh?: boolean;
}

let refreshPromise: Promise<string | null> | null = null;

/** Tenta renovar o access token usando o refresh token salvo. Deduplica chamadas concorrentes. */
async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStorage.getRefreshToken();
  if (!refresh) return null;

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const data = (await res.json()) as { access: string };
        tokenStorage.setTokens(data.access);
        return data.access;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

async function parseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth, skipRefresh, headers, body, ...rest } = options;

  const finalHeaders = new Headers(headers);
  finalHeaders.set('Accept', 'application/json');
  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders.set('Content-Type', 'application/json');
  }

  if (!skipAuth) {
    const token = tokenStorage.getAccessToken();
    if (token) finalHeaders.set('Authorization', `Bearer ${token}`);
  }

  const fetchInit: RequestInit = { ...rest, headers: finalHeaders };
  if (body !== undefined) {
    fetchInit.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, fetchInit);

  // Access token expirado: tenta renovar uma única vez e repete a chamada original
  if (response.status === 401 && !skipAuth && !skipRefresh) {
    const newAccess = await refreshAccessToken();
    if (newAccess) {
      return request<T>(path, { ...options, skipRefresh: true });
    }
    tokenStorage.clear();
  }

  const data = await parseBody(response);

  if (!response.ok) {
    throw new ApiError(response.status, data, extractErrorMessage(data));
  }

  return data as T;
}

function extractErrorMessage(data: unknown): string | undefined {
  if (typeof data === 'string' && data.trim()) {
    return data;
  }

  if (Array.isArray(data)) {
    const messages = data
      .map((item) => (typeof item === 'string' ? item : extractErrorMessage(item)))
      .filter((item): item is string => Boolean(item));
    if (messages.length > 0) return messages.join(' ');
  }

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;

    if (typeof record.detail === 'string') {
      return record.detail;
    }

    if (Array.isArray(record.non_field_errors)) {
      return extractErrorMessage(record.non_field_errors);
    }

    const fieldMessages = Object.values(record)
      .map((value) => extractErrorMessage(value))
      .filter((item): item is string => Boolean(item));

    if (fieldMessages.length > 0) {
      return fieldMessages.join(' ');
    }
  }

  return undefined;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'DELETE' }),
};
