// Auto-discovery system for custom pages
// This file automatically discovers all .tsx files in the custom pages folder

export interface CustomPage {
  name: string;
  path: string;
  component: React.ComponentType;
}

// Import all custom pages dynamically
const customPageModules = import.meta.glob('../pages/custom/*.tsx', { eager: true });

export const customPages: CustomPage[] = Object.entries(customPageModules).map(([path, module]) => {
  // Extract filename without extension
  const fileName = path.split('/').pop()?.replace('.tsx', '') || '';

  // Convert filename to readable name (e.g., "MyPage" -> "My Page")
  const pageName = fileName.replace(/([A-Z])/g, ' $1').trim();

  // Create URL-friendly path
  const urlPath = `/${fileName.toLowerCase().replace(/\s+/g, '-')}`;

  return {
    name: pageName,
    path: urlPath,
    component: (module as any).default,
  };
});
