import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { expoRouteFile, readRoutes, routeFileSource } from './routes.mjs';

describe('expoRouteFile', () => {
  const all = ['/', '/orders', '/orders/:orderId', '/settings/preferences', '/docs/*'];

  it('maps the registry onto Expo Router files', () => {
    expect(expoRouteFile('/', all)).toBe('src/app/index.tsx');
    expect(expoRouteFile('/orders/:orderId', all)).toBe('src/app/orders/[orderId].tsx');
    expect(expoRouteFile('/settings/preferences', all)).toBe('src/app/settings/preferences.tsx');
    expect(expoRouteFile('/docs/*', all)).toBe('src/app/docs/[...rest].tsx');
  });

  it('puts a list beside its detail as index.tsx', () => {
    // `orders.tsx` + `orders/[orderId].tsx` also works, but one folder per
    // resource is what Expo's own examples do, and what the port expects.
    expect(expoRouteFile('/orders', all)).toBe('src/app/orders/index.tsx');
  });
});

describe('readRoutes', () => {
  it('reads path, lazy module, title key and permission from the AST', () => {
    const root = mkdtempSync(join(tmpdir(), 'routes-'));
    mkdirSync(join(root, 'src/config'), { recursive: true });
    writeFileSync(
      join(root, 'src/config/routes.ts'),
      `export const routes = [
        { path: '/', lazy: () => import('@/app/pages/home'), meta: { titleKey: 'nav:home' } },
        {
          path: '/orders/:id',
          lazy: () => import('@/modules/orders/detail/detail-page'),
          meta: { titleKey: 'orders:title', permission: 'orders:read' },
        },
      ] as const;`,
    );
    expect(readRoutes(root)).toEqual([
      { path: '/', module: '@/app/pages/home', titleKey: 'nav:home', permission: null },
      {
        path: '/orders/:id',
        module: '@/modules/orders/detail/detail-page',
        titleKey: 'orders:title',
        permission: 'orders:read',
      },
    ]);
  });
});

describe('routeFileSource', () => {
  const route = {
    path: '/orders/:id',
    module: '@/modules/orders/detail/detail-page',
    titleKey: 'orders:title',
    permission: null,
  };

  it('never imports an untranslated page -- it would break every screen', () => {
    const stub = routeFileSource(route, 'src/modules/orders/detail/detail-page.tsx', false);
    expect(stub).toContain('react-dev:route-stub');
    expect(stub).not.toContain("from '@/modules/orders/detail/detail-page'");
  });

  it('imports the page once it is native, with its title', () => {
    const real = routeFileSource(route, 'src/modules/orders/detail/detail-page.tsx', true);
    expect(real).toContain("import Page from '@/modules/orders/detail/detail-page';");
    // Typed i18next takes the namespace on the hook, not as a key prefix.
    expect(real).toContain("useTranslation('orders')");
    expect(real).toContain("title: t('title')");
  });
});
