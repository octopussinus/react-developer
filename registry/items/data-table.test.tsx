import { describe, expect, it } from 'vitest';
import { render, screen, userEvent, within } from '@/testing/render';
import { DataTable, type Column } from '@/components/organisms/data-table';

interface Row {
  id: string;
  name: string;
  total: number;
}

const rows: Row[] = [
  { id: '1', name: 'Beta', total: 30 },
  { id: '2', name: 'Alpha', total: 10 },
  { id: '3', name: 'Gamma', total: 20 },
];

const columns: Column<Row>[] = [
  { id: 'name', header: 'Name', cell: (r) => r.name, sortValue: (r) => r.name },
  { id: 'total', header: 'Total', cell: (r) => r.total, sortValue: (r) => r.total, align: 'right' },
];

/**
 * Values of one column, body rows only.
 *
 * `within(row).getAllByRole('cell')` rather than `row.cells`: getAllByRole
 * returns HTMLElement, which has no `.cells`, so the latter is an implicit any.
 */
function column(index: number): (string | null)[] {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[index]?.textContent ?? null);
}

describe('DataTable', () => {
  it('renders rows with an accessible caption', () => {
    render(<DataTable rows={rows} columns={columns} rowKey={(r) => r.id} caption="Orders" />);
    expect(screen.getByRole('table', { name: 'Orders' })).toBeInTheDocument();
    expect(column(0)).toEqual(['Beta', 'Alpha', 'Gamma']);
  });

  it('sorts ascending then descending, and reports it via aria-sort', async () => {
    render(<DataTable rows={rows} columns={columns} rowKey={(r) => r.id} caption="Orders" />);

    await userEvent.click(screen.getByRole('button', { name: /Name/ }));
    expect(column(0)).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );

    await userEvent.click(screen.getByRole('button', { name: /Name/ }));
    expect(column(0)).toEqual(['Gamma', 'Beta', 'Alpha']);
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
  });

  it('sorts numbers numerically, not lexically', async () => {
    const wide = [...rows, { id: '4', name: 'Delta', total: 100 }];
    render(<DataTable rows={wide} columns={columns} rowKey={(r) => r.id} caption="Orders" />);

    await userEvent.click(screen.getByRole('button', { name: /Total/ }));
    expect(column(1)).toEqual(['10', '20', '30', '100']);
  });

  it('shows the empty state instead of an empty table', () => {
    render(<DataTable rows={[]} columns={columns} rowKey={(r) => r.id} caption="Orders" />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByRole('heading')).toBeInTheDocument();
  });

  it('shows the loading state', () => {
    render(
      <DataTable rows={[]} columns={columns} rowKey={(r) => r.id} caption="Orders" isLoading />,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
