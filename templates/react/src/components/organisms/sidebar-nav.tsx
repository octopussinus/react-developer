import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';
import { sidebarRoutes } from '@/config/routes';
import { cn } from '@/lib/cn';

/**
 * Organism: a distinct section of the interface, assembled from smaller parts
 * and aware of app-level config.
 *
 * It reads the route registry, so registering a route is the only step needed
 * to appear in navigation -- and because the label is an i18n key, it also
 * translates. Filename-derived labels could do neither.
 */
export function SidebarNav({ className }: { className?: string }) {
  // The hook subscribes to language changes (so this re-renders); `i18n.t` is
  // typed across ALL namespaces, which a route label needs -- a feature route's
  // key lives in that feature's namespace.
  const { t, i18n } = useTranslation(['common', 'nav']);

  return (
    <nav aria-label={t('nav:mainNavigation')} className={className}>
      <ul className="space-y-1">
        {sidebarRoutes().map((route) => (
          <li key={route.path}>
            <NavLink
              to={route.path}
              className={({ isActive }) =>
                cn(
                  'block rounded-control px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-surface-muted text-foreground'
                    : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground',
                )
              }
            >
              {i18n.t(route.meta.titleKey)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
