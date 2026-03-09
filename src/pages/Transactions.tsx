import { useState, useMemo } from 'react';
import { db } from '../db';
import { useUser } from '../context/UserContext';
import type { Transaction, Account, Category } from '../types';
import { formatCurrency } from '../utils/currency';
import { formatDate } from '../utils/dates';
import TransactionModal from '../components/modals/TransactionModal';
import TransferModal from '../components/modals/TransferModal';
import ConfirmModal from '../components/modals/ConfirmModal';
import { Plus, Search, Filter, Repeat, Pencil, Trash2, ChevronDown, Download, ArrowLeftRight } from 'lucide-react';
import { exportTransactionsCSV } from '../utils/export';

export default function Transactions() {
  const [showModal, setShowModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [editTxn, setEditTxn] = useState<Transaction | undefined>();
  const [deleteTxn, setDeleteTxn] = useState<Transaction | undefined>();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');

  const user = useUser();

  const { data, isLoading } = db.useQuery({
    transactions: { $: { where: { userId: user.id } }, account: {}, category: {} },
    accounts: { $: { where: { userId: user.id } } },
    categories: { $: { where: { userId: user.id } } },
  });

  const transactions = (data?.transactions ?? []) as Transaction[];
  const accounts = (data?.accounts ?? []) as Account[];
  const categories = (data?.categories ?? []) as Category[];

  const filtered = useMemo(() => {
    let result = [...transactions];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.description.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q) ||
        t.category?.name.toLowerCase().includes(q) ||
        t.account?.name.toLowerCase().includes(q)
      );
    }
    if (filterType === 'transfer') result = result.filter(t => !!t.transferId);
    else if (filterType !== 'all') result = result.filter(t => t.type === filterType);
    if (filterAccount) result = result.filter(t => t.account?.id === filterAccount);
    if (filterCategory) result = result.filter(t => t.category?.id === filterCategory);
    if (dateFrom) result = result.filter(t => t.date >= new Date(dateFrom).getTime());
    if (dateTo) {
      const end = new Date(dateTo); end.setHours(23, 59, 59, 999);
      result = result.filter(t => t.date <= end.getTime());
    }
    result.sort((a, b) => sortBy === 'date' ? b.date - a.date : b.amount - a.amount);
    return result;
  }, [transactions, search, filterType, filterAccount, filterCategory, dateFrom, dateTo, sortBy]);

  const nonTransfers = filtered.filter(t => !t.transferId);
  const totalIncome = nonTransfers.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = nonTransfers.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  function handleDelete(t: Transaction) {
    const ops: ReturnType<typeof db.tx.transactions[string]['delete']>[] = [
      db.tx.transactions[t.id].delete(),
    ];
    if (t.transferId) {
      const partner = transactions.find(tx => tx.transferId === t.transferId && tx.id !== t.id);
      if (partner) ops.push(db.tx.transactions[partner.id].delete());
    }
    db.transact(ops);
    setDeleteTxn(undefined);
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card h-16 animate-pulse bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            className="btn-secondary flex items-center gap-1.5 whitespace-nowrap"
            onClick={() => exportTransactionsCSV(filtered)}
            title="Export filtered transactions to CSV"
          >
            <Download size={15} /> <span className="hidden sm:inline">Export</span>
          </button>
          <button className="btn-secondary flex items-center gap-1.5 whitespace-nowrap" onClick={() => setShowTransferModal(true)}>
            <ArrowLeftRight size={15} /> <span className="hidden sm:inline">Transfer</span>
          </button>
          <button className="btn-primary flex items-center gap-1.5 whitespace-nowrap" onClick={() => { setEditTxn(undefined); setShowModal(true); }}>
            <Plus size={16} /><span className="hidden sm:inline"> Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card py-3 text-center min-w-0">
          <p className="text-muted text-xs uppercase tracking-wide">Income</p>
          <p className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs sm:text-base mt-0.5 tabular-nums truncate">+{totalIncome.toFixed(2)}</p>
        </div>
        <div className="card py-3 text-center min-w-0">
          <p className="text-muted text-xs uppercase tracking-wide">Expenses</p>
          <p className="text-red-600 dark:text-red-400 font-semibold text-xs sm:text-base mt-0.5 tabular-nums truncate">-{totalExpense.toFixed(2)}</p>
        </div>
        <div className="card py-3 text-center min-w-0">
          <p className="text-muted text-xs uppercase tracking-wide">Net</p>
          <p className={`font-semibold text-xs sm:text-base mt-0.5 tabular-nums truncate ${totalIncome - totalExpense >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {(totalIncome - totalExpense).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Search + filters */}
      <div className="card space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search transactions..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button
            className={`btn-secondary flex items-center gap-1.5 ${showFilters ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={14} /> Filters
            <ChevronDown size={13} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div>
              <label className="label">Type</label>
              <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 h-9">
                {(['all', 'income', 'expense', 'transfer'] as const).map(t => (
                  <button
                    key={t}
                    className={`flex-1 text-xs font-medium capitalize transition-colors ${filterType === t ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}
                    onClick={() => setFilterType(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Account</label>
              <select className="select" value={filterAccount} onChange={e => setFilterAccount(e.target.value)}>
                <option value="">All accounts</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Category</label>
              <select className="select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                <option value="">All categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">From Date</label>
              <input type="date" className="input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="label">To Date</label>
              <input type="date" className="input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div>
              <label className="label">Sort By</label>
              <select className="select" value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}>
                <option value="date">Date (newest first)</option>
                <option value="amount">Amount (highest first)</option>
              </select>
            </div>
            {(search || filterType !== 'all' || filterAccount || filterCategory || dateFrom || dateTo) && (
              <div className="flex items-end">
                <button className="btn-ghost text-xs" onClick={() => {
                  setSearch(''); setFilterType('all'); setFilterAccount('');
                  setFilterCategory(''); setDateFrom(''); setDateTo('');
                }}>
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transaction list */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-muted">{transactions.length === 0 ? 'No transactions yet. Add one to get started!' : 'No transactions match your filters.'}</p>
          {transactions.length === 0 && (
            <button className="btn-primary mt-4" onClick={() => { setEditTxn(undefined); setShowModal(true); }}>
              Add Transaction
            </button>
          )}
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map(t => {
              const isTransfer = !!t.transferId;
              return (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <span
                    className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0"
                    style={isTransfer
                      ? { backgroundColor: '#f1f5f9' }
                      : t.category
                        ? { backgroundColor: t.category.color + '25', border: `1.5px solid ${t.category.color}` }
                        : { backgroundColor: '#f1f5f9' }}
                  >
                    {isTransfer ? '🔄' : (t.category?.icon ?? (t.type === 'income' ? '💰' : '💸'))}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-secondary text-sm font-medium truncate">{t.description}</p>
                      {t.isRecurring && (
                        <span title={`Recurring ${t.recurringInterval}`}>
                          <Repeat size={12} className="text-indigo-500 shrink-0" />
                        </span>
                      )}
                    </div>
                    <p className="text-muted text-xs">
                      {formatDate(t.date)}
                      {t.account && <span> · {t.account.name}</span>}
                      {!isTransfer && t.category && <span> · {t.category.name}</span>}
                    </p>
                  </div>

                  <span className={`text-xs sm:text-sm font-semibold shrink-0 ${isTransfer ? 'text-slate-500 dark:text-slate-400' : t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {isTransfer ? '' : (t.type === 'income' ? '+' : '-')}{formatCurrency(t.amount, t.account?.currency ?? 'AED')}
                  </span>

                  <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                    {!isTransfer && (
                      <button className="btn-ghost p-1.5 sm:p-2" onClick={() => { setEditTxn(t); setShowModal(true); }}>
                        <Pencil size={13} />
                      </button>
                    )}
                    <button className="btn-ghost p-1.5 sm:p-2 hover:text-red-500" onClick={() => setDeleteTxn(t)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showModal && (
        <TransactionModal
          transaction={editTxn}
          accounts={accounts}
          categories={categories}
          previousTransactions={transactions}
          onClose={() => { setShowModal(false); setEditTxn(undefined); }}
        />
      )}
      {showTransferModal && (
        <TransferModal
          accounts={accounts}
          onClose={() => setShowTransferModal(false)}
        />
      )}
      {deleteTxn && (
        <ConfirmModal
          title={deleteTxn.transferId ? 'Delete Transfer' : 'Delete Transaction'}
          message={deleteTxn.transferId
            ? `Delete this transfer? Both sides of the transfer will be removed.`
            : `Are you sure you want to delete "${deleteTxn.description}"?`}
          onConfirm={() => handleDelete(deleteTxn)}
          onCancel={() => setDeleteTxn(undefined)}
        />
      )}
    </div>
  );
}
