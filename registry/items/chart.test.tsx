import { describe, expect, it } from 'vitest';
import { render, screen, userEvent } from '@/testing/render';
import { Chart } from '@/components/molecules/chart';

const data = [
  { month: 'Jan', revenue: 100, refunds: 10 },
  { month: 'Feb', revenue: 200, refunds: 20 },
];

const series = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'refunds', label: 'Refunds' },
];

describe('Chart', () => {
  it('exposes the chart to assistive tech with its title as the label', () => {
    render(<Chart data={data} series={series} xKey="month" title="Revenue vs refunds" />);
    expect(screen.getByRole('img', { name: 'Revenue vs refunds' })).toBeInTheDocument();
  });

  it('offers a table view and renders every value in it', async () => {
    render(<Chart data={data} series={series} xKey="month" title="Revenue" />);

    await userEvent.click(screen.getByRole('button', { name: 'Show table' }));

    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    // Nothing is gated behind colour: each datum is readable as text.
    for (const value of ['100', '200', '10', '20']) {
      expect(table).toHaveTextContent(value);
    }
  });

  it('refuses more series than the palette can keep separable', () => {
    const tooMany = Array.from({ length: 6 }, (_, i) => ({ key: `s${i}`, label: `S${i}` }));
    // Six hues cannot clear the colourblind-separation floors, so this is a
    // hard error rather than a silently unreadable chart.
    expect(() =>
      render(<Chart data={data} series={tooMany} xKey="month" title="Too many" />),
    ).toThrow(/supports 5 series/);
  });
});
