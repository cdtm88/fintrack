import { useState } from 'react';
import { id } from '@instantdb/react';
import { db } from '../db';
import { useUser } from '../context/UserContext';
import { markUserSeeded } from '../hooks/useSeedCategories';
import { ACCOUNT_TYPES, CURRENCIES, ACCOUNT_COLORS, DEFAULT_CATEGORIES } from '../types';
import type { Category } from '../types';
import { todayTimestamp, dateInputToTimestamp, timestampToDateInput } from '../utils/dates';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

const FEATURES = [
  {
    icon: '🏦',
    title: 'Multiple accounts',
    desc: 'Track checking, savings, credit cards and cash all in one place.',
  },
  {
    icon: '💱',
    title: 'Multi-currency',
    desc: 'AED, GBP, USD and EUR with live rates and automatic conversion.',
  },
  {
    icon: '📊',
    title: 'Smart insights',
    desc: 'Charts, budgets and spending breakdowns to keep you in control.',
  },
  {
    icon: '✨',
    title: 'Quick entry',
    desc: 'Autocomplete from past transactions so repeat expenses take seconds.',
  },
];

function StepIndicator({ current }: { current: 1 | 2 }) {
  return (
    <div className="flex items-center gap-3 mb-8">
      <div className="flex items-center gap-2 flex-1">
        <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
          1
        </div>
        <div className={`h-1 flex-1 rounded-full transition-colors ${current >= 2 ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${current >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
          2
        </div>
      </div>
      <p className="text-xs text-muted shrink-0">Step {current} of 2</p>
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="w-full max-w-lg space-y-8">
      <div className="text-center">
        <div className="text-6xl mb-4">💸</div>
        <h1 className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
          Welcome to Fintrack
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Your personal finance tracker. Let's get you set up in about a minute.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {FEATURES.map(f => (
          <div key={f.title} className="card py-4">
            <div className="text-2xl mb-2">{f.icon}</div>
            <h3 className="text-sm font-semibold text-primary mb-1">{f.title}</h3>
            <p className="text-xs text-muted leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      <button
        className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
        onClick={onNext}
      >
        Get started <ArrowRight size={18} />
      </button>
    </div>
  );
}

function AccountStep({ onNext }: { onNext: (accountId: string, currency: string) => void }) {
  const user = useUser();
  const [name, setName] = useState('');
  const [type, setType] = useState<'checking' | 'savings' | 'credit' | 'cash' | 'investment'>('checking');
  const [currency, setCurrency] = useState('AED');
  const [initialBalance, setInitialBalance] = useState('0');
  const [color, setColor] = useState<string>(ACCOUNT_COLORS[0]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const accountId = id();
    const now = Date.now();

    // Create account + seed all default categories in one transaction
    db.transact([
      db.tx.accounts[accountId].update({
        name: name.trim(),
        type,
        currency,
        initialBalance: parseFloat(initialBalance) || 0,
        color,
        createdAt: now,
        userId: user.id,
      }),
      ...DEFAULT_CATEGORIES.map(cat =>
        db.tx.categories[id()].update({ ...cat, createdAt: now, userId: user.id })
      ),
    ]);

    // Prevent Dashboard from double-seeding
    markUserSeeded(user.id);

    onNext(accountId, currency);
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <StepIndicator current={1} />

      <div>
        <h2 className="text-xl font-bold text-primary">Add your first account</h2>
        <p className="text-sm text-muted mt-1">
          Start with your main bank account or wallet. You can add more later.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">Account name</label>
          <input
            className="input"
            placeholder="e.g. HSBC Current, Barclays Savings"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Type</label>
            <select className="select" value={type} onChange={e => setType(e.target.value as typeof type)}>
              {ACCOUNT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Currency</label>
            <select className="select" value={currency} onChange={e => setCurrency(e.target.value)}>
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Current balance</label>
          <input
            className="input"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={initialBalance}
            onChange={e => setInitialBalance(e.target.value)}
          />
          <p className="text-xs text-muted mt-1">
            Enter today's balance so your net worth starts accurately.
          </p>
        </div>

        <div>
          <label className="label">Colour</label>
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

        <button
          type="submit"
          className="btn-primary w-full flex items-center justify-center gap-2"
          disabled={!name.trim()}
        >
          Create account <ArrowRight size={16} />
        </button>
      </form>
    </div>
  );
}

function TransactionStep({
  accountId,
  currency,
  onNext,
  onSkip,
}: {
  accountId: string;
  currency: string;
  onNext: () => void;
  onSkip: () => void;
}) {
  const user = useUser();
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(timestampToDateInput(todayTimestamp()));
  const [categoryId, setCategoryId] = useState('');

  const { data } = db.useQuery({
    categories: { $: { where: { userId: user.id } } },
  });
  const categories = (data?.categories ?? []) as Category[];
  const filteredCategories = categories.filter(c => c.type === type || c.type === 'both');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0 || !description.trim()) return;

    const txnId = id();
    const ops: ReturnType<typeof db.tx.transactions[string]['update']>[] = [
      db.tx.transactions[txnId].update({
        type,
        amount: parsedAmount,
        description: description.trim(),
        date: dateInputToTimestamp(date),
        isRecurring: false,
        createdAt: Date.now(),
        userId: user.id,
      }),
      db.tx.transactions[txnId].link({ account: accountId }),
    ];
    if (categoryId) ops.push(db.tx.transactions[txnId].link({ category: categoryId }));

    db.transact(ops);
    onNext();
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <StepIndicator current={2} />

      <div>
        <h2 className="text-xl font-bold text-primary">Log your first transaction</h2>
        <p className="text-sm text-muted mt-1">
          Record a recent income or expense to get started.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {/* Type toggle */}
        <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${type === 'expense' ? 'bg-red-500 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            onClick={() => { setType('expense'); setCategoryId(''); }}
          >
            Expense
          </button>
          <button
            type="button"
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${type === 'income' ? 'bg-emerald-500 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            onClick={() => { setType('income'); setCategoryId(''); }}
          >
            Income
          </button>
        </div>

        <div>
          <label className="label">Amount ({currency})</label>
          <input
            className="input text-lg font-semibold"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div>
          <label className="label">Description</label>
          <input
            className="input"
            placeholder="What was this for?"
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
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
            <label className="label">
              Category <span className="text-muted font-normal">(optional)</span>
            </label>
            <select
              className="select"
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
            >
              <option value="">No category</option>
              {filteredCategories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="btn-primary w-full flex items-center justify-center gap-2"
          disabled={!amount || !description.trim()}
        >
          Add transaction <ArrowRight size={16} />
        </button>
        <button type="button" className="btn-ghost w-full text-sm" onClick={onSkip}>
          Skip for now
        </button>
      </form>
    </div>
  );
}

function DoneStep({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="w-full max-w-sm text-center space-y-6">
      <div>
        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={44} className="text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-primary">You're all set!</h2>
        <p className="text-muted text-sm mt-2">
          Head to the dashboard to see your finances at a glance.
        </p>
      </div>

      <div className="card text-left">
        <p className="text-sm font-semibold text-primary mb-3">What to do next</p>
        <ul className="space-y-2.5">
          {[
            'Add more accounts — savings, credit cards, investments',
            'Set monthly budgets to track your spending limits',
            'Keep logging transactions as they happen',
            'Your partner can sign in with their own email',
          ].map(item => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted">
              <span className="text-indigo-500 shrink-0 mt-0.5">→</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <button className="btn-primary w-full py-3 text-base" onClick={onFinish}>
        Go to Dashboard
      </button>
    </div>
  );
}

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<'welcome' | 'account' | 'transaction' | 'done'>('welcome');
  const [createdAccount, setCreatedAccount] = useState<{ id: string; currency: string } | null>(null);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 py-12">
      {step === 'welcome' && (
        <WelcomeStep onNext={() => setStep('account')} />
      )}
      {step === 'account' && (
        <AccountStep
          onNext={(accountId, currency) => {
            setCreatedAccount({ id: accountId, currency });
            setStep('transaction');
          }}
        />
      )}
      {step === 'transaction' && createdAccount && (
        <TransactionStep
          accountId={createdAccount.id}
          currency={createdAccount.currency}
          onNext={() => setStep('done')}
          onSkip={() => setStep('done')}
        />
      )}
      {step === 'done' && (
        <DoneStep onFinish={onComplete} />
      )}
    </div>
  );
}
