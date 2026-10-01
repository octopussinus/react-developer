import { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { AppShell } from '@/components/templates';
import { LoadingState } from '@/components/molecules';
import { routes } from '@/config/routes';
import { NotFound } from './pages/not-found';

/**
 * Routes are built from the registry, lazily. Every page is its own chunk, so
 * adding the fiftieth page does not grow the initial bundle.
 */
export function AppRouter() {
  return (
    <BrowserRouter>
      <AppShell>
        <Suspense fallback={<LoadingState />}>
          <Routes>
            {routes.map((route) => {
              const Page = lazy(route.lazy);
              return <Route key={route.path} path={route.path} element={<Page />} />;
            })}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AppShell>
    </BrowserRouter>
  );
}
