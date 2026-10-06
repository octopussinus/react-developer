import { afterEach, describe, expect, it, vi } from 'vitest';
import { env } from '@/config/env';
import { ApiError, api, apiFor } from './api-client';

/**
 * Written because `npm run test:mutation` reported 68 uncovered mutants in this
 * file: URL building, error normalisation and the retryable classification were
 * all untested, and they are what every generated feature depends on.
 */

const originalFetch = globalThis.fetch;

function mockFetch(response: Partial<Response> & { jsonBody?: unknown }) {
  const spy = vi.fn().mockResolvedValue({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    json: () => Promise.resolve(response.jsonBody ?? {}),
    ...response,
  });
  globalThis.fetch = spy;
  return spy;
}

/*
 * `env` is parsed once at module import, so vi.stubEnv() in a hook runs too
 * late to change it -- the base url is whatever src/testing/setup.ts stubbed
 * before any module loaded. Derive expectations from `env` so these tests
 * assert the URL-joining logic rather than a hardcoded host.
 */
const BASE = env.VITE_API_URL;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('url building', () => {
  it('joins the base url and path without doubling slashes', async () => {
    const spy = mockFetch({ jsonBody: [] });
    await api.get('/orders');
    expect(spy.mock.calls[0]?.[0]).toBe(`${BASE}/orders`);
  });

  it('handles a path with no leading slash identically', async () => {
    const spy = mockFetch({ jsonBody: [] });
    await api.get('orders');
    expect(spy.mock.calls[0]?.[0]).toBe(`${BASE}/orders`);
  });

  it('serialises query params and drops undefined ones', async () => {
    const spy = mockFetch({ jsonBody: [] });
    await api.get('/orders', { params: { page: 2, q: 'abc', unset: undefined, flag: false } });

    const url = new URL(String(spy.mock.calls[0]?.[0]));
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('q')).toBe('abc');
    expect(url.searchParams.get('flag')).toBe('false');
    expect(url.searchParams.has('unset')).toBe(false);
  });
});

describe('request bodies', () => {
  it('sends JSON and the content-type header on post', async () => {
    const spy = mockFetch({ jsonBody: { id: '1' } });
    await api.post('/orders', { name: 'x' });

    const init = spy.mock.calls[0]?.[1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"name":"x"}');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('omits body and content-type when there is nothing to send', async () => {
    const spy = mockFetch({ jsonBody: {} });
    await api.get('/orders');

    const init = spy.mock.calls[0]?.[1] as RequestInit;
    expect(init.body).toBeUndefined();
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
  });

  it('returns undefined for 204 instead of trying to parse a body', async () => {
    mockFetch({ status: 204, jsonBody: undefined });
    await expect(api.delete('/orders/1')).resolves.toBeUndefined();
  });
});

describe('error normalisation', () => {
  it('throws ApiError carrying status, url and parsed body', async () => {
    mockFetch({ ok: false, status: 422, jsonBody: { message: 'bad input' } });

    const error = await api.post('/orders', {}).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.status).toBe(422);
    expect(apiError.url).toBe(`${BASE}/orders`);
    expect(apiError.body).toEqual({ message: 'bad input' });
  });

  it('still throws when the error body is not JSON', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    });

    const error = (await api.get('/orders').catch((e: unknown) => e)) as ApiError;
    expect(error.status).toBe(500);
    expect(error.body).toBeUndefined();
  });

  it('reports a network failure as status 0', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('connection refused'));

    const error = (await api.get('/orders').catch((e: unknown) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
    expect(error.message).toBe('connection refused');
  });
});

describe('ApiError.isRetryable', () => {
  // This drives the query client's retry policy, so the boundaries matter:
  // retrying a 4xx just fails again and costs the user a slower error.
  it.each([
    [0, true, 'network failure'],
    [408, true, 'request timeout'],
    [429, true, 'rate limited'],
    [500, true, 'server error'],
    [503, true, 'unavailable'],
    [400, false, 'bad request'],
    [401, false, 'unauthorised'],
    [404, false, 'not found'],
    [422, false, 'validation'],
  ])('%i -> %s (%s)', (status, expected) => {
    expect(new ApiError(status, '/x', 'msg').isRetryable).toBe(expected);
  });
});

describe('apiFor — extra APIs from VITE_API_URLS', () => {
  it('builds requests against the named base URL, not the default one', async () => {
    vi.spyOn(env, 'VITE_API_URLS', 'get').mockReturnValue({
      auth: 'https://auth.example.com',
    });
    const spy = mockFetch({ jsonBody: { ok: true } });

    await apiFor('auth').get('/sessions');

    expect(spy).toHaveBeenCalledWith('https://auth.example.com/sessions', expect.anything());
  });

  it('names what IS configured when asked for one that is not', () => {
    vi.spyOn(env, 'VITE_API_URLS', 'get').mockReturnValue({ auth: 'https://auth.example.com' });

    // Without this the request would be built against `undefined/charges` and
    // surface as a confusing 404 instead of a configuration error.
    expect(() => apiFor('payments')).toThrow(/No API named "payments"/);
    expect(() => apiFor('payments')).toThrow(/Configured: auth/);
  });

  it('says so plainly when none are configured', () => {
    vi.spyOn(env, 'VITE_API_URLS', 'get').mockReturnValue({});
    expect(() => apiFor('auth')).toThrow(/None are configured yet/);
  });
});
