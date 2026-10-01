import { describe, expect, it, vi } from 'vitest';
import { render, screen, userEvent } from '@/testing/render';
import { EmptyState, ErrorState, LoadingState } from './states';

describe('LoadingState', () => {
  it('announces itself to assistive technology', () => {
    render(<LoadingState />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });
});

describe('EmptyState', () => {
  it('falls back to translated copy', () => {
    render(<EmptyState />);
    expect(screen.getByRole('heading')).toHaveTextContent('Nothing here yet');
  });

  it('renders the supplied action', () => {
    render(<EmptyState action={<button type="button">Create</button>} />);
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });
});

describe('ErrorState', () => {
  it('exposes the failure as an alert with its detail', () => {
    render(<ErrorState error={new Error('503 Service Unavailable')} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Something went wrong');
    expect(alert).toHaveTextContent('503 Service Unavailable');
  });

  it('calls onRetry when the retry button is pressed', async () => {
    const onRetry = vi.fn();
    render(<ErrorState error={new Error('nope')} onRetry={onRetry} />);

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('omits the retry button when no handler is given', () => {
    render(<ErrorState error={new Error('nope')} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
