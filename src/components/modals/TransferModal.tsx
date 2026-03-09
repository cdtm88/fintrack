import { useState } from 'react';
import { id } from '@instantdb/react';
import { db } from '../../db';
import { useUser } from '../../context/UserContext';
import type { Account } from '../../types';
import { timestampToDateInput, dateInputToTimestamp, todayTimestamp } from '../../utils/dates';
import { X, ArrowRight, CreditCard, Info } from 'lucide-react';

interface Props {
  accounts: Account[];
  defaultToAccountId?: string;
  onClose: () => void;
}

export default function TransferModal({ accounts, defaultToAccountId, onClose }: Props) {
  const user = useUser();

  const payableAccounts = accounts.filter(a => a.type !== 'investment');
  const firstNonCredit = payableAccounts.find(a => a.type !== 'credit');
  const firstCredit = payableAccounts.find(a => a.type === 'credit');

  const [fromId, setFromId] = useState(firstNonCredit?.id ?? payableAccounts[0]?.id ?? '');
  const [toId, setToId] = useState(
    defaultToAccountId ?? firstCredit?.id ?? payableAccounts.find(a => a.id !== fromId)?.id ?? ''
  );
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [fee, setFee] = useState('');
  const [date, setDate] = useState(timestampToDateInput(todayTimestamp()));
  const [notes, setNotes] = useState('');

  const fromAccount = accounts.find(a => a.id === fromId);
  const toAccount = accounts.find(a => a.id === toId);
  const isCCPayment = toAccount?.type === 'credit';
  const isCrossCurrency = !!(fromAccount && toAccount && fromAccount.currency !== toAccount.currency);

  const parsedFrom = parseFloat(fromAmount);
  const parsedTo = parseFloat(toAmount);
  const parsedFee = parseFloat(fee);
  const impliedRate = isCrossCurrency && parsedFrom > 0 && parsedTo > 0
    ? parsedTo / parsedFrom
    : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fromId || !toId || fromId === toId || !fromAmount) return;
    if (isNaN(parsedFrom) || parsedFrom <= 0) return;
    if (isCrossCurrency && (isNaN(parsedTo) || parsedTo <= 0)) return;

    const transferId = id();
    const dateTs = dateInputToTimestamp(date);
    const fromTxnId = id();
    const toTxnId = id();
    const fromName = fromAccount?.name ?? 'account';
    const toName = toAccount?.name ?? 'account';
    const receivedAmount = isCrossCurrency ? parsedTo : parsedFrom;

    const ops = [
      // Expense on source account
      db.tx.transactions[fromTxnId].update({
        amount: parsedFrom,
        type: 'expense',
        description: isCCPayment ? `CC Payment → ${toName}` : `Transfer → ${toName}`,
        date: dateTs,
        notes: notes.trim() || undefined,
        isRecurring: false,
        transferId,
        createdAt: Date.now(),
        userId: user.id,
      }),
      db.tx.transactions[fromTxnId].link({ account: fromId }),
      // Income on destination account
      db.tx.transactions[toTxnId].update({
        amount: receivedAmount,
        type: 'income',
        description: isCCPayment ? `CC Payment ← ${fromName}` : `Transfer ← ${fromName}`,
        date: dateTs,
        notes: notes.trim() || undefined,
        isRecurring: false,
        transferId,
        createdAt: Date.now(),
        userId: user.id,
      }),
      db.tx.transactions[toTxnId].link({ account: toId }),
    ];

    // Fee: separate expense transaction on source account (no transferId — counts as real expense)
    if (isCrossCurrency && !isNaN(parsedFee) && parsedFee > 0) {
      const feeTxnId = id();
      ops.push(
        db.tx.transactions[feeTxnId].update({
          amount: parsedFee,
          type: 'expense',
          description: `Transfer fee (${fromAccount?.currency ?? ''} → ${toAccount?.currency ?? ''})`,
          date: dateTs,
          isRecurring: false,
          createdAt: Date.now(),
          userId: user.id,
        }),
        db.tx.transactions[feeTxnId].link({ account: fromId }),
      );
    }

    db.transact(ops);
    onClose();
  }

  const canSubmit = fromId && toId && fromId !== toId && !!fromAmount &&
    (!isCrossCurrency || !!toAmount);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
            {isCCPayment
              ? <><CreditCard size={18} className="text-indigo-500" /> Credit Card Payment</>
              : <>🔄 Transfer Between Accounts</>}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* From → To */}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="label">From</label>
              <select
                className="select"
                value={fromId}
                onChange={e => { setFromId(e.target.value); setFromAmount(''); setToAmount(''); setFee(''); }}
                required
              >
                <option value="">Select account</option>
                {payableAccounts.filter(a => a.id !== toId).map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <ArrowRight size={18} className="text-slate-400 mb-2.5 shrink-0" />
            <div className="flex-1">
              <label className="label">To</label>
              <select
                className="select"
                value={toId}
                onChange={e => { setToId(e.target.value); setToAmount(''); setFee(''); }}
                required
              >
                <option value="">Select account</option>
                {accounts.filter(a => a.id !== fromId).map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          {isCCPayment && !isCrossCurrency && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800">
              <CreditCard size={14} className="text-indigo-500 shrink-0" />
              <p className="text-indigo-600 dark:text-indigo-400 text-sm">
                Paying off <strong>{toAccount?.name}</strong> from <strong>{fromAccount?.name}</strong>
              </p>
            </div>
          )}

          {/* Same-currency: single amount field */}
          {!isCrossCurrency && (
            <div>
              <label className="label">
                Amount {fromAccount && <span className="text-muted font-normal">({fromAccount.currency})</span>}
              </label>
              <input
                className="input text-lg font-semibold"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={fromAmount}
                onChange={e => setFromAmount(e.target.value)}
                required
                autoFocus
              />
            </div>
          )}

          {/* Cross-currency: sent + received + optional fee */}
          {isCrossCurrency && (
            <>
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-2">
                  <Info size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-amber-700 dark:text-amber-300 text-sm">
                    Different currencies detected — enter the exact amounts on each side.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Amount sent <span className="text-muted font-normal">({fromAccount?.currency})</span></label>
                  <input
                    className="input font-semibold"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={fromAmount}
                    onChange={e => setFromAmount(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="label">Amount received <span className="text-muted font-normal">({toAccount?.currency})</span></label>
                  <input
                    className="input font-semibold"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={toAmount}
                    onChange={e => setToAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              {impliedRate !== null && (
                <p className="text-xs text-muted -mt-1">
                  Implied rate: 1 {fromAccount?.currency} = {impliedRate.toFixed(6)} {toAccount?.currency}
                </p>
              )}

              <div>
                <label className="label">
                  Transfer fee <span className="text-muted font-normal">({fromAccount?.currency}, optional)</span>
                </label>
                <input
                  className="input"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={fee}
                  onChange={e => setFee(e.target.value)}
                />
                <p className="text-xs text-muted mt-1 flex items-center gap-1">
                  <Info size={11} /> Recorded as a separate expense on {fromAccount?.name ?? 'source account'}
                </p>
              </div>
            </>
          )}

          <div>
            <label className="label">Date</label>
            <input
              className="input"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Notes <span className="text-muted font-normal">(optional)</span></label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Additional notes..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!canSubmit}>
              {isCCPayment ? 'Make Payment' : 'Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
