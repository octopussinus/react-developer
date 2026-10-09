// react-dev:adapter -- native runtime, owned by the template. `npm run port` never overwrites it.
/**
 * The web APIs code copied from the web app expects, installed before any of it
 * is imported. Import this FIRST in the root layout.
 *
 * Measured on Expo Go SDK 57 (Hermes, Android): URL/URLSearchParams,
 * AbortSignal.timeout/any, TextEncoder, structuredClone, fetch/Request/Headers,
 * EventTarget and DOMException all exist natively. `localStorage` does not --
 * and the web app's theme, locale and feature code reach for it constantly.
 * expo-sqlite ships a synchronous, persistent implementation of the same API,
 * and it is in Expo Go, so that code runs unchanged.
 */
import 'expo-sqlite/localStorage/install';

/*
 * FormData: React Native's has append/getAll and nothing to READ a single
 * field with. The web app's code -- an upload hook, a mock handler answering
 * an upload -- calls get/has/entries, which on a phone throws "undefined is
 * not a function". These are the standard methods, built on RN's own _parts.
 */
type Part = [string, unknown];
const formData = FormData.prototype as unknown as Record<string, unknown> & { _parts?: Part[] };
const parts = (form: unknown): Part[] => (form as { _parts?: Part[] })._parts ?? [];
const methods: Record<string, (this: unknown, ...args: never[]) => unknown> = {
  get(this: unknown, name: string) {
    return parts(this).find(([key]) => key === name)?.[1] ?? null;
  },
  has(this: unknown, name: string) {
    return parts(this).some(([key]) => key === name);
  },
  set(this: unknown, name: string, value: unknown) {
    const kept = parts(this).filter(([key]) => key !== name);
    kept.push([name, value]);
    (this as { _parts: Part[] })._parts = kept;
  },
  delete(this: unknown, name: string) {
    (this as { _parts: Part[] })._parts = parts(this).filter(([key]) => key !== name);
  },
  entries(this: unknown) {
    return parts(this)[Symbol.iterator]();
  },
  keys(this: unknown) {
    return parts(this)
      .map(([key]) => key)
      [Symbol.iterator]();
  },
  values(this: unknown) {
    return parts(this)
      .map(([, value]) => value)
      [Symbol.iterator]();
  },
  forEach(this: unknown, callback: (value: unknown, key: string, form: unknown) => void) {
    for (const [key, value] of parts(this)) callback(value, key, this);
  },
};
for (const [name, method] of Object.entries(methods)) {
  if (typeof formData[name] !== 'function') formData[name] = method;
}
if (typeof formData[Symbol.iterator as unknown as string] !== 'function') {
  (formData as Record<symbol, unknown>)[Symbol.iterator] = methods['entries'];
}
