// react-dev:adapter -- native runtime, owned by the template. `npm run port` never overwrites it.
/**
 * What msw needs and Hermes lacks. Imported by `mocks.ts` only, which a
 * production build never reaches (it is behind `__DEV__`), so none of this
 * ships.
 *
 * Each one was found by running the web app's own handlers in Expo Go, one
 * `ReferenceError` at a time -- these are not guesses.
 */
const g = globalThis as Record<string, unknown>;

// msw's WebSocket support constructs MessageEvents at module evaluation time.
if (typeof g['MessageEvent'] === 'undefined') {
  class MessageEventShim<T = unknown> extends Event {
    readonly data: T;
    readonly origin: string;
    readonly lastEventId = '';
    readonly source = null;
    readonly ports: readonly unknown[] = [];
    constructor(type: string, init: { data?: T; origin?: string } = {}) {
      super(type);
      this.data = init.data as T;
      this.origin = init.origin ?? '';
    }
  }
  g['MessageEvent'] = MessageEventShim;
}

// msw opens one to keep browser tabs in sync. An app has one JS context, so a
// channel that never delivers is the correct behaviour, not a stub.
if (typeof g['BroadcastChannel'] === 'undefined') {
  class BroadcastChannelShim extends EventTarget {
    onmessage: ((event: Event) => void) | null = null;
    onmessageerror: ((event: Event) => void) | null = null;
    constructor(readonly name: string) {
      super();
    }
    postMessage(_message: unknown): void {}
    close(): void {}
  }
  g['BroadcastChannel'] = BroadcastChannelShim;
}

// HttpResponse records Set-Cookie through Headers#getSetCookie, which RN's
// fetch implementation predates. Splitting on the comma that starts the next
// `name=` is how the spec separates a combined header.
const headers = Headers.prototype as Headers & { getSetCookie?: () => string[] };
if (typeof headers.getSetCookie !== 'function') {
  headers.getSetCookie = function getSetCookie(this: Headers): string[] {
    const value = this.get('set-cookie');
    return value === null ? [] : value.split(/,(?=\s*[^;,=\s]+=)/).map((part) => part.trim());
  };
}

// Request ids. Mock-only, so Math.random is fine; real code wants expo-crypto.
const crypto = (g['crypto'] ?? {}) as { randomUUID?: () => string };
if (typeof crypto.randomUUID !== 'function') {
  crypto.randomUUID = () =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
      const random = Math.floor(Math.random() * 16);
      return (character === 'x' ? random : (random % 4) + 8).toString(16);
    });
  g['crypto'] = crypto;
}

export {};
