import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './badge';

const meta = {
  title: 'Atoms/Badge',
  component: Badge,
  tags: ['autodocs'],
  args: { children: 'Pending' },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = {};
export const Success: Story = { args: { tone: 'success', children: 'Paid' } };
export const Warning: Story = { args: { tone: 'warning', children: 'Awaiting review' } };
export const Danger: Story = { args: { tone: 'danger', children: 'Failed' } };
