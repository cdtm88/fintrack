import type { Account, Transaction } from '../types';
import { isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';

export function getAccountBalance(account: Account, transactions: Transaction[]): number {
  const accountTxns = transactions.filter(t => t.account?.id === account.id);
  const delta = accountTxns.reduce((sum, t) => {
    return t.type === 'income' ? sum + t.amount : sum - t.amount;
  }, 0);
  return account.initialBalance + delta;
}

export function getBalancesByCurrency(accounts: Account[], transactions: Transaction[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const account of accounts) {
    const bal = getAccountBalance(account, transactions);
    result[account.currency] = (result[account.currency] ?? 0) + bal;
  }
  return result;
}

export function getCurrentMonthSummary(transactions: Transaction[]) {
  const now = new Date();
  const interval = { start: startOfMonth(now), end: endOfMonth(now) };
  const monthTxns = transactions.filter(t =>
    isWithinInterval(new Date(t.date), interval)
  );
  const income = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  return { income, expense, net: income - expense, count: monthTxns.length };
}

export function getCategoryBreakdown(transactions: Transaction[], type: 'income' | 'expense') {
  const filtered = transactions.filter(t => t.type === type && t.category);
  const map: Record<string, { name: string; color: string; icon: string; total: number }> = {};
  for (const t of filtered) {
    const cat = t.category!;
    if (!map[cat.id]) {
      map[cat.id] = { name: cat.name, color: cat.color, icon: cat.icon, total: 0 };
    }
    map[cat.id].total += t.amount;
  }
  return Object.values(map).sort((a, b) => b.total - a.total);
}
