import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { Card } from '../ui/card/Card';

interface ComponentCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export const ComponentCard: React.FC<ComponentCardProps> = ({
  title,
  description,
  children,
  style,
}) => {
  const colors = useThemeColors();

  return (
    <Card style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {description && (
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {description}
          </Text>
        )}
      </View>
      <View style={styles.content}>{children}</View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
  },
  content: {},
});

export default ComponentCard;
