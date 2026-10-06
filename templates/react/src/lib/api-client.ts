import { env } from '@/config/env';

/**
 * The single egress point for HTTP. `no-restricted-syntax` in eslint.config.js
 * bans raw `fetch` so that error normalisation, timeouts and auth can never be
 * re-improvised per feature.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
    message: string,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Retrying a 4xx just fails again; 5xx and network errors may recover. */
  get isRetryable(): boolean {
    return this.status === 0 || this.status === 408 || this.status === 429 || this.status >= 500;
  }
}

interface RequestOptions {
  params?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

function buildUrl(baseUrl: string, path: string, params?: RequestOptions['params']): string {
  const url = new URL(path.replace(/^\//, ''), `${baseUrl.replace(/\/$/, '')}/`);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function request<T>(
  baseUrl: string,
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const url = buildUrl(baseUrl, path, options.params);
  const timeout = AbortSignal.timeout(env.VITE_API_TIMEOUT_MS);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;

  let response: Response;
  try {
    // eslint-disable-next-line no-restricted-syntax -- this IS the api client
    response = await fetch(url, {
      method,
      signal,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...options.headers,
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
  } catch (cause) {
    throw new ApiError(0, url, cause instanceof Error ? cause.message : 'Network request failed');
  }

  if (!response.ok) {
    // response.json() is typed `any`; keep it opaque so callers must narrow.
    const errorBody: unknown = await (response.json() as Promise<unknown>).catch(() => undefined);
    throw new ApiError(
      response.status,
      url,
      `${method} ${path} failed with ${response.status}`,
      errorBody,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export interface ApiClient {
  get: <T>(path: string, options?: RequestOptions) => Promise<T>;
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => Promise<T>;
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => Promise<T>;
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => Promise<T>;
  delete: <T>(path: string, options?: RequestOptions) => Promise<T>;
}

/** A client bound to one base URL. Still the only place `fetch` is called. */
export function createApiClient(baseUrl: string): ApiClient {
  return {
    get: (path, options) => request(baseUrl, 'GET', path, undefined, options),
    post: (path, body, options) => request(baseUrl, 'POST', path, body, options),
    patch: (path, body, options) => request(baseUrl, 'PATCH', path, body, options),
    put: (path, body, options) => request(baseUrl, 'PUT', path, body, options),
    delete: (path, options) => request(baseUrl, 'DELETE', path, undefined, options),
  };
}

/** The default API — `VITE_API_URL`. Most features need only this. */
export const api: ApiClient = createApiClient(env.VITE_API_URL);

/**
 * A client for one of the extra APIs declared in `VITE_API_URLS`.
 *
 *   const auth = apiFor('auth');
 *   await auth.post('/sessions', credentials);
 *
 * Throws immediately, naming what IS configured, rather than building a request
 * against `undefined/sessions` and failing as a confusing 404 at runtime.
 *
 * Deliberately NOT memoised: a client is five closures over a string, so a cache
 * buys nothing and makes the function ignore a changed environment -- which is
 * hidden state that showed up the moment it was tested.
 */
export function apiFor(name: string): ApiClient {
  const baseUrl = env.VITE_API_URLS[name];
  if (baseUrl === undefined) {
    const configured = Object.keys(env.VITE_API_URLS);
    throw new Error(
      `No API named "${name}". Add it to VITE_API_URLS in your .env, e.g. ` +
        `VITE_API_URLS={"${name}":"https://..."}. ` +
        (configured.length > 0
          ? `Configured: ${configured.join(', ')}.`
          : 'None are configured yet.'),
    );
  }

  return createApiClient(baseUrl);
}
