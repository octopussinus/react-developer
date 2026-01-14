export const themeColors = {
  blue: {
    brand500: "#465fff",
    brand300: "#9cb9ff",
  },
  orange: {
    brand500: "#fb6514",
    brand300: "#feb273",
  },
  green: {
    brand500: "#12b76a",
    brand300: "#6ce9a6",
  },
  purple: {
    brand500: "#9e77ed",
    brand300: "#d6bbfb",
  },
} as const;

export type ColorTheme = keyof typeof themeColors;
