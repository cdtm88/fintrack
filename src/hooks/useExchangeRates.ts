import { useState, useEffect } from 'react';

export interface ExchangeRates {
  // Rates relative to USD (1 USD = X currency)
  rates: Record<string, number>;
  lastUpdated: number | null;
  loading: boolean;
  error: string | null;
}

const CACHE_KEY = 'fintrack_exchange_rates';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function loadCache(): { rates: Record<string, number>; lastUpdated: number } | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    if (Date.now() - parsed.lastUpdated > CACHE_TTL) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function useExchangeRates() {
  const [state, setState] = useState<ExchangeRates>(() => {
    const cached = loadCache();
    return {
      rates: cached?.rates ?? { USD: 1, AED: 3.6725, GBP: 0.79, EUR: 0.92 },
      lastUpdated: cached?.lastUpdated ?? null,
      loading: !cached,
      error: null,
    };
  });

  useEffect(() => {
    const cached = loadCache();
    if (cached) {
      setState(prev => ({ ...prev, rates: cached.rates, lastUpdated: cached.lastUpdated, loading: false }));
      return;
    }

    fetch('https://open.er-api.com/v6/latest/USD')
      .then(r => r.json())
      .then(data => {
        if (data.result === 'success') {
          const now = Date.now();
          localStorage.setItem(CACHE_KEY, JSON.stringify({ rates: data.rates, lastUpdated: now }));
          setState({ rates: data.rates, lastUpdated: now, loading: false, error: null });
        } else {
          throw new Error('Failed to fetch rates');
        }
      })
      .catch(err => {
        setState(prev => ({ ...prev, loading: false, error: err.message }));
      });
  }, []);

  // Convert an amount from one currency to another
  function convert(amount: number, from: string, to: string): number {
    if (from === to) return amount;
    const fromRate = state.rates[from] ?? 1;
    const toRate = state.rates[to] ?? 1;
    return amount * (toRate / fromRate);
  }

  function refresh() {
    localStorage.removeItem(CACHE_KEY);
    setState(prev => ({ ...prev, loading: true, error: null }));
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(r => r.json())
      .then(data => {
        if (data.result === 'success') {
          const now = Date.now();
          localStorage.setItem(CACHE_KEY, JSON.stringify({ rates: data.rates, lastUpdated: now }));
          setState({ rates: data.rates, lastUpdated: now, loading: false, error: null });
        }
      })
      .catch(err => setState(prev => ({ ...prev, loading: false, error: err.message })));
  }

  return { ...state, convert, refresh };
}
