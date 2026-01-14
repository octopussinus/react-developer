import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, ViewStyle } from 'react-native';
import { useThemeColors } from '../context/ThemeContext';
import AppHeader from './AppHeader';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  headerLeftComponent?: React.ReactNode;
  headerRightComponent?: React.ReactNode;
  showHeader?: boolean;
  showThemeToggle?: boolean;
  scrollable?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: ViewStyle;
  noPadding?: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  title,
  headerLeftComponent,
  headerRightComponent,
  showHeader = true,
  showThemeToggle = true,
  scrollable = true,
  refreshing = false,
  onRefresh,
  contentStyle,
  noPadding = false,
}) => {
  const colors = useThemeColors();

  const content = (
    <View
      style={[
        styles.content,
        { backgroundColor: colors.background },
        !noPadding && styles.padding,
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {showHeader && (
        <AppHeader
          title={title}
          leftComponent={headerLeftComponent}
          rightComponent={headerRightComponent}
          showThemeToggle={showThemeToggle}
        />
      )}
      {scrollable ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            ) : undefined
          }
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
  },
  padding: {
    padding: 16,
  },
});

export default AppLayout;
