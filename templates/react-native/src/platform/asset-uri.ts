// react-dev:adapter -- native runtime, owned by the template. `npm run port` never overwrites it.
/**
 * An imported image, as the URL string the web app's code expects.
 *
 * On the web (and under Vitest, which is Vite) `import photo from './a.webp'`
 * IS a URL string. Under Metro it is an asset id, a number -- so mock data that
 * says `photoUrl: photo` would hand every <Image> a number. `npm run port`
 * rewrites image imports in copied data files to pass through here, which
 * gives the same string on both sides.
 */
export function assetUri(asset: unknown): string {
  if (typeof asset === 'string') return asset;
  // Required lazily: Vitest never gets here, and cannot load react-native.
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- see above
  const { Image } = require('react-native') as typeof import('react-native');
  return Image.resolveAssetSource(asset as number).uri;
}
