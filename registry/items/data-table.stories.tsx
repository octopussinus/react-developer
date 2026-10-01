import type { Meta, StoryObj } from '@storybook/react-vite';
import { DataTable, type Column } from '@/components/organisms/data-table';

interface Order {
  id: string;
  customer: string;
  total: number;
}

const rows: Order[] = [
  { id: 'A-1001', customer: 'Acme Corp', total: 2400 },
  { id: 'A-1002', customer: 'Globex', total: 980 },
  { id: 'A-1003', customer: 'Initech', total: 15600 },
];

const columns: Column<Order>[] = [
  { id: 'id', header: 'Order', cell: (r) => r.id, sortValue: (r) => r.id },
  { id: 'customer', header: 'Customer', cell: (r) => r.customer, sortValue: (r) => r.customer },
  {
    id: 'total',
    header: 'Total',
    cell: (r) => `$${r.total.toLocaleString()}`,
    sortValue: (r) => r.total,
    align: 'right',
  },
];

const meta = {
  title: 'Organisms/DataTable',
  component: DataTable,
  tags: ['autodocs'],
  args: { rows, columns, rowKey: (r: Order) => r.id, caption: 'Recent orders' },
} satisfies Meta<typeof DataTable<Order>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Loading: Story = { args: { isLoading: true } };
export const Empty: Story = { args: { rows: [] } };
/* Long content is where tables actually break. */
export const LongContent: Story = {
  args: {
    rows: [{ id: 'A-1004', customer: 'ü'.repeat(70), total: 99999999 }],
  },
};
