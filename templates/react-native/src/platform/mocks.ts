// react-dev:adapter -- native runtime, owned by the template. `npm run port` never overwrites it.
import './mock-runtime';
import { getResponse } from 'msw';
import { handlers } from '@/testing/mocks/handlers';

/**
 * The web app's MSW handlers, answering on the phone.
 *
 * msw 3 has no React Native integration (`msw/native` was removed and its
 * replacement is an unpublished experiment), but it does export the function
 * every integration is built on: `getResponse(handlers, request)`. And every
 * request in this app goes through ONE `fetch` -- the copied api client is the
 * only caller, lint forbids the rest -- so wrapping that one function is the
 * whole interception layer. The handlers are the web app's files, unchanged:
 * mocks agree between web and phone because they are the same mocks.
 *
 * Unmatched requests fall through to the real network, as MSW's default does.
 */
export function enableMocks(): void {
  const network = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = new Request(input instanceof URL ? input.toString() : input, init);
    const mocked = await getResponse(handlers, request);
    return mocked ?? network(input, init);
  };
}
