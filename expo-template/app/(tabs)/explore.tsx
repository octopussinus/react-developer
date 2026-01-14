import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { Card } from '@/components/ui/card/Card';
import { ComponentCard } from '@/components/common/ComponentCard';
import { Button } from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/badge/Badge';
import { Alert } from '@/components/ui/alert/Alert';
import { Avatar } from '@/components/ui/avatar/Avatar';

export default function ExploreScreen() {
  const colors = useThemeColors();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Explore</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Discover the UI components available in this template.
        </Text>
      </View>

      <ComponentCard title="Buttons" description="Various button styles">
        <View style={styles.buttonRow}>
          <Button variant="primary" size="sm">Primary</Button>
          <Button variant="secondary" size="sm">Secondary</Button>
          <Button variant="outline" size="sm">Outline</Button>
        </View>
        <View style={styles.buttonRow}>
          <Button variant="ghost" size="sm">Ghost</Button>
          <Button variant="danger" size="sm">Danger</Button>
        </View>
      </ComponentCard>

      <ComponentCard title="Badges" description="Status indicators">
        <View style={styles.badgeRow}>
          <Badge variant="primary">Primary</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="error">Error</Badge>
          <Badge variant="info">Info</Badge>
        </View>
      </ComponentCard>

      <ComponentCard title="Alerts" description="Notification messages">
        <View style={styles.alertStack}>
          <Alert
            variant="success"
            title="Success"
            message="Operation completed successfully!"
          />
          <Alert
            variant="warning"
            message="Please review your input before continuing."
          />
          <Alert
            variant="error"
            title="Error"
            message="Something went wrong. Please try again."
          />
          <Alert
            variant="info"
            message="New features are available. Check the changelog."
          />
        </View>
      </ComponentCard>

      <ComponentCard title="Avatars" description="User profile images">
        <View style={styles.avatarRow}>
          <Avatar name="John Doe" size="xs" />
          <Avatar name="Jane Smith" size="sm" />
          <Avatar name="Bob Johnson" size="md" />
          <Avatar name="Alice Brown" size="lg" />
          <Avatar name="Charlie Wilson" size="xl" />
        </View>
      </ComponentCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  alertStack: {
    gap: 12,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
