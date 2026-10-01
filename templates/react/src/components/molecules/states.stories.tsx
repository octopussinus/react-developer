import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@/components/atoms';
import { EmptyState, ErrorState, LoadingState } from './states';

const meta = { title: 'Molecules/States' } satisfies Meta;
export default meta;

export const Loading: StoryObj = { render: () => <LoadingState /> };

export const Empty: StoryObj = {
  render: () => <EmptyState action={<Button>Create the first one</Button>} />,
};

/* Named `Failed`, not `Error`: a story called `Error` shadows the global
   `Error` constructor inside this module. */
export const Failed: StoryObj = {
  name: 'Error',
  render: () => <ErrorState error={new Error('503 Service Unavailable')} onRetry={() => {}} />,
};
