# Web implementation reference (React 19 + Vite)

## Where code goes

```
src/features/<slug>/
├── api/          # one file per operation: getOrders.ts, updateOrder.ts
├── components/   # owned by this feature; <Name>.tsx + .test.tsx + .stories.tsx
├── hooks/
├── types/        # only feature-local types; API types come from generated
└── index.ts      # the ONLY thing other code may import from
```

`index.ts` is the public surface. Anything not exported there is private, and
`eslint-plugin-boundaries` enforces that mechanically.

## Data: TanStack Query, never raw fetch

Queries live in `api/`, keyed by a factory so invalidation is never a guess:

```ts
// src/features/orders/api/getOrders.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
// A second backend: `apiFor('auth')`, declared in VITE_API_URLS. Never raw fetch.
import type { Order } from '@/lib/api/generated';

export const orderKeys = {
  all: ['orders'] as const,
  list: (filters: OrderFilters) => [...orderKeys.all, 'list', filters] as const,
  detail: (id: string) => [...orderKeys.all, 'detail', id] as const,
};

export function useOrders(filters: OrderFilters) {
  return useQuery({
    queryKey: orderKeys.list(filters),
    queryFn: () => api.get<Order[]>('/orders', { params: filters }),
  });
}
```

Mutations invalidate by key, never refetch by hand:

```ts
const { mutate } = useMutation({
  mutationFn: (input: UpdateOrderInput) => api.patch(`/orders/${input.id}`, input),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: orderKeys.all }),
});
```

## Forms: Zod schema is the single source

One schema produces the TS type, the runtime validation, and the resolver:

```ts
const schema = z.object({
  email: z.string().email(),
  quantity: z.coerce.number().int().positive(),
});
type FormValues = z.infer<typeof schema>;

const form = useForm<FormValues>({ resolver: zodResolver(schema) });
```

Never duplicate validation between the schema and the component.

## Every async surface renders four states

This is the most common review finding. Handle all four explicitly — an early
return per state beats a nested ternary:

```tsx
if (isPending) return <OrderListSkeleton />;
if (error)     return <ErrorState error={error} onRetry={refetch} />;
if (!data?.length) return <EmptyState action={<Button>Create order</Button>} />;
return <OrderTable orders={data} />;
```

## Routes

Register in `src/config/routes.ts` — the generator does this for you. Lazy by
default, and metadata lives with the route so the sidebar, breadcrumb, title and
permission check all read one source:

```ts
{
  path: '/orders/:id',
  lazy: () => import('@/features/orders/pages/OrderDetail'),
  meta: {
    titleKey: 'orders.detail.title',
    permission: 'orders:read',
    sidebar: { icon: 'package', group: 'commerce' },
  },
}
```

## Styling

Tokens only, from `src/styles/index.css` `@theme`. `bg-surface`, not
`bg-white dark:bg-gray-800`; `text-muted-foreground`, not `text-gray-500`.
Dark mode then works without a second class on every element.

## Tests

- hooks and `api/` → Vitest, mock at the network boundary with MSW, never mock
  your own modules
- components → Testing Library, assert what the user sees and does; query by
  role and label, never by test id unless there is no accessible alternative
- a test that asserts `toBeDefined()` asserts nothing — `npm run verify`
  includes mutation testing on the diff and will catch it

## Stories

Storybook 10. CSF3, and the types come from the **framework** package:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { OrderCard } from './order-card';

const meta = {
  title: 'Orders/OrderCard',
  component: OrderCard,
  tags: ['autodocs'],   // needs @storybook/addon-docs, already installed
} satisfies Meta<typeof OrderCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { order: mockOrder } };
export const Loading: Story = { args: { isLoading: true } };
export const LongText: Story = { args: { order: { ...mockOrder, customer: 'ü'.repeat(80) } } };
```

Two things that bite:

- `@storybook/react-vite` re-exports `@storybook/react`, so import CSF types from
  the framework package and do not add `@storybook/react` to package.json.
- **Never name a story `Error`.** `export const Error` shadows the global
  `Error` constructor inside that module. Use `Failed` with `name: 'Error'`.

A story per *state*, not per component: the populated case plus empty, loading,
error and long-content. Those are what reviewers actually need to see, and
`npm run build-storybook` makes them a reviewable artifact.

## Getting a component: registry first

Do not write a select, dialog, table or chart from scratch. shadcn is a CLI that
copies source into the repo — no runtime dependency, and the file becomes yours.

```bash
npx shadcn@latest add select                 # primitive -> src/components/atoms/
npx shadcn@latest add @react-dev/chart       # -> src/components/molecules/
npx shadcn@latest add @react-dev/data-table  # -> src/components/organisms/
```

The destination is decided by the **item**, not by you: public primitives follow
`aliases.ui` (atoms), and `@react-dev` items declare their own `files[].target`.
Items also ship their own `.stories.tsx` and `.test.tsx`, so an installed
component already meets the definition of done.

The shadcn MCP server is configured, so you can search the registry directly
rather than guessing component names.

**After installing:** read the file. It is yours now — adapt it to the spec
rather than wrapping it. Keep role tokens (`bg-card`, `text-muted-foreground`)
so it stays theme-correct in both schemes.

**Writing a new one instead?** Pick its layer by the table in `AGENTS.md`, and
if it is reusable beyond this feature, consider adding it to the registry so the
next project gets it too.
