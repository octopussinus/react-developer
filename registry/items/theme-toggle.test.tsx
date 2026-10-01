import { describe, expect, it } from 'vitest';
import { render, screen, userEvent } from '@/testing/render';
import { ThemeToggle } from '@/components/molecules/theme-toggle';

describe('ThemeToggle', () => {
  it('is a radiogroup with exactly one selected option', () => {
    render(<ThemeToggle />);

    expect(screen.getByRole('radiogroup', { name: 'Colour scheme' })).toBeInTheDocument();
    const selected = screen
      .getAllByRole('radio')
      .filter((r) => r.getAttribute('aria-checked') === 'true');
    expect(selected).toHaveLength(1);
  });

  it('keeps "system" reachable so users can defer to the OS', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('radio', { name: 'System' })).toBeInTheDocument();
  });

  it('applies the .dark class when dark is chosen, and removes it for light', async () => {
    render(<ThemeToggle />);

    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement).toHaveClass('dark');

    await userEvent.click(screen.getByRole('radio', { name: 'Light' }));
    expect(document.documentElement).not.toHaveClass('dark');
  });
});
