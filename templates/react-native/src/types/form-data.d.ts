/**
 * The read side of FormData, which src/platform/install.ts adds to React
 * Native's (it ships append/getAll only). Declared so the web app's copied
 * code -- upload hooks, mock handlers -- type-checks as it does on the web.
 *
 * React Native's typings give `Request#formData()` its own FormData class,
 * which is not the global one, so the method is re-declared to return the
 * global (DOM-shaped) FormData that the polyfill makes true at runtime.
 */
declare global {
  interface Body {
    formData(): Promise<FormData>;
  }
  interface Request {
    formData(): Promise<FormData>;
  }
  interface Response {
    formData(): Promise<FormData>;
  }
}

export {};
