import type { Meta, StoryObj } from '@storybook/react-vite';
import { ThemeToggle } from '@/components/molecules/theme-toggle';

const meta = {
  title: 'Molecules/ThemeToggle',
  component: ThemeToggle,
  tags: ['autodocs'],
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
