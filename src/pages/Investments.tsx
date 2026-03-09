import { useState } from 'react';
import { db } from '../db';
import { useUser } from '../context/UserContext';
import { useSettings } from '../context/SettingsContext';
import { useAssetPrices } from '../hooks/useAssetPrices';
import { formatCurrency } from '../utils/currency';
import type { Holding, Account } from '../types';
import HoldingModal from '../components/modals/HoldingModal';
import ConfirmModal from '../components/modals/ConfirmModal';
import {
  Plus, RefreshCw, TrendingUp, TrendingDown, Pencil, Trash2,
  BarChart2, Wifi, WifiOff, Clock, AlertCircle,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';

const TYPE_COLORS: Record<string, string> = {
  stock:  '#6366f1',
  etf:    '#8b5cf6',
  crypto: '#f97316',
  fund:   '#14b8a6',
  other:  '#94a3b8',
};

function PriceSourceIcon({ source }: { source: 'live' | 'cache' | 'manual' | 'missing' | undefined }) {
  if (source === 'live')    return <span title="Live price"><Wifi size={11} className="text-emerald-500" /></span>;
  if (source === 'cache')   return <span title="Cached price"><Clock size={11} className="text-yellow-500" /></span>;
  if (source === 'manual')  return <span title="Manual price"><AlertCircle size={11} className="text-slate-400" /></span>;
  return <span title="No price"><WifiOff size={11} className="text-red-400" /></span>;
}

export default function Investments() {
  const user = useUser();
  const { settings } = useSettings();
  const [showModal, setShowModal] = useState(false);
  const [editHolding, setEditHolding] = useState<Holding | undefined>();
  const [deleteHolding, setDeleteHolding] = useState<Holding | undefined>();

  const { data, isLoading } = db.useQuery({
    holdings: { $: { where: { userId: user.id } }, account: {} },
    accounts: { $: { where: { userId: user.id } } },
  });

  const holdings = (data?.holdings ?? []) as Holding[];
  const accounts = (data?.accounts ?? []) as Account[];

  const { prices, sources, loading: pricesLoading, error: pricesError, lastUpdated, refresh } = useAssetPrices(holdings);

  function handleDelete(h: Holding) {
    db.transact(db.tx.holdings[h.id].delete());
    setDeleteHolding(undefined);
  }

  if (isLoading) return <LoadingState />;

  // Summary stats
  const totalValue = holdings.reduce((s, h) => s + h.quantity * (prices[h.id] ?? 0), 0);
  const totalCost  = holdings.reduce((s, h) => s + h.quantity * h.costBasis, 0);
  const totalPnl   = totalValue - totalCost;
  const totalReturn = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  // Allocation by holding
  const allocationData = holdings
    .map(h => ({
      name: h.symbol,
      value: h.quantity * (prices[h.id] ?? 0),
      color: TYPE_COLORS[h.assetType] ?? '#94a3b8',
    }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  // Allocation by asset type
  const byType = holdings.reduce<Record<string, number>>((acc, h) => {
    const v = h.quantity * (prices[h.id] ?? 0);
    acc[h.assetType] = (acc[h.assetType] ?? 0) + v;
    return acc;
  }, {});
  const typeData = Object.entries(byType)
    .filter(([, v]) => v > 0)
    .map(([type, value]) => ({ name: type.charAt(0).toUpperCase() + type.slice(1), value, color: TYPE_COLORS[type] ?? '#94a3b8' }))
    .sort((a, b) => b.value - a.value);

  const sortedHoldings = [...holdings].sort((a, b) => {
    const av = a.quantity * (prices[a.id] ?? 0);
    const bv = b.quantity * (prices[b.id] ?? 0);
    return bv - av;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Investments</h1>
          <p className="page-subtitle">{holdings.length} holding{holdings.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-secondary flex items-center gap-2"
            onClick={refresh}
            disabled={pricesLoading}
            title="Refresh prices"
          >
            <RefreshCw size={14} className={pricesLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button className="btn-primary flex items-center gap-2" onClick={() => { setEditHolding(undefined); setShowModal(true); }}>
            <Plus size={16} /> Add Holding
          </button>
        </div>
      </div>

      {pricesError && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-400">
          <AlertCircle size={14} /> {pricesError}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <p className="label mb-1">Total Value</p>
          <p className="text-2xl font-bold text-primary">{formatCurrency(totalValue, settings.baseCurrency)}</p>
          {lastUpdated && <p className="text-xs text-muted mt-1">Updated {new Date(lastUpdated).toLocaleTimeString()}</p>}
        </div>
        <div className="card">
          <p className="label mb-1">Total Cost</p>
          <p className="text-2xl font-bold text-secondary">{formatCurrency(totalCost, settings.baseCurrency)}</p>
          <p className="text-xs text-muted mt-1">Avg. cost basis</p>
        </div>
        <div className="card">
          <p className="label mb-1">Unrealised P&amp;L</p>
          <p className={`text-2xl font-bold ${totalPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl, settings.baseCurrency)}
          </p>
          <p className="text-xs text-muted mt-1">Since purchase</p>
        </div>
        <div className="card">
          <p className="label mb-1">Total Return</p>
          <div className="flex items-center gap-1.5">
            {totalReturn >= 0
              ? <TrendingUp size={18} className="text-emerald-500" />
              : <TrendingDown size={18} className="text-red-500" />}
            <p className={`text-2xl font-bold ${totalReturn >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>

      {holdings.length === 0 ? (
        <div className="card text-center py-16">
          <BarChart2 size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
          <h2 className="text-primary font-medium mb-1">No holdings yet</h2>
          <p className="text-muted text-sm mb-4">Add stocks, ETFs or crypto to track your portfolio</p>
          <button className="btn-primary" onClick={() => { setEditHolding(undefined); setShowModal(true); }}>
            Add Holding
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Holdings table */}
          <div className="xl:col-span-2 card p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-sm font-semibold text-primary">Holdings</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">Asset</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">Price</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">Value</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">P&amp;L</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">Return</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {sortedHoldings.map(h => {
                    const price = prices[h.id] ?? 0;
                    const value = h.quantity * price;
                    const cost  = h.quantity * h.costBasis;
                    const pnl   = value - cost;
                    const ret   = cost > 0 ? (pnl / cost) * 100 : 0;
                    const allocation = totalValue > 0 ? (value / totalValue) * 100 : 0;
                    return (
                      <tr key={h.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                              style={{ backgroundColor: TYPE_COLORS[h.assetType] ?? '#94a3b8' }}
                            >
                              {h.symbol.slice(0, 3)}
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold text-primary text-sm">{h.symbol}</p>
                              <p className="text-muted text-xs truncate max-w-[120px]">{h.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-secondary tabular-nums">{h.quantity.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <div className="flex items-center justify-end gap-1">
                            <PriceSourceIcon source={sources[h.id]} />
                            <span className="text-secondary">{formatCurrency(price, h.currency)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-primary tabular-nums">
                          {formatCurrency(value, h.currency)}
                          <div className="text-xs text-muted font-normal">{allocation.toFixed(1)}%</div>
                        </td>
                        <td className={`px-4 py-3 text-right font-semibold tabular-nums ${pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {pnl >= 0 ? '+' : ''}{formatCurrency(pnl, h.currency)}
                        </td>
                        <td className={`px-4 py-3 text-right font-semibold tabular-nums ${ret >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {ret >= 0 ? '+' : ''}{ret.toFixed(2)}%
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="btn-ghost p-1.5" onClick={() => { setEditHolding(h); setShowModal(true); }}>
                              <Pencil size={13} />
                            </button>
                            <button className="btn-ghost p-1.5 hover:text-red-500" onClick={() => setDeleteHolding(h)}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Allocation charts */}
          <div className="space-y-4">
            {allocationData.length > 0 && (
              <div className="card">
                <h2 className="text-sm font-semibold text-primary mb-3">By Holding</h2>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={allocationData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={72}>
                      {allocationData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(val) => typeof val === 'number' ? formatCurrency(val, settings.baseCurrency) : String(val ?? '')} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {allocationData.slice(0, 6).map(d => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-secondary flex-1 truncate">{d.name}</span>
                      <span className="text-muted tabular-nums">
                        {totalValue > 0 ? ((d.value / totalValue) * 100).toFixed(1) : '0.0'}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {typeData.length > 0 && (
              <div className="card">
                <h2 className="text-sm font-semibold text-primary mb-3">By Asset Type</h2>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={38} outerRadius={62}>
                      {typeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(val) => typeof val === 'number' ? formatCurrency(val, settings.baseCurrency) : String(val ?? '')} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {typeData.map(d => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-secondary flex-1 capitalize">{d.name}</span>
                      <span className="text-muted tabular-nums">
                        {totalValue > 0 ? ((d.value / totalValue) * 100).toFixed(1) : '0.0'}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <HoldingModal
          holding={editHolding}
          accounts={accounts}
          onClose={() => { setShowModal(false); setEditHolding(undefined); }}
        />
      )}
      {deleteHolding && (
        <ConfirmModal
          title="Delete Holding"
          message={`Delete ${deleteHolding.symbol} (${deleteHolding.name})? This cannot be undone.`}
          onConfirm={() => handleDelete(deleteHolding)}
          onCancel={() => setDeleteHolding(undefined)}
        />
      )}
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
      <div className="card h-64 animate-pulse bg-slate-100 dark:bg-slate-800" />
    </div>
  );
}
