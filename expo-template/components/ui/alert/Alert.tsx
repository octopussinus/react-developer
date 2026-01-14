import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  message: string;
  onClose?: () => void;
  style?: ViewStyle;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  message,
  onClose,
  style,
}) => {
  const colors = useThemeColors();

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          backgroundColor: `${colors.success}20`,
          borderColor: colors.success,
          iconColor: colors.success,
        };
      case 'warning':
        return {
          backgroundColor: `${colors.warning}20`,
          borderColor: colors.warning,
          iconColor: colors.warning,
        };
      case 'error':
        return {
          backgroundColor: `${colors.error}20`,
          borderColor: colors.error,
          iconColor: colors.error,
        };
      case 'info':
      default:
        return {
          backgroundColor: `${colors.info}20`,
          borderColor: colors.info,
          iconColor: colors.info,
        };
    }
  };

  const variantStyles = getVariantStyles();

  const getIcon = () => {
    switch (variant) {
      case 'success':
        return '✓';
      case 'warning':
        return '⚠';
      case 'error':
        return '✕';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor,
        },
        style,
      ]}
    >
      <View style={styles.iconContainer}>
        <Text style={[styles.icon, { color: variantStyles.iconColor }]}>
          {getIcon()}
        </Text>
      </View>
      <View style={styles.content}>
        {title && (
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        )}
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {message}
        </Text>
      </View>
      {onClose && (
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={[styles.closeIcon, { color: colors.textSecondary }]}>
            ✕
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  iconContainer: {
    marginRight: 12,
  },
  icon: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  closeIcon: {
    fontSize: 16,
  },
});

export default Alert;
