import type { Meta, StoryObj } from '@storybook/react-vite';
import { Chart } from '@/components/molecules/chart';

const data = [
  { month: 'Jan', revenue: 12400, refunds: 900 },
  { month: 'Feb', revenue: 15100, refunds: 1200 },
  { month: 'Mar', revenue: 14200, refunds: 1050 },
  { month: 'Apr', revenue: 18900, refunds: 1400 },
  { month: 'May', revenue: 21300, refunds: 1150 },
  { month: 'Jun', revenue: 19800, refunds: 1600 },
];

const series = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'refunds', label: 'Refunds' },
];

const meta = {
  title: 'Molecules/Chart',
  component: Chart,
  tags: ['autodocs'],
  args: {
    data,
    series,
    xKey: 'month',
    title: 'Revenue vs refunds',
    formatValue: (value: number) => `$${value.toLocaleString()}`,
  },
} satisfies Meta<typeof Chart<(typeof data)[number]>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Line: Story = {};
export const Bar: Story = { args: { type: 'bar' } };
export const Area: Story = { args: { type: 'area' } };

/* One series gets no legend -- the title already names what is plotted. */
export const SingleSeries: Story = {
  args: { series: [{ key: 'revenue', label: 'Revenue' }], title: 'Revenue' },
};

/* The table view is the documented relief for the sub-3:1 light-mode hues,
   so it is a first-class state, not a hidden extra. */
export const TableView: Story = {
  play: ({ canvasElement }) => {
    canvasElement.querySelector<HTMLButtonElement>('button')?.click();
  },
};

export const Empty: Story = { args: { data: [] } };
