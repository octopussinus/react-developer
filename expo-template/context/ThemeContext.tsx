import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'light' | 'dark';
type ColorTheme = 'blue' | 'orange' | 'green' | 'purple';

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = '@theme';
const COLOR_THEME_KEY = '@color_theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>(systemColorScheme || 'light');
  const [colorTheme, setColorThemeState] = useState<ColorTheme>('blue');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Load saved theme preferences
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_KEY);
        const savedColorTheme = await AsyncStorage.getItem(COLOR_THEME_KEY);
        
        if (savedTheme) {
          setTheme(savedTheme as Theme);
        }
        if (savedColorTheme) {
          setColorThemeState(savedColorTheme as ColorTheme);
        }
      } catch (error) {
        console.log('Error loading theme:', error);
      }
      setIsInitialized(true);
    };
    
    loadTheme();
  }, []);

  useEffect(() => {
    if (isInitialized) {
      AsyncStorage.setItem(THEME_KEY, theme);
    }
  }, [theme, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      AsyncStorage.setItem(COLOR_THEME_KEY, colorTheme);
    }
  }, [colorTheme, isInitialized]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const setColorTheme = (newColorTheme: ColorTheme) => {
    setColorThemeState(newColorTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colorTheme, setColorTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Theme colors for React Native
export const themeColors = {
  light: {
    background: '#FFFFFF',
    surface: '#F9FAFB',
    text: '#1F2937',
    textSecondary: '#6B7280',
    primary: '#3B82F6',
    primaryDark: '#2563EB',
    border: '#E5E7EB',
    card: '#FFFFFF',
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
    info: '#3B82F6',
  },
  dark: {
    background: '#111827',
    surface: '#1F2937',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    primary: '#3B82F6',
    primaryDark: '#60A5FA',
    border: '#374151',
    card: '#1F2937',
    error: '#F87171',
    success: '#34D399',
    warning: '#FBBF24',
    info: '#60A5FA',
  },
};

export const useThemeColors = () => {
  const { theme } = useTheme();
  return themeColors[theme];
};
