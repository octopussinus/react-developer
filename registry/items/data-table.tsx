import { useMemo, useState } from 'react';
import { EmptyState, LoadingState } from '@/components/molecules';
import { cn } from '@/lib/cn';

/**
 * DataTable — an ORGANISM, not a molecule: it is a distinct section of UI that
 * composes molecules (the empty and loading states) and owns sorting state.
 * That is why this registry item targets `@components/organisms/`.
 *
 * Deliberately dependency-free. A headless table library is the right call once
 * you need column resizing, virtualisation or grouping; until then it is a large
 * dependency for sorting an array.
 */

export interface Column<T> {
  /** Stable id, also used as the sort key. */
  id: string;
  header: string;
  /** Cell renderer. Keep it presentational. */
  cell: (row: T) => React.ReactNode;
  /** Value used for sorting. Omit to make the column unsortable. */
  sortValue?: (row: T) => string | number;
  align?: 'left' | 'right';
}

export interface DataTableProps<T> {
  rows: readonly T[];
  columns: readonly Column<T>[];
  rowKey: (row: T) => string;
  caption: string;
  isLoading?: boolean;
  emptyTitle?: string;
  className?: string;
}

type SortState = { columnId: string; direction: 'asc' | 'desc' } | null;

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  caption,
  isLoading = false,
  emptyTitle,
  className,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState>(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.id === sort.columnId);
    if (!column?.sortValue) return rows;

    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const left = column.sortValue?.(a) ?? '';
      const right = column.sortValue?.(b) ?? '';
      if (typeof left === 'number' && typeof right === 'number') return (left - right) * factor;
      return String(left).localeCompare(String(right)) * factor;
    });
  }, [rows, columns, sort]);

  function toggle(columnId: string) {
    setSort((current) =>
      current?.columnId === columnId
        ? { columnId, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { columnId, direction: 'asc' },
    );
  }

  // All four states, as AGENTS.md requires.
  if (isLoading) return <LoadingState rows={5} />;
  // exactOptionalPropertyTypes: omit the prop rather than pass `undefined`.
  if (rows.length === 0)
    return <EmptyState {...(emptyTitle === undefined ? {} : { title: emptyTitle })} />;

  return (
    <div className={cn('overflow-x-auto rounded-lg border border-border bg-card', className)}>
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border">
            {columns.map((column) => {
              const active = sort?.columnId === column.id;
              const sortable = column.sortValue !== undefined;
              return (
                <th
                  key={column.id}
                  scope="col"
                  // aria-sort is what tells a screen reader the table is sorted.
                  aria-sort={
                    active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'
                  }
                  className={cn(
                    'px-4 py-3 font-medium text-muted-foreground',
                    column.align === 'right' ? 'text-right' : 'text-left',
                  )}
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => toggle(column.id)}
                      className="inline-flex items-center gap-1 rounded-sm hover:text-foreground"
                    >
                      {column.header}
                      <span aria-hidden="true" className="text-xs">
                        {active ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={rowKey(row)} className="border-b border-border/50 last:border-0">
              {columns.map((column) => (
                <td
                  key={column.id}
                  className={cn(
                    'px-4 py-3 text-card-foreground',
                    column.align === 'right' ? 'text-right tabular-nums' : 'text-left',
                  )}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
