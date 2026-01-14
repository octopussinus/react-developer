# React Template - Simplified Dashboard

A streamlined React + TypeScript + Tailwind CSS admin dashboard with **automatic page discovery**.

## ✨ Key Feature: Auto-Discovery System

Simply drop a `.tsx` file into `src/pages/custom/` and it will automatically:
- ✅ Create a route
- ✅ Add a button to the sidebar
- ✅ Use the filename as the page name

No manual routing or configuration needed!

## Overview

React Template provides essential UI components and layouts for building feature-rich, data-driven admin dashboards and
control panels. It's built on:

- React 19
- TypeScript
- Tailwind CSS v4

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or later (recommended: Node.js 20.x+)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to `http://localhost:5173`

## 📝 How to Add a New Page

### Step 1: Create a new file in `src/pages/custom/`

Example: `src/pages/custom/MyPage.tsx`

```tsx
import PageMeta from "../../components/common/PageMeta";

export default function MyPage() {
  return (
    <>
      <PageMeta
        title="My Page | React Template"
        description="This is my custom page"
      />
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          My Page
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Your content here...
        </p>
      </div>
    </>
  );
}
```

### Step 2: That's it! 🎉

The page will automatically:
- Be accessible at `/mypage`
- Show "My Page" in the sidebar under "Pages"
- Display when you click the sidebar button

### Naming Convention

| Filename | Sidebar Name | URL Path |
|----------|-------------|----------|
| `MyPage.tsx` | "My Page" | `/mypage` |
| `UserSettings.tsx` | "User Settings" | `/usersettings` |
| `Analytics.tsx` | "Analytics" | `/analytics` |

## 📁 Project Structure

```
src/
├── pages/
│   ├── custom/          # 👈 Add your pages here!
│   │   ├── Example.tsx
│   │   ├── Analytics.tsx
│   │   └── README.md
│   └── Dashboard/
│       └── Home.tsx     # Main dashboard
├── components/
│   ├── common/
│   ├── ecommerce/       # Dashboard components
│   └── header/
├── layout/
│   ├── AppLayout.tsx
│   ├── AppSidebar.tsx   # Auto-updated sidebar
│   └── AppHeader.tsx
└── utils/
    └── pageDiscovery.ts # Auto-discovery system
```

## 🎨 Available Components

The dashboard includes:

- ✅ Ecommerce Dashboard (Home page)
- ✅ Responsive Sidebar with auto-discovery
- ✅ Dark Mode support
- ✅ Header with notifications and user dropdown
- ✅ Data visualization components (charts, metrics)
- ✅ Tailwind CSS for easy customization

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 💡 Tips

1. **Use PascalCase** for filenames (e.g., `UserSettings.tsx`, `Analytics.tsx`)
2. **Component name should match filename** for consistency
3. **Always export as default** for auto-discovery to work
4. **Use PageMeta component** for SEO optimization
5. **Leverage Tailwind CSS** for styling

## 🎯 What Was Removed

This is a simplified version with:
- ❌ All extra pages removed (Forms, Tables, Charts, Auth, etc.)
- ❌ Unused components cleaned up
- ✅ Only Dashboard and auto-discovery system remain
- ✅ Clean, minimal starting point

## 📋 Changelog

### Simplified Version - [Current]

- ✅ Implemented automatic page discovery system
- ✅ Removed all unnecessary pages and components
- ✅ Simplified to Dashboard + Custom Pages only
- ✅ Auto-updating sidebar navigation
- ✅ Zero-configuration page creation

### Based on Version 2.0.2

- React 19
- Tailwind CSS v4
- TypeScript support
- Modern React patterns

## License

React Template is released under the MIT License.

## Support

If you find this project helpful, please consider giving it a star on GitHub. Your support helps us continue developing
and maintaining this template.
