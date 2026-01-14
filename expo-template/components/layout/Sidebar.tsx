import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSidebar } from '@/context/SidebarContext';
import { useThemeColors } from '@/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAllPages } from '@/shared/utils/pageDiscovery';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.75;

export const Sidebar: React.FC = () => {
  const { isOpen, closeSidebar } = useSidebar();
  const colors = useThemeColors();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  
  // Get all pages from pageDiscovery (built-in + custom)
  // Called inside component to ensure updates are reflected
  const navigationItems = getAllPages();
  
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -SIDEBAR_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen]);

  const handleNavigation = (path: string) => {
    closeSidebar();
    // Navigate using the path from pageDiscovery (e.g., '/', '/settings', '/my-page')
    router.push(path as any);
  };

  const isActive = (path: string) => {
    // Handle root path
    if (path === '/') {
      return pathname === '/' || pathname === '/index' || pathname === '/(tabs)';
    }
    // Check if current pathname matches the page path
    return pathname === path || pathname.endsWith(path);
  };

  if (!isOpen) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Overlay */}
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: overlayAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.5],
            }),
          },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={closeSidebar} />
      </Animated.View>

      {/* Sidebar */}
      <Animated.View
        style={[
          styles.sidebar,
          {
            backgroundColor: colors.background,
            borderRightColor: colors.border,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <SafeAreaView style={styles.safeArea} edges={['top', 'left']}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {t('navigation')}
            </Text>
            <TouchableOpacity onPress={closeSidebar} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Navigation Items */}
          <ScrollView style={styles.navList} showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {t('pages')}
            </Text>
            
            {navigationItems.map((item, index) => {
              const active = isActive(item.path);
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.navItem,
                    active && { backgroundColor: colors.primary + '20' },
                  ]}
                  onPress={() => handleNavigation(item.path)}
                >
                  <Ionicons
                    name={active ? (item.icon.replace('-outline', '') as any) : item.icon}
                    size={22}
                    color={active ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.navItemText,
                      { color: active ? colors.primary : colors.text },
                      active && styles.navItemTextActive,
                    ]}
                  >
                    {item.translationKey ? t(item.translationKey) : item.name}
                  </Text>
                  {active && (
                    <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Expo Template v1.0.0
            </Text>
          </View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 100,
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    borderRightWidth: 1,
    zIndex: 101,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  navList: {
    flex: 1,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    borderRadius: 8,
    position: 'relative',
  },
  navItemText: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  navItemTextActive: {
    fontWeight: '600',
  },
  activeIndicator: {
    width: 4,
    height: 24,
    borderRadius: 2,
    position: 'absolute',
    right: 8,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default Sidebar;
