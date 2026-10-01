import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormField } from './form-field';

const meta = {
  title: 'Molecules/FormField',
  component: FormField,
  tags: ['autodocs'],
  args: { label: 'Email address', placeholder: 'you@example.com' },
} satisfies Meta<typeof FormField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithHint: Story = { args: { hint: 'We only use this for receipts.' } };
export const WithError: Story = { args: { error: 'Enter a valid email address' } };
export const Disabled: Story = { args: { disabled: true } };
