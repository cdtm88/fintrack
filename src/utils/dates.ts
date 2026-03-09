import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  subWeeks, subMonths, format, eachWeekOfInterval,
  eachMonthOfInterval, isWithinInterval,
} from 'date-fns';

export function getWeeklyData(transactions: Array<{ date: number; amount: number; type: string; transferId?: string }>, weeks = 8) {
  const now = new Date();
  const start = startOfWeek(subWeeks(now, weeks - 1), { weekStartsOn: 1 });
  const end = endOfWeek(now, { weekStartsOn: 1 });

  const weekIntervals = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 }).map(weekStart => ({
    start: weekStart,
    end: endOfWeek(weekStart, { weekStartsOn: 1 }),
    label: format(weekStart, 'MMM d'),
  }));

  return weekIntervals.map(interval => {
    const weekTxns = transactions.filter(t =>
      !t.transferId && isWithinInterval(new Date(t.date), { start: interval.start, end: interval.end })
    );
    const income = weekTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = weekTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { label: interval.label, income, expense };
  });
}

export function getMonthlyData(transactions: Array<{ date: number; amount: number; type: string; transferId?: string }>, months = 6) {
  const now = new Date();
  const start = startOfMonth(subMonths(now, months - 1));
  const end = endOfMonth(now);

  const monthIntervals = eachMonthOfInterval({ start, end }).map(monthStart => ({
    start: monthStart,
    end: endOfMonth(monthStart),
    label: format(monthStart, 'MMM yy'),
  }));

  return monthIntervals.map(interval => {
    const monthTxns = transactions.filter(t =>
      !t.transferId && isWithinInterval(new Date(t.date), { start: interval.start, end: interval.end })
    );
    const income = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { label: interval.label, income, expense, net: income - expense };
  });
}

export function getCurrentMonthRange() {
  const now = new Date();
  return { start: startOfMonth(now), end: endOfMonth(now) };
}

export function formatDate(timestamp: number): string {
  return format(new Date(timestamp), 'MMM d, yyyy');
}

export function formatDateShort(timestamp: number): string {
  return format(new Date(timestamp), 'MMM d');
}

export function todayTimestamp(): number {
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  return now.getTime();
}

export function dateInputToTimestamp(dateStr: string): number {
  if (!dateStr) return Date.now();
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day, 12, 0, 0, 0);
  return d.getTime();
}

export function timestampToDateInput(timestamp: number): string {
  return format(new Date(timestamp), 'yyyy-MM-dd');
}
