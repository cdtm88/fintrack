import { useState, useEffect, useRef } from 'react';
import { id } from '@instantdb/react';
import { db } from '../../db';
import { useUser } from '../../context/UserContext';
import type { Transaction, Account, Category } from '../../types';
import { timestampToDateInput, dateInputToTimestamp, todayTimestamp } from '../../utils/dates';
import { X, Sparkles } from 'lucide-react';

interface Props {
  transaction?: Transaction;
  accounts: Account[];
  categories: Category[];
  previousTransactions?: Transaction[];
  onClose: () => void;
}

function DescriptionInput({
  value,
  onChange,
  onSuggestionPick,
  suggestions,
}: {
  value: string;
  onChange: (v: string) => void;
  onSuggestionPick: (desc: string) => void;
  suggestions: string[];
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = value.length > 0
    ? suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase())).slice(0, 7)
    : suggestions.slice(0, 7);

  const showList = open && filtered.length > 0;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={wrapRef}>
      <input
        className="input"
        placeholder="What was this for?"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        required
        autoComplete="off"
      />
      {showList && (
        <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden">
          <p className="px-3 pt-2 pb-1 text-xs text-muted">Recent</p>
          {filtered.map(s => (
            <button
              key={s}
              type="button"
              className="w-full text-left px-3 py-2 text-sm text-secondary hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              onMouseDown={() => { onSuggestionPick(s); setOpen(false); }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TransactionModal({
  transaction, accounts, categories, previousTransactions = [], onClose,
}: Props) {
  const user = useUser();
  const [type, setType] = useState<'income' | 'expense'>(transaction?.type ?? 'expense');
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : '');
  const [description, setDescription] = useState(transaction?.description ?? '');
  const [date, setDate] = useState(
    transaction ? timestampToDateInput(transaction.date) : timestampToDateInput(todayTimestamp())
  );
  const [accountId, setAccountId] = useState(transaction?.account?.id ?? (accounts[0]?.id ?? ''));
  const [categoryId, setCategoryId] = useState(transaction?.category?.id ?? '');
  const [notes, setNotes] = useState(transaction?.notes ?? '');
  const [isRecurring, setIsRecurring] = useState(transaction?.isRecurring ?? false);
  const [recurringInterval, setRecurringInterval] = useState<'weekly' | 'monthly' | 'yearly'>(
    transaction?.recurringInterval ?? 'monthly'
  );
  const [autofilled, setAutofilled] = useState(false);

  const isEdit = !!transaction;
  const filteredCategories = categories.filter(c => c.type === type || c.type === 'both');
  const uniqueDescriptions = [...new Set(previousTransactions.map(t => t.description))].filter(Boolean);

  useEffect(() => {
    if (categoryId) {
      const cat = categories.find(c => c.id === categoryId);
      if (cat && cat.type !== type && cat.type !== 'both') setCategoryId('');
    }
  }, [type]);

  function handleSuggestionPick(desc: string) {
    setDescription(desc);
    // Find the most recent matching transaction and auto-fill details
    const match = [...previousTransactions]
      .filter(t => t.description === desc)
      .sort((a, b) => b.date - a.date)[0];

    if (match) {
      if (match.type) setType(match.type);
      if (match.category?.id) setCategoryId(match.category.id);
      if (match.account?.id) setAccountId(match.account.id);
      if (match.amount) setAmount(String(match.amount));
      setAutofilled(true);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || !description.trim() || !accountId) return;
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    const data = {
      type,
      amount: parsedAmount,
      description: description.trim(),
      date: dateInputToTimestamp(date),
      notes: notes.trim() || undefined,
      isRecurring,
      recurringInterval: isRecurring ? recurringInterval : undefined,
      createdAt: transaction?.createdAt ?? Date.now(),
      userId: user.id,
    };

    const txnId = isEdit ? transaction.id : id();
    const ops: ReturnType<typeof db.tx.transactions[string]['update']>[] = [
      db.tx.transactions[txnId].update(data),
    ];
    if (accountId) ops.push(db.tx.transactions[txnId].link({ account: accountId }));
    if (categoryId) ops.push(db.tx.transactions[txnId].link({ category: categoryId }));

    db.transact(ops);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-primary">
            {isEdit ? 'Edit Transaction' : 'New Transaction'}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${type === 'expense' ? 'bg-red-500 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              onClick={() => setType('expense')}
            >
              Expense
            </button>
            <button
              type="button"
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${type === 'income' ? 'bg-emerald-500 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              onClick={() => setType('income')}
            >
              Income
            </button>
          </div>

          <div>
            <label className="label">Amount</label>
            <input
              className="input text-lg font-semibold"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={e => { setAmount(e.target.value); setAutofilled(false); }}
              required
              autoFocus
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Description</label>
              {autofilled && (
                <span className="text-xs text-indigo-500 flex items-center gap-1">
                  <Sparkles size={11} /> Auto-filled
                </span>
              )}
            </div>
            <DescriptionInput
              value={description}
              onChange={v => { setDescription(v); setAutofilled(false); }}
              onSuggestionPick={handleSuggestionPick}
              suggestions={uniqueDescriptions}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date</label>
              <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div>
              <label className="label">Account</label>
              <select className="select" value={accountId} onChange={e => setAccountId(e.target.value)} required>
                <option value="">Select account</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Category</label>
            <select className="select" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              <option value="">No category</option>
              {filteredCategories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Additional notes..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
            <div>
              <p className="text-sm font-medium text-primary">Recurring</p>
              <p className="text-xs text-muted">Mark as a recurring transaction</p>
            </div>
            <button
              type="button"
              onClick={() => setIsRecurring(!isRecurring)}
              className={`relative w-11 h-6 rounded-full transition-colors ${isRecurring ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${isRecurring ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {isRecurring && (
            <div>
              <label className="label">Repeats</label>
              <select className="select" value={recurringInterval} onChange={e => setRecurringInterval(e.target.value as 'weekly' | 'monthly' | 'yearly')}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">{isEdit ? 'Save Changes' : 'Add Transaction'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
