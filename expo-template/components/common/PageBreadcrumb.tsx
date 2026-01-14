import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';

interface PageBreadcrumbProps {
  items: string[];
}

export const PageBreadcrumb: React.FC<PageBreadcrumbProps> = ({ items }) => {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      {items.map((item, index) => (
        <View key={index} style={styles.itemContainer}>
          <Text
            style={[
              styles.item,
              {
                color:
                  index === items.length - 1
                    ? colors.text
                    : colors.textSecondary,
              },
              index === items.length - 1 && styles.activeItem,
            ]}
          >
            {item}
          </Text>
          {index < items.length - 1 && (
            <Text style={[styles.separator, { color: colors.textSecondary }]}>
              /
            </Text>
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingVertical: 8,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {
    fontSize: 14,
  },
  activeItem: {
    fontWeight: '500',
  },
  separator: {
    marginHorizontal: 8,
    fontSize: 14,
  },
});

export default PageBreadcrumb;
