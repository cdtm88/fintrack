import { useState } from 'react';
import { id } from '@instantdb/react';
import { db } from '../../db';
import { useUser } from '../../context/UserContext';
import type { Account } from '../../types';
import { ACCOUNT_TYPES, CURRENCIES, ACCOUNT_COLORS } from '../../types';
import { X } from 'lucide-react';

interface Props {
  account?: Account;
  onClose: () => void;
}

export default function AccountModal({ account, onClose }: Props) {
  const [name, setName] = useState(account?.name ?? '');
  const [type, setType] = useState<Account['type']>(account?.type ?? 'checking');
  const [currency, setCurrency] = useState(account?.currency ?? 'AED');
  const [initialBalance, setInitialBalance] = useState(String(account?.initialBalance ?? '0'));
  const [color, setColor] = useState(account?.color ?? ACCOUNT_COLORS[0]);
  const user = useUser();

  const isEdit = !!account;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const data = {
      name: name.trim(),
      type,
      currency,
      initialBalance: parseFloat(initialBalance) || 0,
      color,
      createdAt: account?.createdAt ?? Date.now(),
      userId: user.id,
    };

    if (isEdit) {
      db.transact(db.tx.accounts[account.id].update(data));
    } else {
      db.transact(db.tx.accounts[id()].update(data));
    }
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-primary">{isEdit ? 'Edit Account' : 'New Account'}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Account Name</label>
            <input className="input" placeholder="e.g. Chase Checking" value={name} onChange={e => setName(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Type</label>
              <select className="select" value={type} onChange={e => setType(e.target.value as Account['type'])}>
                {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Currency</label>
              <select className="select" value={currency} onChange={e => setCurrency(e.target.value)}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Opening Balance</label>
            <input
              className="input"
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="0.00"
              value={initialBalance}
              onChange={e => setInitialBalance(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Color</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {ACCOUNT_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">{isEdit ? 'Save Changes' : 'Create Account'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
