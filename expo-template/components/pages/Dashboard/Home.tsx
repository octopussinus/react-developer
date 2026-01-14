import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { Card } from '../../ui/card/Card';
import { Badge } from '../../ui/badge/Badge';

// Mock data for the dashboard
const metrics = [
  { label: 'Total Revenue', value: '$45,231', change: '+12.5%', positive: true },
  { label: 'Total Orders', value: '1,234', change: '+8.2%', positive: true },
  { label: 'Active Users', value: '5,678', change: '-2.1%', positive: false },
  { label: 'Conversion Rate', value: '3.24%', change: '+0.5%', positive: true },
];

const recentOrders = [
  { id: '#12345', customer: 'John Doe', amount: '$125.00', status: 'Completed' },
  { id: '#12346', customer: 'Jane Smith', amount: '$89.50', status: 'Pending' },
  { id: '#12347', customer: 'Bob Johnson', amount: '$250.00', status: 'Completed' },
  { id: '#12348', customer: 'Alice Brown', amount: '$175.00', status: 'Processing' },
];

export const Home: React.FC = () => {
  const colors = useThemeColors();

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'success';
      case 'Pending':
        return 'warning';
      case 'Processing':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Dashboard</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Welcome back! Here's what's happening today.
        </Text>
      </View>

      {/* Metrics Grid */}
      <View style={styles.metricsGrid}>
        {metrics.map((metric, index) => (
          <Card key={index} style={styles.metricCard}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
              {metric.label}
            </Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>
              {metric.value}
            </Text>
            <Text
              style={[
                styles.metricChange,
                { color: metric.positive ? colors.success : colors.error },
              ]}
            >
              {metric.change}
            </Text>
          </Card>
        ))}
      </View>

      {/* Recent Orders */}
      <Card style={styles.ordersCard}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Recent Orders
        </Text>
        {recentOrders.map((order, index) => (
          <View
            key={order.id}
            style={[
              styles.orderItem,
              index < recentOrders.length - 1 && {
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <View style={styles.orderInfo}>
              <Text style={[styles.orderId, { color: colors.text }]}>
                {order.id}
              </Text>
              <Text style={[styles.customerName, { color: colors.textSecondary }]}>
                {order.customer}
              </Text>
            </View>
            <View style={styles.orderRight}>
              <Text style={[styles.orderAmount, { color: colors.text }]}>
                {order.amount}
              </Text>
              <Badge variant={getStatusVariant(order.status)} size="sm">
                {order.status}
              </Badge>
            </View>
          </View>
        ))}
      </Card>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.primary }]}>78%</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Monthly Target
          </Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.success }]}>156</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            New Customers
          </Text>
        </Card>
      </View>
    </ScrollView>
  );
};

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
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 16,
  },
  metricCard: {
    width: '48%',
    marginHorizontal: '1%',
    marginBottom: 12,
    padding: 16,
  },
  metricLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricChange: {
    fontSize: 12,
    fontWeight: '500',
  },
  ordersCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  orderInfo: {},
  orderId: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  customerName: {
    fontSize: 12,
  },
  orderRight: {
    alignItems: 'flex-end',
  },
  orderAmount: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: -6,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 6,
    alignItems: 'center',
    padding: 20,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default Home;
