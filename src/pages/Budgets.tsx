import { useState } from 'react';
import { id } from '@instantdb/react';
import { db } from '../db';
import { useUser } from '../context/UserContext';
import type { Category, Transaction, Budget } from '../types';
import { formatCurrency } from '../utils/currency';
import { useSettings } from '../context/SettingsContext';
import { useExchangeRates } from '../hooks/useExchangeRates';
import { PiggyBank, Check, X, Trash2, AlertTriangle } from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';

function getMonthSpend(categoryId: string, transactions: Transaction[]): number {
  const now = new Date();
  const start = startOfMonth(now).getTime();
  const end = endOfMonth(now).getTime();
  return transactions
    .filter(t => t.category?.id === categoryId && t.type === 'expense' && t.date >= start && t.date <= end)
    .reduce((s, t) => s + t.amount, 0);
}

function BudgetRow({
  category,
  budget,
  spent,
  currency,
}: {
  category: Category;
  budget?: Budget;
  spent: number;
  currency: string;
}) {
  const [editing, setEditing] = useState(!budget);
  const [value, setValue] = useState(budget ? String(budget.amount) : '');
  const user = useUser();

  const progress = budget ? Math.min(100, (spent / budget.amount) * 100) : 0;
  const overBudget = budget && spent > budget.amount;
  const nearLimit = budget && !overBudget && progress >= 80;

  const barColor = overBudget ? '#ef4444' : nearLimit ? '#f59e0b' : category.color;

  function save() {
    const amt = parseFloat(value);
    if (!amt || amt <= 0) return;
    if (budget) {
      db.transact(db.tx.budgets[budget.id].update({ amount: amt }));
    } else {
      db.transact(db.tx.budgets[id()].update({ categoryId: category.id, amount: amt, createdAt: Date.now(), userId: user.id }));
    }
    setEditing(false);
  }

  function removeBudget() {
    if (budget) db.transact(db.tx.budgets[budget.id].delete());
  }

  return (
    <div className="flex items-center gap-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      {/* Icon + name */}
      <span
        className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
        style={{ backgroundColor: category.color + '20', border: `1.5px solid ${category.color}` }}
      >
        {category.icon}
      </span>
      <div className="w-28 shrink-0">
        <p className="text-sm font-medium text-primary truncate">{category.name}</p>
        {overBudget && (
          <span className="text-xs text-red-500 flex items-center gap-0.5">
            <AlertTriangle size={10} /> Over budget
          </span>
        )}
      </div>

      {/* Progress */}
      <div className="flex-1 min-w-0">
        {budget ? (
          <>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted">{formatCurrency(spent, currency)}</span>
              <span className={overBudget ? 'text-red-500 font-medium' : nearLimit ? 'text-amber-500 font-medium' : 'text-muted'}>
                {formatCurrency(budget.amount, currency)}
              </span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progress}%`, backgroundColor: barColor }}
              />
            </div>
            <p className="text-xs text-muted mt-0.5">{Math.round(progress)}% used</p>
          </>
        ) : (
          <p className="text-xs text-muted italic">No budget set</p>
        )}
      </div>

      {/* Edit / set budget */}
      <div className="shrink-0 flex items-center gap-2">
        {editing ? (
          <>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted">{currency}</span>
              <input
                className="input w-28 pl-10 py-1.5 text-sm"
                type="number"
                min="1"
                step="1"
                placeholder="Amount"
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
                autoFocus
              />
            </div>
            <button className="btn-primary p-1.5" onClick={save}><Check size={14} /></button>
            {budget && <button className="btn-ghost p-1.5" onClick={() => setEditing(false)}><X size={14} /></button>}
          </>
        ) : (
          <>
            <button className="btn-secondary text-xs py-1.5 px-3" onClick={() => setEditing(true)}>
              {budget ? 'Edit' : 'Set budget'}
            </button>
            {budget && (
              <button className="btn-ghost p-1.5 hover:text-red-500" onClick={removeBudget}>
                <Trash2 size={13} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function Budgets() {
  const { settings } = useSettings();
  const { convert } = useExchangeRates();
  const [showUnbudgeted, setShowUnbudgeted] = useState(false);
  const user = useUser();

  const { data, isLoading } = db.useQuery({
    categories: { $: { where: { userId: user.id } } },
    budgets: { $: { where: { userId: user.id } } },
    transactions: { $: { where: { userId: user.id } }, category: {}, account: {} },
  });

  const categories = (data?.categories ?? []) as Category[];
  const budgets = (data?.budgets ?? []) as Budget[];
  const transactions = (data?.transactions ?? []) as Transaction[];

  const expenseCategories = categories
    .filter(c => c.type === 'expense' || c.type === 'both')
    .sort((a, b) => a.name.localeCompare(b.name));

  const budgetedCategories = expenseCategories.filter(c => budgets.some(b => b.categoryId === c.id));
  const unbudgetedCategories = expenseCategories.filter(c => !budgets.some(b => b.categoryId === c.id));

  // Summary: totals in base currency
  const now = new Date();
  const monthStart = startOfMonth(now).getTime();
  const monthEnd = endOfMonth(now).getTime();

  const totalBudgeted = budgets.reduce((s, b) => {
    const cat = categories.find(c => c.id === b.categoryId);
    if (!cat) return s;
    return s + b.amount;
  }, 0);

  const totalSpent = budgetedCategories.reduce((s, cat) => {
    const monthSpend = transactions
      .filter(t => t.category?.id === cat.id && t.type === 'expense' && t.date >= monthStart && t.date <= monthEnd)
      .reduce((sum, t) => sum + convert(t.amount, t.account?.currency ?? settings.baseCurrency, settings.baseCurrency), 0);
    return s + monthSpend;
  }, 0);

  const overCount = budgetedCategories.filter(cat => {
    const budget = budgets.find(b => b.categoryId === cat.id)!;
    const spent = getMonthSpend(cat.id, transactions);
    return spent > budget.amount;
  }).length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        <div className="card animate-pulse h-64 bg-slate-100 dark:bg-slate-800" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="page-title">Budgets</h1>
        <p className="page-subtitle">Set monthly spending limits per category</p>
      </div>

      {/* Summary */}
      {budgets.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card py-4 text-center">
            <p className="text-muted text-xs uppercase tracking-wide">Total Budgeted</p>
            <p className="text-primary text-xl font-bold mt-1">{formatCurrency(totalBudgeted, settings.baseCurrency)}</p>
            <p className="text-muted text-xs mt-0.5">this month</p>
          </div>
          <div className="card py-4 text-center">
            <p className="text-muted text-xs uppercase tracking-wide">Total Spent</p>
            <p className={`text-xl font-bold mt-1 ${totalSpent > totalBudgeted ? 'text-red-600 dark:text-red-400' : 'text-primary'}`}>
              {formatCurrency(totalSpent, settings.baseCurrency)}
            </p>
            <p className="text-muted text-xs mt-0.5">{totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0}% of budget</p>
          </div>
          <div className="card py-4 text-center">
            <p className="text-muted text-xs uppercase tracking-wide">Remaining</p>
            <p className={`text-xl font-bold mt-1 ${totalBudgeted - totalSpent < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatCurrency(Math.max(0, totalBudgeted - totalSpent), settings.baseCurrency)}
            </p>
            {overCount > 0 && (
              <p className="text-red-500 text-xs mt-0.5">{overCount} categor{overCount !== 1 ? 'ies' : 'y'} over limit</p>
            )}
          </div>
        </div>
      )}

      {/* Budgeted categories */}
      <div className="card">
        <h2 className="text-sm font-semibold text-primary mb-1">
          {budgetedCategories.length > 0 ? `Budgets (${budgetedCategories.length})` : 'No budgets set yet'}
        </h2>
        <p className="text-xs text-muted mb-4">
          {budgetedCategories.length === 0
            ? 'Set monthly limits for your spending categories below.'
            : 'Monthly limits for this billing period.'}
        </p>

        {budgetedCategories.length > 0 && (
          <div>
            {budgetedCategories.map(cat => {
              const budget = budgets.find(b => b.categoryId === cat.id);
              const spent = getMonthSpend(cat.id, transactions);
              return (
                <BudgetRow
                  key={cat.id}
                  category={cat}
                  budget={budget}
                  spent={spent}
                  currency={settings.baseCurrency}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Unbudgeted categories */}
      {unbudgetedCategories.length > 0 && (
        <div className="card">
          <button
            className="w-full flex items-center justify-between text-sm font-semibold text-primary"
            onClick={() => setShowUnbudgeted(!showUnbudgeted)}
          >
            <span>Unbudgeted categories ({unbudgetedCategories.length})</span>
            <span className="text-muted text-xs font-normal">{showUnbudgeted ? 'hide' : 'show'}</span>
          </button>

          {showUnbudgeted && (
            <div className="mt-4">
              {unbudgetedCategories.map(cat => (
                <BudgetRow
                  key={cat.id}
                  category={cat}
                  budget={undefined}
                  spent={getMonthSpend(cat.id, transactions)}
                  currency={settings.baseCurrency}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {expenseCategories.length === 0 && (
        <div className="card text-center py-16">
          <PiggyBank size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
          <h2 className="text-primary font-medium mb-1">No expense categories</h2>
          <p className="text-muted text-sm">Add some categories first, then set budgets for them.</p>
        </div>
      )}
    </div>
  );
}
