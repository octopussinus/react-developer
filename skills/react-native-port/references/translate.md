# Translating a web file to React Native

The web file is the spec. Keep its **path, export names, prop names, translation
keys and Tailwind classes**; change only what React Native cannot do. The
template's own translations are the house style -- read them first:
`src/components/atoms/button.tsx`, `input.tsx`, `skeleton.tsx`,
`src/components/molecules/form-field.tsx`, `states.tsx`, `src/screens/not-found.tsx`.

## Elements

| Web | Native | Watch out |
|---|---|---|
| `div` `section` `header` `main` `nav` `article` `form` `ul` `li` | `View` | Flex is always on and the default direction is **column**. A web `flex` (row) is `flex-row`. |
| `p` `span` `h1`-`h6` `label` `strong` `code`, any raw text | `Text` | **Every** string inside `<Text>`, or the app crashes. Nested `<Text>` for inline emphasis. Headings: `accessibilityRole="header"`. |
| `button` | `Pressable` (or the `Button` atom) | No default look; label in a `<Text>`. `onClick` -> `onPress`. |
| `a` / `<Link to>` | `Link` from expo-router, `href` | Styled like a button: `<Link href asChild><Pressable>...</Pressable></Link>`. |
| `input` `textarea` | `TextInput` (the `Input` atom) | `value` + `onChangeText(text)`; `multiline` for textarea; `secureTextEntry`, `keyboardType`, `autoComplete` instead of `type=`. |
| `select` | a `Pressable` opening a list in a `Modal`, or `@react-native-picker/picker` | Both run in Expo Go. |
| `img` | `Image` from `expo-image` | Needs a size and `contentFit`. Keep the web's `import photo from './a.webp'` -- the port copied every image under `src/` -- and pass it straight to `source={photo}` (on native it is an asset id, not a URL). |
| inline `svg` | `react-native-svg` | Colours are props, not classes: read the token with `useCSSVariable('--color-primary')` from `uniwind`. |
| lucide icons | `@/platform/icons` | The port rewrites `lucide-react` to it: same names, each wrapped so `className="size-5 text-primary"` sizes and colours it. Text colour does not reach an icon from its parent -- give every icon its own `text-*`. Filled: `fill-primary`. |
| `table` | `View` rows, or a `FlatList` | No table element; for wide data, one card per row reads better on a phone. |
| page body that scrolls | `ScrollView` / `FlatList` | Nothing scrolls by default. `contentContainerClassName` for padding and gap. |
| a list of items (`.map()`) | `FlatList` when it can exceed ~20 rows | `keyExtractor`, `ListEmptyComponent={<EmptyState />}`, `onEndReached` for paging, `refreshControl` for pull-to-refresh (`refetch`). |

## Events and browser APIs

| Web | Native |
|---|---|
| `onClick` / `onChange={e => e.target.value}` / `onSubmit` | `onPress` / `onChangeText={text => ...}` / the submit button's `onPress={form.handleSubmit(...)}` |
| `onKeyDown` Enter | `onSubmitEditing`, `returnKeyType` |
| `e.preventDefault()`, `e.stopPropagation()` | delete -- there is no default action |
| `useNavigate()` / `navigate(-1)` / `<Navigate to replace>` | `const router = useRouter()`; `router.push(href)` / `router.back()` / `<Redirect href>` |
| `useParams()` / `useSearchParams()` | `useLocalSearchParams<{ id: string }>()`; write search params with `router.setParams({...})` |
| `NavLink` active state | `usePathname()` and compare |
| `document.title` | `<Stack.Screen options={{ title }} />` |
| `window.scrollTo` / `element.scrollIntoView` | a `ref` on the ScrollView/FlatList: `scrollTo`, `scrollToIndex` |
| `element.focus()` | `ref.current?.focus()` on a TextInput; otherwise `AccessibilityInfo.setAccessibilityFocus` |
| `window.matchMedia` / `innerWidth` | `useColorScheme()` / `useWindowDimensions()`, or Uniwind breakpoints (`md:`) |
| `localStorage` | works as is -- expo-sqlite installs it. `sessionStorage`: an in-memory Map. |
| `import.meta.env.VITE_X`, `new URL('./a.webp', import.meta.url)` | nothing to do: the port rewrites both in every copy (`process.env.EXPO_PUBLIC_X`, an image import) |
| `import.meta.glob('./x/*.json')` | `require.context('./x', false, /\.json$/)` (Metro bundles a context) |
| `navigator.clipboard` / `navigator.share` | `expo-clipboard` / `Share` from react-native |
| `<input type=file>` | `expo-image-picker` / `expo-document-picker` |
| `window.open(url)` | `expo-web-browser` `openBrowserAsync(url)`, or `Linking.openURL` |
| `confirm()` / a confirm dialog | `Alert.alert(title, body, [cancel, ok])` |

## Tailwind classes under Uniwind

Most classes mean the same thing -- keep them. These do not:

| Web class | Native |
|---|---|
| `text-*`, `font-*` on a container | move them to the `<Text>` inside: text does not inherit |
| `grid`, `grid-cols-N` | `flex-row flex-wrap` + `basis-1/2` (or `w-1/2`) on children |
| `hover:` | `active:` (pressed). `focus-visible:`, `cursor-*`, `select-none`: delete |
| `space-x-*` / `space-y-*`, `divide-*` | `gap-*` / a border on each child |
| `inline-flex`, `inline-block` | `flex-row` + `self-start` |
| `truncate`, `line-clamp-N` | `numberOfLines={1}` / `numberOfLines={N}` on the Text |
| `sr-only` text | `accessibilityLabel` on the element it labels |
| `animate-spin` / `animate-pulse` / `transition-*` | `ActivityIndicator` / `Animated` (see the Skeleton atom) / nothing |
| `fixed` | `absolute` inside the screen + safe-area classes (`pb-safe`, `pt-safe`) |
| `min-h-screen`, `min-h-dvh`, `h-screen` | `flex-1` |
| `overflow-auto` / `overflow-y-scroll` | a `ScrollView` |
| `bg-gradient-*` | `expo-linear-gradient` (in Expo Go) |
| `backdrop-blur-*` | `expo-blur` `BlurView` (in Expo Go) |
| `dark:` variants | work only in the plain `dark` theme. Prefer role tokens (`bg-card`), which follow every theme |
| `rounded-(--x)`, `shadow-(--x)` (CSS variable shorthand) | use the token utility (`rounded-card`); check it on a device |

Colour props that are not `style` take `accent-*` classes:
`<ActivityIndicator colorClassName="accent-primary" />`,
`placeholderTextColorClassName="accent-muted-foreground"`.

## Forms

The schema and `useZodForm` are copied unchanged. `register()` spreads DOM props,
so each field becomes a `Controller`:

```tsx
<Controller
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormField
      label={t('email')}
      value={field.value}
      onChangeText={field.onChange}
      onBlur={field.onBlur}
      keyboardType="email-address"
      autoCapitalize="none"
      error={form.formState.errors.email?.message}
    />
  )}
/>
<Button onPress={form.handleSubmit(onSubmit)}>{t('save')}</Button>
```

Wrap long forms in `KeyboardAvoidingView` (or `react-native-keyboard-controller`,
in Expo Go) so the keyboard does not cover the field being typed in.

## Overlays

| Web | Native |
|---|---|
| Dialog / Sheet (Radix, vaul) | a route with `presentation: 'modal'` or `'formSheet'`, or `Modal` |
| AlertDialog | `Alert.alert` |
| DropdownMenu / Popover | a `Modal` with a list, anchored at the bottom |
| Toast (sonner) | a small `Animated` banner in the root layout, or `Alert` for errors |
| Tooltip | delete -- there is no hover; put the text in an `accessibilityHint` |

A chart, a map or rich text with no reasonable native equivalent can stay web:
put it in its own file with `'use dom'` on line 1 (Expo DOM components -- they
run in Expo Go), pass serializable props, and render it from the native screen.

## Barrels and platform files

- `index.ts` barrels are **generated**: each re-exports only the members that
  are native so far, and grows as you translate. Never edit one; a screen
  goes live as soon as the members IT imports are native.
- A platform file you translate (say `src/lib/locale.ts`) is often imported by
  copied logic, whose web tests run under Vitest in Node. If your translation
  imports a native module, Vitest needs a stub for it: `tools/vitest/` has
  `expo-localization`; add others the same way and map them in
  `vitest.config.ts`.
- Keep the translation as close to the web file as the platform allows: the
  port re-checks it against the web file every run, and a small diff is a
  small update when the web side changes.

## Tests

Copied logic keeps its web tests (Vitest). A translated component gets a native
one beside it, `<name>.native.test.tsx`, React Native Testing Library **14**:
`await render(...)`, `const user = userEvent.setup(); await user.press(...)`,
matchers like `toBeOnTheScreen()`, `toBeDisabled()`, `toBeBusy()`. Older
examples with a synchronous `render` fail with "render function has not been
called".

## After writing the file

`npm run port`. It stamps the file with the web version it translates
(`// react-dev:translated-from ...` on line 1 -- leave that line alone) and
re-checks everything that was waiting on it.
