import { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useExchangeRates } from '../hooks/useExchangeRates';
import { restoreDefaultCategories } from '../hooks/useSeedCategories';
import { useUser } from '../context/UserContext';
import { CURRENCIES } from '../types';
import type { Category } from '../types';
import { db } from '../db';
import { Sun, Moon, RefreshCw, Wifi, WifiOff, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';

export default function Settings() {
  const { settings, updateSettings } = useSettings();
  const { lastUpdated, loading, error, refresh, rates } = useExchangeRates();
  const [restoreMsg, setRestoreMsg] = useState('');
  const user = useUser();

  const { data } = db.useQuery({ categories: { $: { where: { userId: user.id } } } });
  const categories = (data?.categories ?? []) as Category[];

  const isDark = settings.theme === 'dark';

  function handleRestoreCategories() {
    const added = restoreDefaultCategories(categories, user.id);
    setRestoreMsg(added > 0 ? `Added ${added} missing categor${added === 1 ? 'y' : 'ies'}.` : 'All default categories are already present.');
    setTimeout(() => setRestoreMsg(''), 4000);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Customise your Fintrack experience</p>
      </div>

      {/* Appearance */}
      <section className="card space-y-4">
        <h2 className="text-base font-semibold text-primary">Appearance</h2>

        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            {isDark ? <Moon size={20} className="text-indigo-400" /> : <Sun size={20} className="text-yellow-500" />}
            <div>
              <p className="text-sm font-medium text-primary">Theme</p>
              <p className="text-xs text-muted">{isDark ? 'Dark mode is on' : 'Light mode is on'}</p>
            </div>
          </div>
          <button
            onClick={() => updateSettings({ theme: isDark ? 'light' : 'dark' })}
            className={`relative inline-flex w-11 h-6 shrink-0 rounded-full transition-colors duration-200 focus:outline-none ${isDark ? 'bg-indigo-600' : 'bg-slate-300'}`}
          >
            <span
              className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${isDark ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </button>
        </div>

      </section>

      {/* Currency */}
      <section className="card space-y-4">
        <div>
          <h2 className="text-base font-semibold text-primary">Base Currency</h2>
          <p className="text-xs text-muted mt-0.5">Net worth on the dashboard will be converted and displayed in this currency</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {CURRENCIES.map(c => (
            <button
              key={c.code}
              onClick={() => updateSettings({ baseCurrency: c.code as 'AED' | 'GBP' | 'USD' | 'EUR' })}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-colors ${
                settings.baseCurrency === c.code
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <span className="text-xl font-bold text-slate-400">{c.symbol}</span>
              <div className="text-left">
                <p className={`text-sm font-semibold ${settings.baseCurrency === c.code ? 'text-indigo-600 dark:text-indigo-400' : 'text-primary'}`}>
                  {c.code}
                </p>
                <p className="text-xs text-muted">{c.name}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Exchange rates */}
      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-primary">Exchange Rates</h2>
            <p className="text-xs text-muted mt-0.5">
              {lastUpdated
                ? `Last updated: ${format(new Date(lastUpdated), 'MMM d, yyyy HH:mm')}`
                : 'Using fallback rates'}
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Updating…' : 'Refresh'}
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
            <WifiOff size={14} className="text-red-500" />
            <p className="text-red-600 dark:text-red-400 text-sm">Could not fetch live rates. Using cached or fallback rates.</p>
          </div>
        )}

        {!error && lastUpdated && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800">
            <Wifi size={14} className="text-emerald-500" />
            <p className="text-emerald-600 dark:text-emerald-400 text-sm">Live exchange rates active</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {CURRENCIES.map(c => (
            <div key={c.code} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
              <span className="text-sm font-medium text-primary">{c.code}</span>
              <span className="text-sm text-muted">
                1 USD = {(rates[c.code] ?? 1).toFixed(4)} {c.code}
              </span>
            </div>
          ))}
        </div>
      </section>
      {/* Data */}
      <section className="card space-y-4">
        <h2 className="text-base font-semibold text-primary">Data</h2>

        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <div>
            <p className="text-sm font-medium text-primary">Restore default categories</p>
            <p className="text-xs text-muted mt-0.5">
              Adds any missing defaults — won't touch or duplicate existing ones
            </p>
            {restoreMsg && <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-medium">{restoreMsg}</p>}
          </div>
          <button onClick={handleRestoreCategories} className="btn-secondary flex items-center gap-2 shrink-0 ml-4">
            <RotateCcw size={13} /> Restore
          </button>
        </div>
      </section>
    </div>
  );
}
