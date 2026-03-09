import { useState, useEffect, useRef } from 'react';
import { id } from '@instantdb/react';
import { db } from '../../db';
import { useUser } from '../../context/UserContext';
import type { Holding, Account } from '../../types';
import { ASSET_TYPES, CURRENCIES } from '../../types';
import { CRYPTO_IDS, CRYPTO_NAMES } from '../../hooks/useAssetPrices';
import { X, Info, Loader2 } from 'lucide-react';

interface Props {
  holding?: Holding;
  accounts: Account[];
  onClose: () => void;
}

interface Suggestion {
  symbol: string;
  name: string;
  priceId?: string;
  type?: string;
}

async function searchYahooFinance(query: string): Promise<Suggestion[]> {
  try {
    const res = await fetch(
      `/api/yf/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0&enableFuzzyQuery=false`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.quotes ?? [])
      .filter((q: { symbol?: string; longname?: string; shortname?: string; quoteType?: string }) =>
        q.symbol && (q.longname || q.shortname)
      )
      .map((q: { symbol: string; longname?: string; shortname?: string; quoteType?: string }) => ({
        symbol: q.symbol,
        name: q.longname ?? q.shortname ?? q.symbol,
        type: q.quoteType,
      }));
  } catch {
    return [];
  }
}

function searchCrypto(query: string): Suggestion[] {
  const q = query.toUpperCase();
  return Object.entries(CRYPTO_IDS)
    .filter(([sym]) => sym.startsWith(q) || sym.includes(q))
    .map(([sym, coinId]) => ({
      symbol: sym,
      name: CRYPTO_NAMES[sym] ?? sym,
      priceId: coinId,
    }))
    .slice(0, 8);
}

export default function HoldingModal({ holding, accounts, onClose }: Props) {
  const user = useUser();
  const [symbol, setSymbol] = useState(holding?.symbol ?? '');
  const [name, setName] = useState(holding?.name ?? '');
  const [assetType, setAssetType] = useState<Holding['assetType']>(holding?.assetType ?? 'stock');
  const [quantity, setQuantity] = useState(String(holding?.quantity ?? ''));
  const [costBasis, setCostBasis] = useState(String(holding?.costBasis ?? ''));
  const [currency, setCurrency] = useState(holding?.currency ?? 'USD');
  const [priceId, setPriceId] = useState(holding?.priceId ?? '');
  const [manualPrice, setManualPrice] = useState(holding ? String(holding.manualPrice ?? '') : '');
  const [accountId, setAccountId] = useState(holding?.account?.id ?? (accounts[0]?.id ?? ''));

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const isEdit = !!holding;
  const isCrypto = assetType === 'crypto';
  const isStock = assetType === 'stock' || assetType === 'etf' || assetType === 'fund';

  // Auto-suggest CoinGecko ID when typing a crypto symbol
  const suggestedCoinId = isCrypto ? (CRYPTO_IDS[symbol.toUpperCase()] ?? null) : null;

  useEffect(() => {
    if (isCrypto && suggestedCoinId && !priceId) {
      setPriceId(suggestedCoinId);
    }
  }, [symbol, isCrypto, suggestedCoinId, priceId]);

  // Debounced search for autocomplete
  useEffect(() => {
    if (!symbol.trim() || symbol.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      if (isCrypto) {
        setSuggestions(searchCrypto(symbol));
        setShowSuggestions(true);
      } else {
        const results = await searchYahooFinance(symbol);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      }
      setSearchLoading(false);
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [symbol, isCrypto]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function selectSuggestion(s: Suggestion) {
    setSymbol(s.symbol);
    setName(s.name);
    if (s.priceId) setPriceId(s.priceId);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!symbol.trim() || !name.trim() || !quantity || !costBasis || !accountId) return;

    const data = {
      symbol: symbol.trim().toUpperCase(),
      name: name.trim(),
      assetType,
      quantity: parseFloat(quantity),
      costBasis: parseFloat(costBasis),
      currency,
      priceId: priceId.trim() || undefined,
      manualPrice: manualPrice ? parseFloat(manualPrice) : undefined,
      createdAt: holding?.createdAt ?? Date.now(),
      userId: user.id,
    };

    const holdingId = isEdit ? holding.id : id();
    db.transact([
      db.tx.holdings[holdingId].update(data),
      db.tx.holdings[holdingId].link({ account: accountId }),
    ]);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-primary">{isEdit ? 'Edit Holding' : 'Add Holding'}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Asset type */}
          <div>
            <label className="label">Asset Type</label>
            <div className="flex gap-2 flex-wrap">
              {ASSET_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${assetType === t.value ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                  onClick={() => { setAssetType(t.value as Holding['assetType']); setSuggestions([]); setShowSuggestions(false); }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Symbol + Name with autocomplete */}
          <div className="grid grid-cols-2 gap-4">
            <div ref={wrapperRef} className="relative">
              <label className="label">Symbol / Ticker</label>
              <div className="relative">
                <input
                  className="input uppercase pr-7"
                  placeholder={isCrypto ? 'BTC' : 'AAPL'}
                  value={symbol}
                  onChange={e => { setSymbol(e.target.value); }}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  required
                  autoFocus
                  autoComplete="off"
                />
                {searchLoading && (
                  <Loader2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
                )}
              </div>

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden max-h-52 overflow-y-auto">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      onMouseDown={e => { e.preventDefault(); selectSuggestion(s); }}
                    >
                      <span className="text-sm font-semibold text-primary w-16 shrink-0">{s.symbol}</span>
                      <span className="text-xs text-muted truncate flex-1">{s.name}</span>
                      {s.type && (
                        <span className="text-xs text-slate-400 shrink-0 capitalize">{s.type.toLowerCase()}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="label">Full Name</label>
              <input
                className="input"
                placeholder={isCrypto ? 'Bitcoin' : 'Apple Inc.'}
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Quantity + Cost Basis */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Quantity</label>
              <input
                className="input"
                type="number"
                step="any"
                min="0"
                placeholder="10"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Avg. Cost per Unit</label>
              <input
                className="input"
                type="number"
                step="any"
                min="0"
                placeholder="150.00"
                value={costBasis}
                onChange={e => setCostBasis(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Currency + Account */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Price Currency</label>
              <select className="select" value={currency} onChange={e => setCurrency(e.target.value)}>
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Account</label>
              <select className="select" value={accountId} onChange={e => setAccountId(e.target.value)} required>
                <option value="">Select account</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* CoinGecko ID (crypto) or Yahoo symbol override (stocks) */}
          {isCrypto && (
            <div>
              <label className="label">CoinGecko ID</label>
              <input
                className="input"
                placeholder="e.g. bitcoin, ethereum, solana"
                value={priceId}
                onChange={e => setPriceId(e.target.value)}
              />
              {suggestedCoinId && !priceId && (
                <p className="text-xs text-indigo-500 mt-1 flex items-center gap-1">
                  <Info size={11} /> Suggested: <span className="font-medium">{suggestedCoinId}</span>
                </p>
              )}
              <p className="text-xs text-muted mt-1">
                Find the ID at coingecko.com — it's in the URL for each coin.
              </p>
            </div>
          )}

          {isStock && (
            <div>
              <label className="label">Yahoo Finance Symbol <span className="text-muted font-normal">(if different)</span></label>
              <input
                className="input"
                placeholder={`e.g. ${symbol || 'VUSA'}.L for London-listed`}
                value={priceId}
                onChange={e => setPriceId(e.target.value)}
              />
              <p className="text-xs text-muted mt-1">
                Leave blank to use the ticker above. Add exchange suffix for non-US stocks (e.g. .L, .PA, .AS).
              </p>
            </div>
          )}

          {/* Manual price fallback */}
          <div>
            <label className="label">
              Manual Price Override <span className="text-muted font-normal">(optional)</span>
            </label>
            <input
              className="input"
              type="number"
              step="any"
              min="0"
              placeholder="Enter price manually if auto-fetch isn't available"
              value={manualPrice}
              onChange={e => setManualPrice(e.target.value)}
            />
            <p className="text-xs text-muted mt-1">
              Used as a fallback if live prices can't be fetched.
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!symbol.trim() || !name.trim() || !quantity || !costBasis || !accountId}
            >
              {isEdit ? 'Save Changes' : 'Add Holding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
