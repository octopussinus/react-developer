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

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const url = new URL(path.replace(/^\//, ''), `${env.VITE_API_URL.replace(/\/$/, '')}/`);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const url = buildUrl(path, options.params);
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

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, body, options),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PUT', path, body, options),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>('DELETE', path, undefined, options),
};
