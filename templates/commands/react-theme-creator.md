---
description: Create new themes with complete color palettes and style tokens for the application theming system
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty). The user input will typically specify:
- Theme name and identifier
- A description/mood for the theme (e.g., "warm sunset", "forest vibes", "cyberpunk", "minimal elegant")
- Primary/accent color (optional - can be auto-generated from description)
- Light or dark preference (optional)

## ⚠️ CRITICAL SCOPE - THEME CREATION ONLY ⚠️

**I AM A THEME CREATOR - NOT A COMPONENT DEVELOPER**

✅ I MUST ONLY CREATE/MODIFY:
- Theme configuration in `src/config/themes.ts`
- Theme-specific CSS styles in `src/index.css` (if needed for special theme behaviors)

❌ I MUST NEVER CREATE/MODIFY:
- React components
- Page layouts
- Context providers (ThemeContext already handles theme application)
- Any other files

## THEME SYSTEM ARCHITECTURE

The project uses a comprehensive theming system with these key files:

### 1. Theme Configuration: `src/config/themes.ts`

This is where all themes are defined. Each theme is a `ThemePreset` object with:

```typescript
interface ThemePreset {
  id: string;           // Unique identifier (used as theme key)
  name: string;         // Display name in UI
  description: string;  // Short description for UI
  icon: string;         // Emoji icon for UI
  colors: ColorScale;   // 12-shade color palette
  style: StyleTokens;   // Design system tokens
}
```

### 2. ColorScale Interface (12 shades from light to dark)

```typescript
interface ColorScale {
  25: string;   // Lightest tint (backgrounds, subtle highlights)
  50: string;   // Very light (hover states)
  100: string;  // Light (selected backgrounds)
  200: string;  // Light-medium
  300: string;  // Medium-light (secondary elements)
  400: string;  // Medium (icons, secondary text)
  500: string;  // PRIMARY - Main brand color
  600: string;  // Primary hover state
  700: string;  // Dark (pressed states)
  800: string;  // Very dark
  900: string;  // Near black
  950: string;  // Darkest
}
```

### 3. StyleTokens Interface (Design system tokens)

```typescript
interface StyleTokens {
  // Spacing
  spacingUnit: string;                 // Base unit (e.g., "4px")
  
  // Border Radius - Controls roundness
  radiusSm: string;                    // Small elements (e.g., "4px" or "0")
  radiusMd: string;                    // Medium elements
  radiusLg: string;                    // Large elements
  radiusXl: string;                    // Extra large
  radiusFull: string;                  // Pills/circles (e.g., "9999px" or "0.25rem")
  
  // Component Sizes
  buttonHeight: string;                // Default button height
  buttonHeightSm: string;              // Small button
  buttonHeightLg: string;              // Large button
  inputHeight: string;                 // Form input height
  
  // Shadows - Elevation system
  shadowXs: string;                    // Minimal shadow
  shadowSm: string;                    // Small shadow
  shadowMd: string;                    // Medium shadow
  shadowLg: string;                    // Large shadow
  shadowXl: string;                    // Extra large shadow
  
  // Borders
  borderWidth: string;                 // Border thickness
  borderStyle: string;                 // Border style (solid)
  
  // Card/Panel styles
  cardBg: string;                      // Light mode background
  cardBgDark: string;                  // Dark mode background
  cardBorder: string;                  // Light mode border
  cardBorderDark: string;              // Dark mode border
  
  // Button styles
  buttonTextTransform: string;         // none | uppercase
  buttonFontWeight: string;            // 500 | 700
  buttonLetterSpacing: string;         // 0 | 0.05em
  
  // Sidebar
  sidebarWidth: string;                // Sidebar width
  sidebarBg: string;                   // Light mode sidebar bg
  sidebarBgDark: string;               // Dark mode sidebar bg
}
```

## EXISTING THEMES (For Reference)

### Default Theme (Aqua) - Soft, Modern, Rounded
```typescript
{
  id: "default",
  name: "Aqua",
  description: "Clean & modern with soft shadows",
  icon: "🌊",
  colors: {
    25: "#f2f7ff", 50: "#ecf3ff", 100: "#dde9ff", 200: "#c2d6ff",
    300: "#9cb9ff", 400: "#7592ff", 500: "#465fff", 600: "#3641f5",
    700: "#2a31d8", 800: "#252dae", 900: "#262e89", 950: "#161950",
  },
  style: {
    spacingUnit: "4px",
    radiusSm: "4px", radiusMd: "6px", radiusLg: "8px", radiusXl: "10px",
    radiusFull: "9999px",
    buttonHeight: "2.75rem", buttonHeightSm: "2.25rem", buttonHeightLg: "3rem",
    inputHeight: "2.75rem",
    shadowXs: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    shadowSm: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
    shadowMd: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
    shadowLg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
    shadowXl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
    borderWidth: "1px", borderStyle: "solid",
    cardBg: "#ffffff", cardBgDark: "#1d2939",
    cardBorder: "transparent", cardBorderDark: "transparent",
    buttonTextTransform: "none", buttonFontWeight: "500", buttonLetterSpacing: "0",
    sidebarWidth: "280px", sidebarBg: "#ffffff", sidebarBgDark: "#1d2939",
  },
}
```

### Neo Theme - Flat, Bold, Sharp
```typescript
{
  id: "neo",
  name: "Neo",
  description: "Bold, flat, sharp & minimal",
  icon: "⚡",
  colors: {
    // Vibrant violet/magenta palette
    25: "#fdf4ff", 50: "#fae8ff", 100: "#f5d0fe", 200: "#f0abfc",
    300: "#e879f9", 400: "#d946ef", 500: "#c026d3", 600: "#a21caf",
    700: "#86198f", 800: "#701a75", 900: "#581c87", 950: "#3b0764",
  },
  style: {
    spacingUnit: "3px",
    radiusSm: "0", radiusMd: "0.125rem", radiusLg: "0.25rem", radiusXl: "0.375rem",
    radiusFull: "0.25rem", // Sharp, not circular
    buttonHeight: "2.5rem", buttonHeightSm: "2rem", buttonHeightLg: "2.75rem",
    inputHeight: "2.5rem",
    // NO shadows
    shadowXs: "none", shadowSm: "none", shadowMd: "none",
    shadowLg: "none", shadowXl: "none",
    borderWidth: "2px", borderStyle: "solid",
    cardBg: "#fafafa", cardBgDark: "#18181b",
    cardBorder: "#e4e4e7", cardBorderDark: "#3f3f46",
    buttonTextTransform: "uppercase", buttonFontWeight: "700", buttonLetterSpacing: "0.05em",
    sidebarWidth: "260px", sidebarBg: "#fafafa", sidebarBgDark: "#18181b",
  },
}
```

## CREATING A NEW THEME - STEP BY STEP

### Step 1: Generate the Color Palette

Create a harmonious 12-shade color scale based on the user's requested primary color or mood.

**Color Scale Generation Rules:**
1. **500 shade** = Primary brand color (most used)
2. **25-200 shades** = Progressively lighter tints (for backgrounds, subtle UI)
3. **300-400 shades** = Mid-range (for secondary elements, icons)
4. **600-700 shades** = Darker (for hover states, pressed states)
5. **800-950 shades** = Very dark (for dark mode text, strong accents)

**Example Palettes by Mood:**

| Mood | 500 Color | Style Suggestion |
|------|-----------|------------------|
| Ocean/Aqua | `#465fff` | Soft shadows, rounded |
| Sunset/Warm | `#f97316` | Warm shadows, rounded |
| Forest/Nature | `#22c55e` | Soft, organic |
| Cyberpunk/Neon | `#c026d3` | Flat, sharp, no shadows |
| Minimal/Elegant | `#0f172a` | Subtle, refined |
| Coral/Playful | `#fb7185` | Soft, rounded, playful |

### Step 2: Define the Style Tokens

Choose style tokens that match the theme's personality:

| Theme Type | Radius | Shadows | Border | Button Style |
|------------|--------|---------|--------|--------------|
| **Soft/Modern** | Rounded (4-10px) | Soft elevated | Thin/none | Normal weight |
| **Flat/Bold** | Sharp (0-2px) | None | Thick (2px) | Uppercase, bold |
| **Minimal** | Subtle (2-4px) | Minimal | Thin | Light weight |
| **Playful** | Very rounded | Soft | None | Normal |

### Step 3: Add Theme to `src/config/themes.ts`

1. Open `src/config/themes.ts`
2. Add your new theme object to the `themes` Record:

```typescript
export const themes: Record<string, ThemePreset> = {
  default: { /* existing */ },
  neo: { /* existing */ },
  
  // ADD YOUR NEW THEME HERE
  yourTheme: {
    id: "yourTheme",
    name: "Your Theme Name",
    description: "Short description for UI",
    icon: "🎨", // Choose appropriate emoji
    colors: {
      25: "#...", 50: "#...", 100: "#...", 200: "#...",
      300: "#...", 400: "#...", 500: "#...", 600: "#...",
      700: "#...", 800: "#...", 900: "#...", 950: "#...",
    },
    style: {
      spacingUnit: "4px",
      radiusSm: "...", radiusMd: "...", radiusLg: "...",
      radiusXl: "...", radiusFull: "...",
      buttonHeight: "...", buttonHeightSm: "...", buttonHeightLg: "...",
      inputHeight: "...",
      shadowXs: "...", shadowSm: "...", shadowMd: "...",
      shadowLg: "...", shadowXl: "...",
      borderWidth: "...", borderStyle: "solid",
      cardBg: "...", cardBgDark: "...",
      cardBorder: "...", cardBorderDark: "...",
      buttonTextTransform: "...", buttonFontWeight: "...", buttonLetterSpacing: "...",
      sidebarWidth: "...", sidebarBg: "...", sidebarBgDark: "...",
    },
  },
};
```

### Step 4: Add Theme-Specific CSS in `src/index.css` (If Needed)

Only add CSS if your theme requires special styling behaviors NOT covered by CSS variables.

**Location:** Inside `@layer base { }`, after existing theme selectors

```css
/* Example: Theme-specific overrides */
[data-theme="yourTheme"] {
  /* Custom gray palette if needed */
  --color-gray-50: #yourGray50;
  --color-gray-100: #yourGray100;
}

/* Example: Special button styling */
[data-theme="yourTheme"] button,
[data-theme="yourTheme"] [role="button"] {
  text-transform: var(--theme-button-text-transform);
  font-weight: var(--theme-button-font-weight);
  letter-spacing: var(--theme-button-letter-spacing);
}

/* Example: Remove shadows for flat theme */
[data-theme="yourTheme"] .shadow-sm,
[data-theme="yourTheme"] .shadow-md {
  box-shadow: none !important;
}
```

## THEME DESIGN GUIDELINES

### Color Harmony

1. **Monochromatic**: Single hue with varying saturation/lightness
2. **Analogous**: Adjacent colors on color wheel
3. **Complementary**: Opposite colors (use sparingly)

### Accessibility Considerations

- Ensure sufficient contrast between text and backgrounds
- 500 shade should have good contrast on both light and dark backgrounds
- 300-400 shades work well for icons and secondary text

### Dark Mode Compatibility

The theme system automatically handles dark mode via:
- `cardBg` vs `cardBgDark`
- `cardBorder` vs `cardBorderDark`
- `sidebarBg` vs `sidebarBgDark`

## OUTPUT CHECKLIST

After creating a new theme, verify:

- [ ] Theme object added to `themes` Record in `src/config/themes.ts`
- [ ] All 12 color shades defined (25, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950)
- [ ] All style tokens defined
- [ ] Theme has unique `id`, descriptive `name`, `description`, and `icon`
- [ ] Colors form a harmonious palette
- [ ] Style tokens match the intended visual personality
- [ ] (Optional) CSS overrides added in `src/index.css` if needed

## EXAMPLE: Creating a "Sunset" Theme

User input: "Create a warm sunset theme with orange colors"

```typescript
sunset: {
  id: "sunset",
  name: "Sunset",
  description: "Warm and inviting with golden hues",
  icon: "🌅",
  colors: {
    25: "#fffbf5",
    50: "#fff7ed",
    100: "#ffedd5",
    200: "#fed7aa",
    300: "#fdba74",
    400: "#fb923c",
    500: "#f97316",  // Primary orange
    600: "#ea580c",
    700: "#c2410c",
    800: "#9a3412",
    900: "#7c2d12",
    950: "#431407",
  },
  style: {
    spacingUnit: "4px",
    radiusSm: "6px",
    radiusMd: "8px",
    radiusLg: "12px",
    radiusXl: "16px",
    radiusFull: "9999px",
    buttonHeight: "2.75rem",
    buttonHeightSm: "2.25rem",
    buttonHeightLg: "3rem",
    inputHeight: "2.75rem",
    shadowXs: "0 1px 2px 0 rgba(249, 115, 22, 0.05)",
    shadowSm: "0 1px 3px 0 rgba(249, 115, 22, 0.1), 0 1px 2px -1px rgba(249, 115, 22, 0.1)",
    shadowMd: "0 4px 6px -1px rgba(249, 115, 22, 0.1), 0 2px 4px -2px rgba(249, 115, 22, 0.1)",
    shadowLg: "0 10px 15px -3px rgba(249, 115, 22, 0.1), 0 4px 6px -4px rgba(249, 115, 22, 0.1)",
    shadowXl: "0 20px 25px -5px rgba(249, 115, 22, 0.1), 0 8px 10px -6px rgba(249, 115, 22, 0.1)",
    borderWidth: "1px",
    borderStyle: "solid",
    cardBg: "#fffbf9",
    cardBgDark: "#1c1917",
    cardBorder: "#fed7aa",
    cardBorderDark: "#44403c",
    buttonTextTransform: "none",
    buttonFontWeight: "500",
    buttonLetterSpacing: "0",
    sidebarWidth: "280px",
    sidebarBg: "#fffbf9",
    sidebarBgDark: "#1c1917",
  },
},
```

## Remember

I ONLY create theme configurations. I provide complete, production-ready theme definitions with harmonious color palettes and consistent design tokens. The theme will be automatically available in the theme switcher UI once added to the `themes` Record.
