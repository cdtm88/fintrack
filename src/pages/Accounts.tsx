import { useState } from 'react';
import { db } from '../db';
import { useUser } from '../context/UserContext';
import type { Account, Transaction } from '../types';
import { ACCOUNT_TYPES } from '../types';
import { formatCurrency } from '../utils/currency';
import { getAccountBalance } from '../utils/calculations';
import AccountModal from '../components/modals/AccountModal';
import TransferModal from '../components/modals/TransferModal';
import ConfirmModal from '../components/modals/ConfirmModal';
import { Plus, Pencil, Trash2, Wallet, ArrowLeftRight, CreditCard } from 'lucide-react';

export default function Accounts() {
  const [showModal, setShowModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferToAccountId, setTransferToAccountId] = useState<string | undefined>();
  const [editAccount, setEditAccount] = useState<Account | undefined>();
  const [deleteAccount, setDeleteAccount] = useState<Account | undefined>();

  const user = useUser();

  const { data, isLoading } = db.useQuery({
    accounts: { $: { where: { userId: user.id } } },
    transactions: { $: { where: { userId: user.id } }, account: {} },
  });

  const accounts = (data?.accounts ?? []) as Account[];
  const transactions = (data?.transactions ?? []) as Transaction[];

  function handleDelete(a: Account) {
    const accountTxns = transactions.filter(t => t.account?.id === a.id);
    db.transact([
      ...accountTxns.map(t => db.tx.transactions[t.id].delete()),
      db.tx.accounts[a.id].delete(),
    ]);
    setDeleteAccount(undefined);
  }

  const accountTypeLabel = (type: string) =>
    ACCOUNT_TYPES.find(t => t.value === type)?.label ?? type;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card h-36 animate-pulse bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="page-title">Accounts</h1>
          <p className="page-subtitle">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button className="btn-secondary flex items-center gap-1.5 whitespace-nowrap" onClick={() => { setTransferToAccountId(undefined); setShowTransferModal(true); }}>
            <ArrowLeftRight size={15} /> <span className="hidden sm:inline">Transfer</span>
          </button>
          <button className="btn-primary flex items-center gap-1.5 whitespace-nowrap" onClick={() => { setEditAccount(undefined); setShowModal(true); }}>
            <Plus size={16} /> <span className="hidden sm:inline">New </span>Account
          </button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="card text-center py-16">
          <Wallet size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
          <h2 className="text-primary font-medium mb-1">No accounts yet</h2>
          <p className="text-muted text-sm mb-4">Add your bank accounts, wallets, and cards</p>
          <button className="btn-primary" onClick={() => { setEditAccount(undefined); setShowModal(true); }}>
            Add First Account
          </button>
        </div>
      ) : (
        <>
          {/* Assets / Liabilities totals */}
          {(() => {
            const assetsByCurrency: Record<string, number> = {};
            const liabsByCurrency: Record<string, number> = {};
            for (const a of accounts) {
              const bal = getAccountBalance(a, transactions);
              if (a.type === 'credit') {
                if (bal < 0) liabsByCurrency[a.currency] = (liabsByCurrency[a.currency] ?? 0) + Math.abs(bal);
              } else {
                assetsByCurrency[a.currency] = (assetsByCurrency[a.currency] ?? 0) + bal;
              }
            }
            const currencies = [...new Set([...Object.keys(assetsByCurrency), ...Object.keys(liabsByCurrency)])];
            return (
              <div className="flex flex-wrap gap-3">
                {currencies.map(currency => (
                  <div key={currency} className="card py-3 px-4 min-w-[160px]">
                    <p className="text-xs text-muted uppercase tracking-wide font-medium mb-2">{currency}</p>
                    {assetsByCurrency[currency] != null && (
                      <div className="flex items-center justify-between gap-6">
                        <span className="text-xs text-muted">Assets</span>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {formatCurrency(assetsByCurrency[currency], currency)}
                        </span>
                      </div>
                    )}
                    {liabsByCurrency[currency] != null && (
                      <div className="flex items-center justify-between gap-6 mt-1">
                        <span className="text-xs text-muted">Liabilities</span>
                        <span className="text-sm font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                          {formatCurrency(liabsByCurrency[currency], currency)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.sort((a, b) => a.createdAt - b.createdAt).map(account => {
              const balance = getAccountBalance(account, transactions);
              const txnCount = transactions.filter(t => t.account?.id === account.id).length;
              return (
                <div key={account.id} className="card group relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: account.color }} />
                  <div className="pl-3">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-primary font-semibold">{account.name}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            account.type === 'credit'
                              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}>
                            {accountTypeLabel(account.type)}
                          </span>
                          <span className="text-muted text-xs">{account.currency}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        {account.type === 'credit' && (
                          <button
                            className="btn-ghost p-1.5 text-indigo-500"
                            title="Make a payment to this card"
                            onClick={() => { setTransferToAccountId(account.id); setShowTransferModal(true); }}
                          >
                            <CreditCard size={13} />
                          </button>
                        )}
                        <button className="btn-ghost p-1.5" onClick={() => { setEditAccount(account); setShowModal(true); }}>
                          <Pencil size={13} />
                        </button>
                        <button className="btn-ghost p-1.5 hover:text-red-500" onClick={() => setDeleteAccount(account)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    {account.type === 'credit' && balance < 0 ? (
                      <>
                        <p className="text-2xl sm:text-3xl font-bold mb-0.5 truncate text-slate-900 dark:text-white">
                          {formatCurrency(Math.abs(balance), account.currency)}
                        </p>
                        <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">outstanding balance</p>
                      </>
                    ) : (
                      <p className={`text-2xl sm:text-3xl font-bold mb-1 truncate ${balance >= 0 ? 'text-slate-900 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(balance, account.currency)}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-muted text-xs">{txnCount} transaction{txnCount !== 1 ? 's' : ''}</span>
                      <span className="text-muted text-xs">Opening: {formatCurrency(account.initialBalance, account.currency)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {showModal && (
        <AccountModal
          account={editAccount}
          onClose={() => { setShowModal(false); setEditAccount(undefined); }}
        />
      )}
      {showTransferModal && (
        <TransferModal
          accounts={accounts}
          defaultToAccountId={transferToAccountId}
          onClose={() => { setShowTransferModal(false); setTransferToAccountId(undefined); }}
        />
      )}
      {deleteAccount && (
        <ConfirmModal
          title="Delete Account"
          message={`Delete "${deleteAccount.name}"? All ${transactions.filter(t => t.account?.id === deleteAccount.id).length} transactions will also be deleted.`}
          onConfirm={() => handleDelete(deleteAccount)}
          onCancel={() => setDeleteAccount(undefined)}
        />
      )}
    </div>
  );
}
