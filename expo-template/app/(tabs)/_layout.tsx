import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useSidebar } from '@/context/SidebarContext';
import { useTranslation } from 'react-i18next';

export default function TabLayout() {
  const { theme, colorTheme } = useTheme();
  const { openSidebar } = useSidebar();
  const { t } = useTranslation();

  // Get brand color based on current color theme
  const getBrandColor = () => {
    const colors: Record<string, string> = {
      blue: '#3b82f6',
      orange: '#f97316',
      green: '#22c55e',
      purple: '#a855f7',
    };
    return colors[colorTheme] || colors.blue;
  };

  const brandColor = getBrandColor();
  const backgroundColor = theme === 'dark' ? '#111827' : '#ffffff';
  const inactiveColor = theme === 'dark' ? '#9ca3af' : '#6b7280';
  const headerTextColor = theme === 'dark' ? '#ffffff' : '#111827';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: brandColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          backgroundColor,
          borderTopColor: theme === 'dark' ? '#374151' : '#e5e7eb',
        },
        headerStyle: {
          backgroundColor,
        },
        headerTintColor: headerTextColor,
        headerLeft: () => (
          <TouchableOpacity
            onPress={openSidebar}
            style={{ marginLeft: 16, padding: 4 }}
          >
            <Ionicons name="menu" size={24} color={headerTextColor} />
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('dashboard'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
      {/* Hide explore from tab bar */}
      <Tabs.Screen
        name="explore"
        options={{
          href: null, // This removes the tab from the tab bar
        }}
      />
      {/* Hide hello from tab bar - accessible only via sidebar */}
      <Tabs.Screen
        name="hello"
        options={{
          title: 'Hello',
          href: null,
        }}
      />
    </Tabs>
  );
}
