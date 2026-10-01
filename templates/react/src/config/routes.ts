import type { Namespace, ParseKeys } from 'i18next';
import type { ComponentType } from 'react';

/**
 * The explicit route registry. It replaces filename-based auto-discovery, which
 * could not express params, guards, lazy loading, nested layouts or translatable
 * labels -- and which bundled every page into the main chunk.
 *
 * `npm run gen -- page|feature` appends entries here. Keep it alphabetical by path.
 */
/**
 * Every key in every declared namespace, restricted to the explicit `ns:key`
 * form so a route never depends on which namespace happens to be default.
 * Derived from
 * i18next's own `Namespace` union, so a feature namespace added by
 * `npm run gen -- feature` is accepted automatically -- while a typo in a key
 * is still a compile error.
 */
export type RouteLabelKey = Extract<ParseKeys<Namespace>, `${string}:${string}`>;

export interface RouteMeta {
  /**
   * i18n key, never a literal, and typed against the real key union -- so a
   * renamed or missing key is a compile error rather than a silent fallback.
   * Cross-namespace form: 'nav:home', 'orders:title'.
   */
  titleKey: RouteLabelKey;
  /** Permission required to see the route at all. Omit for public. */
  permission?: string;
  /** i18n keys for the breadcrumb trail, outermost first. */
  breadcrumb?: readonly RouteLabelKey[];
  /** Present means "show in the sidebar". */
  sidebar?: {
    icon: string;
    group: string;
    order?: number;
  };
}

export interface RouteDef {
  path: string;
  /** Lazy by default: a 50-page app must not ship as one chunk. */
  lazy: () => Promise<{ default: ComponentType }>;
  meta: RouteMeta;
}

export const routes: readonly RouteDef[] = [
  {
    path: '/',
    lazy: () => import('@/app/pages/home'),
    meta: {
      titleKey: 'nav:home',
      sidebar: { icon: 'home', group: 'main', order: 0 },
    },
  },
  // react-dev:routes -- the generator inserts new entries above this line
];

/** Sidebar entries, grouped and ordered. Derived, never hand-maintained. */
export function sidebarRoutes(): readonly RouteDef[] {
  return routes
    .filter((route) => route.meta.sidebar !== undefined)
    .sort((a, b) => (a.meta.sidebar?.order ?? 99) - (b.meta.sidebar?.order ?? 99));
}
