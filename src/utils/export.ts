import { format } from 'date-fns';
import type { Transaction } from '../types';

/** Prevent CSV formula injection by prefixing dangerous leading characters. */
function sanitiseCell(val: string): string {
  if (/^[=+\-@\t\r]/.test(val)) return "'" + val;
  return val;
}

export function exportTransactionsCSV(transactions: Transaction[]) {
  const headers = ['Date', 'Description', 'Type', 'Amount', 'Currency', 'Account', 'Category', 'Recurring', 'Notes'];

  const rows = [...transactions]
    .sort((a, b) => b.date - a.date)
    .map(t => [
      format(new Date(t.date), 'yyyy-MM-dd'),
      sanitiseCell(t.description),
      t.type,
      t.amount.toFixed(2),
      t.account?.currency ?? '',
      sanitiseCell(t.account?.name ?? ''),
      sanitiseCell(t.category?.name ?? ''),
      t.isRecurring ? (t.recurringInterval ?? 'yes') : 'no',
      sanitiseCell(t.notes ?? ''),
    ]);

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fintrack-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
