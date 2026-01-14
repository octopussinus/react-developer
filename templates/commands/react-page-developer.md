---
description: Implement complete React and React Native/Expo pages with all necessary components, state management, and responsive design
---

## ORDER OF OPERATIONS - STEP 3 of 3

**Run this command THIRD** (after `/react-requirements-creator` and `/react-typescript-developer`). This command implements complete pages. Before running, ensure the requirements file exists in `requirements/` and TypeScript logic has been implemented.

---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## ⚠️ READING REQUIREMENTS ⚠️

**When requirements file is mentioned in user input**:
1. READ the requirements file from `requirements/` folder (e.g., `requirements/page-dashboard.md`)
2. Use those requirements as the source of truth for implementation
3. If HTML prototype is also mentioned, read both and ensure consistency

## ⚠️ CRITICAL RULES ⚠️

**PROMPT REQUIREMENTS OVERRIDE ALL OTHER RULES:**
- Implement exactly what is specified in prompt requirements
- **WHEN HTML PROTOTYPE PROVIDED**: ALWAYS OBEY DESIGN/MOCKUP STYLING - Copy exact layout, spacing, and visual structure
- **Convert HTML prototype to React**: Identify sections, replace `class=` with `className=`, convert to dynamic components, preserve all Tailwind classes
- **THEMING**: Use `brand-*` Tailwind classes (e.g., `bg-brand-500`) for all primary/accent colors to support dynamic themes.
- **DARK MODE**: ALWAYS implement dark mode variants for every color class (e.g., `bg-white dark:bg-gray-800`).

**COMPONENT REUSABILITY - TEMPLATE FIRST:**
- **Create components as generic templates**: Avoid hardcoding domain-specific text (like "Product Name") inside components.
- **Pass everything via props**: Labels, placeholders, titles, and data keys should be props.
- **Configuration belongs in the Page**: The Page component (`index.tsx`) should define the specific text and data mapping passed to components.

**SCOPE - I AM A COMPLETE PAGE IMPLEMENTER:**

I MUST GENERATE OR MODIFY:
- Page component files (.tsx)
- Child component files within page directory (.tsx)
- Page-specific type definitions (types.ts)
- **Page-specific translation files (for ALL available languages)**
- **Routing configuration (ALWAYS add new routes)**
- **Navigation/sidebar (ALWAYS add links to new pages)**

I MUST NEVER:
- Modify global state management setup
- Change application-level configuration

## REACT PAGE STRUCTURE

Feature-based folder structure with **PAGE COMPONENTS** in `src/components/{page-name}/`:

```
src/
├── components/                     # All components organized by page
│   ├── common/                     # Shared/reusable components
│   │   └── PageMeta.tsx
│   └── dashboard/                  # Dashboard page components
│       ├── BucketCard.tsx
│       ├── BucketListRow.tsx
│       └── CreateBucketModal.tsx
├── types/                          # Domain types in ENTITY FOLDERS
│   └── bucket/
│       └── bucket.types.ts
├── services/                       # Services in ENTITY FOLDERS
│   └── bucket/
│       ├── bucket.interface.ts
│       └── bucket.api.ts
├── hooks/                          # Hooks in ENTITY FOLDERS
│   └── bucket/
│       └── useBuckets.ts
├── utils/                          # Utils in ENTITY FOLDERS
│   └── bucket/
│       └── bucket.utils.ts
└── pages/
    └── Dashboard/
        ├── index.tsx               # Main page component
        ├── types.ts                # Page-specific types (component props ONLY)
        └── hooks/                  # Page-specific hooks (if needed)
            └── useDashboardData.ts
```

### Component Organization Rules

1. **Page-specific components** go in `src/components/{page-name-lowercase}/`
   - Example: Dashboard page → `src/components/dashboard/`
   - Example: Settings page → `src/components/settings/`

2. **Reusable/shared components** go in `src/components/common/`

3. **Import components using @/ alias**:
   ```typescript
   import BucketCard from '@/components/dashboard/BucketCard';
   import PageMeta from '@/components/common/PageMeta';
   ```

### Import Path Conventions

Always use `@/` alias with full path:
```typescript
// Page components (from components/{page-name}/)
import BucketCard from '@/components/dashboard/BucketCard';
import CreateBucketModal from '@/components/dashboard/CreateBucketModal';

// Common components
import PageMeta from '@/components/common/PageMeta';

// Domain types
import type { Bucket } from '@/types/bucket/bucket.types';

// Services
import { bucketApi } from '@/services/bucket/bucket.api';

// Shared hooks
import { useBuckets } from '@/hooks/bucket/useBuckets';

// Utils
import { parseDate } from '@/utils/bucket/bucket.utils';

// Page-local types (relative import)
import type { ActiveFilters } from './types';
```

## PAGE IMPLEMENTATION ESSENTIALS

### Main Page Component Pattern

```typescript
// src/pages/Dashboard/index.tsx
import { useState } from 'react';
import PageMeta from '@/components/common/PageMeta';
import BucketCard from '@/components/dashboard/BucketCard';
import type { DashboardData } from './types';
import { useBuckets } from '@/hooks/bucket/useBuckets';

export function Dashboard() {
  const { data, loading, error } = useBuckets();

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error.message} />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data.map(bucket => <BucketCard key={bucket.id} bucket={bucket} />)}
        </div>
      </div>
    </div>
  );
}
```

### Responsive Layout Patterns

```typescript
// Mobile-first responsive grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

// Container pattern (AVOID FIXED WIDTHS)
<div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

// Section spacing
<section className="py-12 sm:py-16 lg:py-20">

// Card pattern
<div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">

// Touch targets (min 44px)
<button className="min-h-[44px] px-4 py-2 ...">
```

### ⚠️ MOBILE RESPONSIVENESS RULES ⚠️

1.  **NO FIXED WIDTHS**: Never use `w-[800px]`. Always use `w-full max-w-[800px]`.
2.  **TOUCH FRIENDLY**: All interactive elements must be at least 44px high/wide on mobile.
3.  **SCROLLABLE CONTAINERS**: Tables and wide content must have `overflow-x-auto`.
4.  **STACKING**: Use `flex-col` by default, then `md:flex-row` for tablet/desktop.
5.  **PADDING**: Use smaller padding on mobile (`p-4`) and larger on desktop (`md:p-8`).
6.  **TESTING**: Always verify how the component looks on a mobile screen width (< 768px).

## TRANSLATIONS & I18N

**You MUST generate translations for every new page.**

**Rules for Translation Generation:**
1.  **Check Available Languages**: Look for existing language directories in the project (e.g., `public/locales/en`, `public/locales/pl`).
2.  **Generate for ALL Languages**: When creating a new page, you must generate a translation file for **EVERY** language currently existing in the project.
    *   *Example*: If the project has `en` and `pl`, and you create a `Dashboard` page, you must create `dashboard.json` in BOTH `en` and `pl` folders.
3.  **New Language Requests**:
    *   If the user prompt asks to add a **new language** (e.g., "add Japanese"), you must:
        *   Add the new language translation for the new page.
        *   **AND** generate translations for all other existing languages for the new page.
    *   *Example*: Project has `en`. User asks for "New Page with Japanese". You generate `en` AND `ja` translations for the New Page.

**Implementation Details:**
- **Create these files BEFORE writing the component code.**
- Create a dedicated JSON file for the page in each language folder (e.g., `locales/en/newPage.json`).
- Ensure keys are consistent across all language files.
- Use the project's i18n implementation (e.g., `useTranslation` hook) in the page component.

## THEMING & BRAND COLORS

**You MUST support dynamic theming (Blue, Orange, Green, Purple).**

**Rules for Theming:**
1.  **Use Brand Utility Classes**: NEVER hardcode specific color names like `blue`, `indigo`, or `purple` for primary elements.
    *   ❌ `bg-blue-500`, `text-indigo-600`, `border-purple-500`
    *   ✅ `bg-brand-500`, `text-brand-600`, `border-brand-500`
2.  **Charts & JavaScript**: When colors are needed in JavaScript (e.g., ApexCharts), use the `useTheme` hook and `themeColors` utility.

**Implementation Pattern for Charts:**
```typescript
import { useTheme } from "../../context/ThemeContext";
import { themeColors } from "../../shared/utils/themeColors";

export function MyChart() {
  const { colorTheme } = useTheme();
  
  const options = {
    colors: [themeColors[colorTheme].brand500, themeColors[colorTheme].brand300],
    // ...
  };
  
  // ...
}
```

## DARK MODE IMPLEMENTATION

**You MUST implement Dark Mode for every component.**

**Standard Dark Mode Patterns:**
- **Backgrounds**:
  - Page/Main: `bg-gray-50` → `dark:bg-gray-900`
  - Cards/Containers: `bg-white` → `dark:bg-gray-800`
  - Inputs/Dropdowns: `bg-white` → `dark:bg-gray-900`
- **Text**:
  - Headings/Primary: `text-gray-900` → `dark:text-white`
  - Secondary/Body: `text-gray-500` → `dark:text-gray-400`
- **Borders**:
  - Standard: `border-gray-200` → `dark:border-gray-700` or `dark:border-gray-800`

**Example:**
```tsx
<div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
  <h3 className="text-gray-900 dark:text-white font-bold">Title</h3>
  <p className="text-gray-500 dark:text-gray-400">Description text...</p>
</div>
```

## HTML PROTOTYPE CONVERSION

### Extract Components from Repeating Patterns

**HTML Prototype:**
```html
<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
  <div class="bg-white p-6 rounded-lg shadow">
    <h3>Feature 1</h3>
  </div>
  <!-- repeated... -->
</div>
```

**React Conversion:**
```typescript
// components/GenericCard.tsx (Generic Template)
interface GenericCardProps {
  title: string;
  content: React.ReactNode;
  footer?: string;
}

export function GenericCard({ title, content, footer }: GenericCardProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <div className="mb-4">{content}</div>
      {footer && <div className="text-sm text-gray-500">{footer}</div>}
    </div>
  );
}

// index.tsx (Page Configuration)
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  {features.map(f => (
    <GenericCard 
      key={f.id} 
      title={f.name} 
      content={f.description} 
      footer={`Updated: ${f.date}`}
    />
  ))}
</div>
```

### PRESERVE from prototype:
- ✅ Container widths, section spacing, grid/flex layouts
- ✅ All responsive breakpoints (`sm:`, `md:`, `lg:`, `xl:`)
- ✅ Padding, margins, visual hierarchy

### MAKE DYNAMIC (TEMPLATE MODE):
- ❌ Hardcoded text/labels → Props (defined in Page)
- ❌ Domain-specific field names → Generic props (e.g., `label`, `value`, `onChange`)
- ❌ Repeated blocks → Reusable components with `map()` in Page
- ❌ Static forms → Generic Form components configured via props

## POST-IMPLEMENTATION: ROUTING & NAVIGATION

**⚠️ CRITICAL - YOU MUST ALWAYS DO THIS ⚠️**

After implementing any page, you MUST complete these steps. These are NOT optional.

### ROUTING & NAVIGATION FOR THIS TEMPLATE

This template uses **explicit route definitions** following React Router v7 best practices. Follow these exact steps:

### 1. Add Route in App.tsx (REQUIRED)

**File:** `src/App.tsx`

**Steps:**
1. Import your new page component at the top
2. Add a `<Route>` element inside the `<Routes>` with `AppLayout`

```typescript
// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from "react-router";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import S3Dashboard from "./pages/Dashboard";
import NewPage from "./pages/NewPage"; // 1. ADD THIS IMPORT

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route element={<AppLayout />}>
          <Route index path="/" element={<S3Dashboard />} />
          {/* 2. ADD THIS ROUTE */}
          <Route path="/new-page" element={<NewPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
```

### 2. Add Navigation Item in AppSidebar.tsx (REQUIRED)

**File:** `src/layout/AppSidebar.tsx`

Add your page to the `navItems` array:

```typescript
// Near the top of the file, find the navItems array
const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    icon: <BoxCubeIcon className="w-5 h-5" />,
    path: '/',
  },
  // ADD YOUR NEW PAGE HERE
  {
    name: 'New Page',
    icon: <YourIcon className="w-5 h-5" />,
    path: '/new-page',
  },
];
```

### Verification Steps:

1. **Check `App.tsx`** - Ensure import and `<Route>` are added
2. **Check `AppSidebar.tsx`** - Ensure navigation item is added to `navItems`
3. **Test the route** - Navigate to `/new-page` in browser
4. **Check sidebar** - New page should appear in sidebar menu
5. **Verify navigation** - Click sidebar link to ensure it navigates correctly

### Page Registration Template:

**In App.tsx:**
```typescript
import YourPageName from "./pages/YourPageName";
// ... inside <Route element={<AppLayout />}>
<Route path="/your-page-name" element={<YourPageName />} />
```

**In AppSidebar.tsx:**
```typescript
{
  name: 'Your Page Name',
  icon: <YourIcon className="w-5 h-5" />,
  path: '/your-page-name',
},
```

## Implementation Workflow

1. Read requirements/prototype
2. Create page directory structure
3. **Generate translation files for ALL languages**
4. Implement type definitions
5. Build child components
6. Compose main page
7. Apply responsive design
8. **⚠️ REQUIRED: Add route in `src/App.tsx`**
9. **⚠️ REQUIRED: Add navigation item in `src/layout/AppSidebar.tsx`**

---

## REACT NATIVE / EXPO PAGES

**⚠️ DETECT PROJECT TYPE FIRST ⚠️**

Before implementing, check if the project is:
- **React Web**: Has `src/pages/`, uses `react-router-dom`, has `vite.config.ts`
- **React Native/Expo**: Has `app/(tabs)/`, uses `expo-router`, has `app.json`

### Expo Project Structure

```
app/
├── (tabs)/
│   ├── _layout.tsx           # Tab navigator config
│   ├── index.tsx             # Dashboard/Home screen
│   ├── settings.tsx          # Settings screen
│   └── your-page.tsx         # Your new screen
├── _layout.tsx               # Root layout
shared/
└── utils/
    └── pageDiscovery.ts      # Page registry for sidebar
```

### Expo Page Component Pattern

```typescript
// app/(tabs)/your-page.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { useTranslation } from 'react-i18next';

export default function YourPageScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation();

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: colors.text }]}>
        {t('yourPage.title')}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {t('yourPage.description')}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
});
```

### EXPO THEMING - USE useThemeColors()

**❌ NEVER hardcode colors:**
```typescript
<View style={{ backgroundColor: '#ffffff' }}>
<Text style={{ color: '#000000' }}>
```

**✅ ALWAYS use theme colors:**
```typescript
import { useThemeColors } from '@/context/ThemeContext';

const colors = useThemeColors();

<View style={{ backgroundColor: colors.background }}>
<Text style={{ color: colors.text }}>
<Text style={{ color: colors.textSecondary }}>
<View style={{ borderColor: colors.border }}>
<Text style={{ color: colors.primary }}>  // Brand color
```

### EXPO ROUTING & NAVIGATION (REQUIRED)

After creating any Expo page, you MUST complete these 2 steps:

#### Step 1: Register in pageDiscovery.ts

**File:** `shared/utils/pageDiscovery.ts`

```typescript
export const pages: PageConfig[] = [
  // Built-in pages
  { name: 'Dashboard', path: '/', icon: 'home-outline', translationKey: 'dashboard' },
  { name: 'Settings', path: '/settings', icon: 'settings-outline', translationKey: 'settings' },
  
  // Custom pages - ADD YOUR PAGE HERE
  { name: 'Your Page', path: '/your-page', icon: 'star-outline', translationKey: 'yourPage' },
];
```

**PageConfig properties:**
- `name`: Display name in sidebar
- `path`: Route path (e.g., `/your-page` for `app/(tabs)/your-page.tsx`)
- `icon`: Ionicons icon name (see https://ionic.io/ionicons)
- `translationKey`: (optional) i18n key from `locales/*/common.json`

#### Step 2: Hide from Tab Bar (if sidebar-only)

**File:** `app/(tabs)/_layout.tsx`

Add this inside the `<Tabs>` component:

```typescript
{/* Hide your-page from tab bar - accessible only via sidebar */}
<Tabs.Screen
  name="your-page"
  options={{
    title: 'Your Page',
    href: null,  // This hides it from the bottom tab bar
  }}
/>
```

### Expo Translations

Create/update translation files for your page:

**File:** `locales/en/common.json`
```json
{
  "yourPage": "Your Page",
  "yourPageTitle": "Your Page Title",
  "yourPageDescription": "Description text here"
}
```

**File:** `locales/pl/common.json` (and other languages)
```json
{
  "yourPage": "Twoja Strona",
  "yourPageTitle": "Tytuł Twojej Strony",
  "yourPageDescription": "Opis tutaj"
}
```

### Expo Implementation Checklist

1. ✅ Create page file: `app/(tabs)/your-page.tsx`
2. ✅ Use `useThemeColors()` for all colors
3. ✅ Use `useTranslation()` for text
4. ✅ Register in `shared/utils/pageDiscovery.ts`
5. ✅ Add `<Tabs.Screen>` with `href: null` in `app/(tabs)/_layout.tsx`
6. ✅ Add translations to ALL language files in `locales/`

---

## Remember

I implement complete, functional pages with all components, state management, and responsive design. 

**⚠️ ABSOLUTE REQUIREMENT - NO EXCEPTIONS ⚠️**

**For React Web projects:**
After implementing ANY new page, I MUST:
1. **Add route in `src/App.tsx`:**
   - Import: `import NewPage from "./pages/NewPage";`
   - Add Route: `<Route path="/new-page" element={<NewPage />} />`
2. **Add navigation in `src/layout/AppSidebar.tsx`:**
   - Add to `navItems`: `{ name: 'New Page', icon: <Icon />, path: '/new-page' }`

**For React Native/Expo projects:**
After implementing ANY new page, I MUST:
1. Create the page in `app/(tabs)/your-page.tsx`
2. Register in `shared/utils/pageDiscovery.ts`: `{ name: 'Your Page', path: '/your-page', icon: 'icon-name' }`
3. Add `<Tabs.Screen name="your-page" options={{ href: null }} />` in `app/(tabs)/_layout.tsx`

**This step is NOT optional. Routes and navigation must be explicitly defined.**
