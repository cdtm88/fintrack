import { format } from 'date-fns';
import type { Transaction } from '../types';

export function exportTransactionsCSV(transactions: Transaction[]) {
  const headers = ['Date', 'Description', 'Type', 'Amount', 'Currency', 'Account', 'Category', 'Recurring', 'Notes'];

  const rows = [...transactions]
    .sort((a, b) => b.date - a.date)
    .map(t => [
      format(new Date(t.date), 'yyyy-MM-dd'),
      t.description,
      t.type,
      t.amount.toFixed(2),
      t.account?.currency ?? '',
      t.account?.name ?? '',
      t.category?.name ?? '',
      t.isRecurring ? (t.recurringInterval ?? 'yes') : 'no',
      t.notes ?? '',
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
