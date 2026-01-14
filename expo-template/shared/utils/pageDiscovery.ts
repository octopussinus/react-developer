/**
 * Page Registry for Expo Router Navigation
 * 
 * This file manages all navigable pages in the sidebar.
 * When adding a new page, simply add it to the `pages` array below.
 * 
 * AGENT INSTRUCTIONS:
 * When creating a new page:
 * 1. Create your page component in app/(tabs)/your-page.tsx
 * 2. Add ONE line to the `pages` array below
 * 
 * Example: { name: 'My Page', path: '/my-page', icon: 'star-outline' }
 */

import { Ionicons } from '@expo/vector-icons';

export interface PageConfig {
  /** Display name shown in sidebar */
  name: string;
  /** Route path (without /(tabs) prefix) e.g., '/' for index, '/settings' for settings */
  path: string;
  /** Ionicons icon name - see https://ionic.io/ionicons */
  icon: keyof typeof Ionicons.glyphMap;
  /** Optional i18n translation key from locales/common.json */
  translationKey?: string;
}

/**
 * All navigable pages in the app
 * 
 * Add your custom pages here - they will automatically appear in the sidebar
 */
export const pages: PageConfig[] = [
  // Built-in pages
  { name: 'Dashboard', path: '/', icon: 'home-outline', translationKey: 'dashboard' },
  { name: 'Settings', path: '/settings', icon: 'settings-outline', translationKey: 'settings' },
  
  // Custom pages - add your pages below this line
  { name: 'Hello', path: '/hello', icon: 'hand-left-outline' },
];

/**
 * Get all pages for navigation
 * Used by Sidebar component
 */
export const getAllPages = (): PageConfig[] => pages;
