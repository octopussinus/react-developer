# The web shell, as Expo Router layouts

The web app's frame -- `src/app/router.tsx`, `providers.tsx`, the route guard,
the app frame with its sidebar and header -- is never copied: `src/app/` is
Expo Router's routes folder, where any file becomes a screen. PORT.md's
"Shell" section lists each one. Here is where each job goes.

## Providers -> `src/app/_layout.tsx`

The root layout already has the query client, i18n (with a Suspense boundary),
the theme, safe areas and mocks. A provider the web adds (auth session, a
feature flag client) goes in the same tree. It is an adapter: yours to edit.

## Route registry -> files

Done for you: `npm run port` writes one file per web route
(`/orders/:id` -> `src/app/orders/[id].tsx`). Do not add routes by hand that
exist on the web -- add them to the web registry and re-run the port.

## Route guard (`meta.permission`) -> a group layout

Generated route files say which permission the web route required. Group the
protected ones and guard the group once:

```
src/app/(app)/_layout.tsx      // the guard
src/app/(app)/orders/[id].tsx  // moved in -- the URL is still /orders/:id
```

```tsx
export default function AppLayout() {
  const session = useSession();            // the web's hook, copied
  if (session.isPending) return <LoadingState />;
  if (!session.data) return <Redirect href="/sign-in" />;
  return <Stack />;
}
```

Groups (`(app)`) do not appear in the URL, so links keep working. Moving a
generated route file into a group makes it yours: remove its
`react-dev:route` header line so the port stops regenerating it.

## App frame, sidebar, header -> tabs and a stack

A sidebar is a desktop pattern. The routes the web marks `meta.sidebar` (or a
mobile bottom nav, if the web has one) become **tabs**; everything else is
pushed onto a stack above them.

```
src/app/_layout.tsx            // root Stack (already there)
src/app/(tabs)/_layout.tsx     // <Tabs> -- one per sidebar entry, at most five
src/app/(tabs)/index.tsx       // the home screen
```

Icons: the web sidebar's `lucide-react` icon names work as `lucide-react-native`
components in `tabBarIcon`. Labels: the same translation keys.

## Error boundary

Export it from a layout or route file -- Expo Router renders it for errors below:

```tsx
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <ErrorState error={error} onRetry={retry} />;
}
```

## Not found

`src/app/+not-found.tsx` (already there, rendering the translated web page).
