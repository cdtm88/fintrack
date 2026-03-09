import { useState } from 'react';
import { db } from '../db';
import type { Transaction, Account, Category, Budget, Holding } from '../types';
import { formatCurrency } from '../utils/currency';
import { formatDate, getWeeklyData, getMonthlyData } from '../utils/dates';
import { getAccountBalance, getCategoryBreakdown } from '../utils/calculations';
import { useSettings } from '../context/SettingsContext';
import { useExchangeRates } from '../hooks/useExchangeRates';
import { useSeedCategories } from '../hooks/useSeedCategories';
import { useAssetPrices } from '../hooks/useAssetPrices';
import { useUser } from '../context/UserContext';
import TransactionModal from '../components/modals/TransactionModal';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  Plus, TrendingUp, TrendingDown, Wallet, Percent, RefreshCw,
  ArrowUp, ArrowDown, AlertTriangle, Repeat, BarChart2,
} from 'lucide-react';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

function getMonthTotals(
  transactions: Transaction[],
  convert: (a: number, from: string, to: string) => number,
  baseCurrency: string,
  monthOffset = 0,
) {
  const now = new Date();
  const start = startOfMonth(subMonths(now, monthOffset)).getTime();
  const end = endOfMonth(subMonths(now, monthOffset)).getTime();
  const txns = transactions.filter(t => !t.transferId && t.date >= start && t.date <= end);
  const income = txns.filter(t => t.type === 'income')
    .reduce((s, t) => s + convert(t.amount, t.account?.currency ?? baseCurrency, baseCurrency), 0);
  const expense = txns.filter(t => t.type === 'expense')
    .reduce((s, t) => s + convert(t.amount, t.account?.currency ?? baseCurrency, baseCurrency), 0);
  return { income, expense };
}

function delta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export default function Dashboard() {
  const [showTxnModal, setShowTxnModal] = useState(false);
  const { settings } = useSettings();
  const { convert, loading: ratesLoading } = useExchangeRates();
  const navigate = useNavigate();
  const user = useUser();

  const { data, isLoading } = db.useQuery({
    transactions: { $: { where: { userId: user.id } }, account: {}, category: {} },
    accounts: { $: { where: { userId: user.id } } },
    categories: { $: { where: { userId: user.id } } },
    budgets: { $: { where: { userId: user.id } } },
    holdings: { $: { where: { userId: user.id } }, account: {} },
  });

  const transactions = (data?.transactions ?? []) as Transaction[];
  const accounts = (data?.accounts ?? []) as Account[];
  const categories = (data?.categories ?? []) as Category[];
  const budgets = (data?.budgets ?? []) as Budget[];
  const holdings = (data?.holdings ?? []) as Holding[];

  const { prices: holdingPrices } = useAssetPrices(holdings);

  useSeedCategories(categories, isLoading, user.id);

  if (isLoading) return <LoadingState />;

  // Net worth — investment accounts with holdings use live portfolio value
  const netWorthInBase = accounts.reduce((sum, account) => {
    let value: number;
    if (account.type === 'investment') {
      const accountHoldings = holdings.filter(h => h.account?.id === account.id);
      if (accountHoldings.length > 0) {
        value = accountHoldings.reduce((s, h) => s + h.quantity * (holdingPrices[h.id] ?? h.manualPrice ?? 0), 0);
      } else {
        value = getAccountBalance(account, transactions);
      }
    } else {
      value = getAccountBalance(account, transactions);
    }
    return sum + convert(value, account.currency, settings.baseCurrency);
  }, 0);

  // Investment portfolio summary
  const totalPortfolioValue = holdings.reduce((s, h) => s + h.quantity * (holdingPrices[h.id] ?? h.manualPrice ?? 0), 0);
  const totalPortfolioCost  = holdings.reduce((s, h) => s + h.quantity * h.costBasis, 0);
  const portfolioPnl        = totalPortfolioValue - totalPortfolioCost;
  const portfolioReturn     = totalPortfolioCost > 0 ? (portfolioPnl / totalPortfolioCost) * 100 : 0;

  // This month vs last month
  const thisMonth = getMonthTotals(transactions, convert, settings.baseCurrency, 0);
  const lastMonth = getMonthTotals(transactions, convert, settings.baseCurrency, 1);

  const incomeDelta = delta(thisMonth.income, lastMonth.income);
  const expenseDelta = delta(thisMonth.expense, lastMonth.expense);
  const savingsRate = thisMonth.income > 0
    ? Math.round(((thisMonth.income - thisMonth.expense) / thisMonth.income) * 100)
    : 0;

  // Budget alerts — categories > 80% spent this month
  const now = new Date();
  const monthStart = startOfMonth(now).getTime();
  const monthEnd = endOfMonth(now).getTime();
  const budgetAlerts = budgets
    .map(b => {
      const cat = categories.find(c => c.id === b.categoryId);
      if (!cat) return null;
      const spent = transactions
        .filter(t => t.category?.id === cat.id && t.type === 'expense' && t.date >= monthStart && t.date <= monthEnd)
        .reduce((s, t) => s + t.amount, 0);
      const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
      return { cat, spent, budget: b.amount, pct };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null && x.pct >= 80)
    .sort((a, b) => b.pct - a.pct);

  // Recurring transactions
  const recurringTxns = transactions
    .filter(t => t.isRecurring)
    .sort((a, b) => b.date - a.date)
    .reduce((acc, t) => {
      if (!acc.find(x => x.description === t.description)) acc.push(t);
      return acc;
    }, [] as Transaction[])
    .slice(0, 5);

  const weeklyData = getWeeklyData(transactions);
  const monthlyData = getMonthlyData(transactions, 6);
  const expenseBreakdown = getCategoryBreakdown(transactions, 'expense');
  const recent = [...transactions].sort((a, b) => b.date - a.date).slice(0, 8);

  const isDark = settings.theme === 'dark';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';
  const tickColor = isDark ? '#94a3b8' : '#64748b';
  const tooltipStyle = isDark
    ? { background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }
    : { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8 };
  const tooltipLabelStyle = isDark ? { color: '#f1f5f9' } : { color: '#0f172a' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">{format(now, 'MMMM yyyy')}</p>
        </div>
        <button className="btn-primary flex items-center gap-1.5 whitespace-nowrap shrink-0" onClick={() => setShowTxnModal(true)}>
          <Plus size={16} /> <span className="hidden sm:inline">Add </span>Transaction
        </button>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net worth */}
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="label mb-0">Net Worth ({settings.baseCurrency})</span>
            <div className="flex items-center gap-1">
              {ratesLoading && <RefreshCw size={12} className="text-slate-400 animate-spin" />}
              <Wallet size={17} className="text-indigo-500" />
            </div>
          </div>
          <p className={`text-2xl font-bold ${netWorthInBase >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCurrency(netWorthInBase, settings.baseCurrency)}
          </p>
          <p className="text-xs text-muted mt-1">All accounts converted</p>
        </div>

        {/* Income */}
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="label mb-0">Income</span>
            <TrendingUp size={17} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(thisMonth.income, settings.baseCurrency)}
          </p>
          <DeltaBadge pct={incomeDelta} positiveIsGood />
        </div>

        {/* Expenses */}
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="label mb-0">Expenses</span>
            <TrendingDown size={17} className="text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(thisMonth.expense, settings.baseCurrency)}
          </p>
          <DeltaBadge pct={expenseDelta} positiveIsGood={false} />
        </div>

        {/* Savings rate */}
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="label mb-0">Savings Rate</span>
            <Percent size={17} className="text-slate-400" />
          </div>
          <p className={`text-2xl font-bold ${savingsRate >= 20 ? 'text-emerald-600 dark:text-emerald-400' : savingsRate >= 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
            {savingsRate}%
          </p>
          <p className="text-xs text-muted mt-1">
            {formatCurrency(thisMonth.income - thisMonth.expense, settings.baseCurrency)} saved
          </p>
        </div>
      </div>

      {/* Investment portfolio widget */}
      {holdings.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
              <BarChart2 size={15} className="text-indigo-500" /> Investment Portfolio
            </h2>
            <button className="text-xs text-indigo-500 hover:text-indigo-600" onClick={() => navigate('/investments')}>
              View all →
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs text-muted mb-0.5">Total Value</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(totalPortfolioValue, settings.baseCurrency)}</p>
            </div>
            <div>
              <p className="text-xs text-muted mb-0.5">Total Cost</p>
              <p className="text-lg font-bold text-secondary">{formatCurrency(totalPortfolioCost, settings.baseCurrency)}</p>
            </div>
            <div>
              <p className="text-xs text-muted mb-0.5">Unrealised P&amp;L</p>
              <p className={`text-lg font-bold ${portfolioPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {portfolioPnl >= 0 ? '+' : ''}{formatCurrency(portfolioPnl, settings.baseCurrency)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted mb-0.5">Return</p>
              <div className="flex items-center gap-1">
                {portfolioReturn >= 0
                  ? <TrendingUp size={14} className="text-emerald-500" />
                  : <TrendingDown size={14} className="text-red-500" />}
                <p className={`text-lg font-bold ${portfolioReturn >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {portfolioReturn >= 0 ? '+' : ''}{portfolioReturn.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
          {/* Mini holdings list */}
          <div className="space-y-1 border-t border-slate-100 dark:border-slate-800 pt-3">
            {[...holdings]
              .sort((a, b) => (b.quantity * (holdingPrices[b.id] ?? 0)) - (a.quantity * (holdingPrices[a.id] ?? 0)))
              .slice(0, 5)
              .map(h => {
                const price = holdingPrices[h.id] ?? h.manualPrice ?? 0;
                const value = h.quantity * price;
                const pnl   = value - h.quantity * h.costBasis;
                return (
                  <div key={h.id} className="flex items-center gap-3 py-1.5">
                    <span className="text-xs font-bold text-primary w-14 shrink-0">{h.symbol}</span>
                    <span className="text-xs text-muted flex-1 truncate">{h.name}</span>
                    <span className="text-xs font-semibold text-secondary tabular-nums">{formatCurrency(value, h.currency)}</span>
                    <span className={`text-xs font-medium tabular-nums w-16 text-right ${pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {pnl >= 0 ? '+' : ''}{formatCurrency(pnl, h.currency)}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Budget alerts + Recurring */}
      {(budgetAlerts.length > 0 || recurringTxns.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {budgetAlerts.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
                  <AlertTriangle size={15} className="text-amber-500" /> Budget Alerts
                </h2>
                <button className="text-xs text-indigo-500 hover:text-indigo-600" onClick={() => navigate('/budgets')}>
                  Manage →
                </button>
              </div>
              <div className="space-y-2">
                {budgetAlerts.map(({ cat, pct }) => (
                  <div key={cat.id} className="flex items-center gap-3">
                    <span className="text-lg">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-secondary font-medium">{cat.name}</span>
                        <span className={pct >= 100 ? 'text-red-500 font-semibold' : 'text-amber-500 font-semibold'}>
                          {Math.round(pct)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.min(100, pct)}%`, backgroundColor: pct >= 100 ? '#ef4444' : '#f59e0b' }}
                        />
                      </div>
                    </div>
                    <span className={`text-xs font-medium shrink-0 ${pct >= 100 ? 'text-red-500' : 'text-amber-500'}`}>
                      {pct >= 100 ? 'Over!' : 'Near'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recurringTxns.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-primary flex items-center gap-2 mb-3">
                <Repeat size={15} className="text-indigo-500" /> Recurring Transactions
              </h2>
              <div className="space-y-2">
                {recurringTxns.map(t => (
                  <div key={t.id} className="flex items-center gap-3">
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0"
                      style={t.category
                        ? { backgroundColor: t.category.color + '25', border: `1.5px solid ${t.category.color}` }
                        : { backgroundColor: '#f1f5f9' }}
                    >
                      {t.category?.icon ?? '🔄'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-secondary text-sm truncate">{t.description}</p>
                      <p className="text-muted text-xs capitalize">{t.recurringInterval} · {t.account?.name}</p>
                    </div>
                    <span className={`text-sm font-semibold shrink-0 ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {t.type === 'expense' ? '-' : '+'}{formatCurrency(t.amount, t.account?.currency ?? settings.baseCurrency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="text-sm font-semibold text-primary mb-4">Weekly Spend (Last 8 Weeks)</h2>
          {weeklyData.some(w => w.income > 0 || w.expense > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="label" tick={{ fill: tickColor, fontSize: 11 }} />
                <YAxis tick={{ fill: tickColor, fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
                <Bar dataKey="income" name="Income" fill="#22c55e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-primary mb-4">Monthly Overview (Last 6 Months)</h2>
          {monthlyData.some(m => m.income > 0 || m.expense > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="label" tick={{ fill: tickColor, fontSize: 11 }} />
                <YAxis tick={{ fill: tickColor, fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
                <Bar dataKey="income" name="Income" fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>
      </div>

      {/* Category breakdown + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="text-sm font-semibold text-primary mb-4">Spending by Category</h2>
          {expenseBreakdown.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={expenseBreakdown} dataKey="total" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                    {expenseBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(val) => typeof val === 'number' ? val.toFixed(2) : String(val ?? '')}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2 w-full">
                {expenseBreakdown.slice(0, 6).map(cat => (
                  <div key={cat.name} className="flex items-center gap-2">
                    <span className="text-base">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-secondary text-sm truncate">{cat.name}</span>
                        <span className="text-muted text-sm ml-2 shrink-0">{formatCurrency(cat.total, settings.baseCurrency)}</span>
                      </div>
                      <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full mt-0.5">
                        <div className="h-1 rounded-full" style={{
                          backgroundColor: cat.color,
                          width: `${Math.min(100, (cat.total / expenseBreakdown[0].total) * 100)}%`,
                        }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-muted text-sm text-center py-8">No expense data yet</p>}
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-primary mb-4">Recent Transactions</h2>
          {recent.length > 0 ? (
            <div className="space-y-1">
              {recent.map(t => <TxnRow key={t.id} t={t} />)}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted text-sm">No transactions yet.</p>
              <button className="btn-primary mt-3 text-xs" onClick={() => setShowTxnModal(true)}>
                Add your first transaction
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Account balances */}
      {accounts.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-primary mb-4">Account Balances</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {accounts.map(a => {
              const bal = getAccountBalance(a, transactions);
              return (
                <div key={a.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <div className="w-2.5 h-8 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                  <div className="min-w-0">
                    <p className="text-secondary text-sm font-medium truncate">{a.name}</p>
                    <p className={`text-sm font-semibold ${bal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(bal, a.currency)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showTxnModal && (
        <TransactionModal
          accounts={accounts}
          categories={categories}
          previousTransactions={transactions}
          onClose={() => setShowTxnModal(false)}
        />
      )}
    </div>
  );
}

function DeltaBadge({ pct, positiveIsGood }: { pct: number | null; positiveIsGood: boolean }) {
  if (pct === null) return <p className="text-xs text-muted mt-1">No prior month data</p>;
  const up = pct > 0;
  const good = positiveIsGood ? up : !up;
  return (
    <p className={`text-xs mt-1 flex items-center gap-0.5 font-medium ${good ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
      {up ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
      {Math.abs(pct)}% vs last month
    </p>
  );
}

function TxnRow({ t }: { t: Transaction }) {
  const isTransfer = !!t.transferId;
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
      <span
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
        style={isTransfer
          ? { backgroundColor: '#f1f5f9' }
          : t.category
            ? { backgroundColor: t.category.color + '25', border: `1.5px solid ${t.category.color}` }
            : { backgroundColor: '#f1f5f9' }}
      >
        {isTransfer ? '🔄' : (t.category?.icon ?? (t.type === 'income' ? '💰' : '💸'))}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-secondary text-sm truncate">{t.description}</p>
        <p className="text-muted text-xs">{formatDate(t.date)} · {t.account?.name ?? '—'}</p>
      </div>
      <span className={`text-sm font-semibold shrink-0 ${isTransfer ? 'text-slate-500 dark:text-slate-400' : t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
        {isTransfer ? '' : (t.type === 'income' ? '+' : '-')}{formatCurrency(t.amount, t.account?.currency ?? 'AED')}
      </span>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-[220px] flex items-center justify-center">
      <p className="text-muted text-sm">No data yet</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card h-24 animate-pulse bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card h-64 animate-pulse bg-slate-100 dark:bg-slate-800" />
        <div className="card h-64 animate-pulse bg-slate-100 dark:bg-slate-800" />
      </div>
    </div>
  );
}
