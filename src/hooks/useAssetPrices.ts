import { useState, useEffect, useRef } from 'react';
import type { Holding } from '../types';

const CACHE_KEY = 'fintrack_asset_prices';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// Warm up the server-side Yahoo Finance crumb as soon as this module loads
// (only in dev — the /api/yf-init endpoint only exists in dev mode)
if (import.meta.env.DEV) {
  fetch('/api/yf-init').catch(() => {});
}

type PriceCache = Record<string, { price: number; timestamp: number }>;

function loadCache(): PriceCache {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}'); } catch { return {}; }
}
function saveCache(cache: PriceCache) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
}

/** Known crypto symbol → human-readable name */
export const CRYPTO_NAMES: Record<string, string> = {
  BTC: 'Bitcoin', ETH: 'Ethereum', BNB: 'BNB', SOL: 'Solana',
  ADA: 'Cardano', XRP: 'XRP', DOT: 'Polkadot', DOGE: 'Dogecoin',
  AVAX: 'Avalanche', MATIC: 'Polygon', LINK: 'Chainlink',
  LTC: 'Litecoin', UNI: 'Uniswap', ATOM: 'Cosmos', NEAR: 'NEAR Protocol',
  ALGO: 'Algorand', VET: 'VeChain', SHIB: 'Shiba Inu', FTM: 'Fantom',
  USDT: 'Tether', USDC: 'USD Coin', SAND: 'The Sandbox',
};

/** Known crypto symbol → CoinGecko ID mappings */
export const CRYPTO_IDS: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', BNB: 'binancecoin', SOL: 'solana',
  ADA: 'cardano', XRP: 'ripple', DOT: 'polkadot', DOGE: 'dogecoin',
  AVAX: 'avalanche-2', MATIC: 'matic-network', LINK: 'chainlink',
  LTC: 'litecoin', UNI: 'uniswap', ATOM: 'cosmos', NEAR: 'near',
  ALGO: 'algorand', VET: 'vechain', SHIB: 'shiba-inu', FTM: 'fantom',
  USDT: 'tether', USDC: 'usd-coin', SAND: 'the-sandbox',
};

async function fetchCryptoPrices(
  coinIds: string[],
  currencies: string[],
): Promise<Record<string, Record<string, number>>> {
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(',')}&vs_currencies=${currencies.join(',')}`
  );
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  return res.json();
}

async function fetchStockPrice(symbol: string): Promise<number | null> {
  try {
    // Use Vite proxy to avoid CORS restrictions from Yahoo Finance
    const res = await fetch(
      `/api/yf/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
  } catch {
    return null;
  }
}

export type PriceSource = 'live' | 'cache' | 'manual' | 'missing';

export function useAssetPrices(holdings: Holding[]) {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [sources, setSources] = useState<Record<string, PriceSource>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // Stable ref so the effect always sees the latest holdings
  const holdingsRef = useRef(holdings);
  holdingsRef.current = holdings;

  // Only re-run when the meaningful content of holdings changes
  const holdingsKey = [...holdings]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(h => `${h.id}:${h.priceId ?? h.symbol}:${h.currency}:${h.assetType}:${h.manualPrice ?? ''}`)
    .join('|');

  useEffect(() => {
    const hs = holdingsRef.current;
    if (hs.length === 0) { setPrices({}); setSources({}); return; }

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      const cache = loadCache();
      const result: Record<string, number> = {};
      const srcMap: Record<string, PriceSource> = {};
      const isForced = refreshTick > 0;

      // Pass 1: apply cache or manual prices
      for (const h of hs) {
        const key = h.priceId ?? h.symbol;
        const entry = cache[key];
        if (!isForced && entry && Date.now() - entry.timestamp < CACHE_TTL) {
          result[h.id] = entry.price;
          srcMap[h.id] = 'cache';
        } else if (h.manualPrice != null) {
          result[h.id] = h.manualPrice;
          srcMap[h.id] = 'manual';
        }
      }

      // Pass 2: batch-fetch crypto from CoinGecko
      const cryptoNeeded = hs.filter(h => h.assetType === 'crypto' && result[h.id] == null);
      if (cryptoNeeded.length > 0) {
        try {
          const coinIds = [...new Set(
            cryptoNeeded.map(h => h.priceId ?? CRYPTO_IDS[h.symbol.toUpperCase()] ?? h.symbol.toLowerCase())
          )];
          const currencies = [...new Set(cryptoNeeded.map(h => h.currency.toLowerCase()))];
          const data = await fetchCryptoPrices(coinIds, currencies);

          for (const h of cryptoNeeded) {
            const coinId = h.priceId ?? CRYPTO_IDS[h.symbol.toUpperCase()] ?? h.symbol.toLowerCase();
            const price = data[coinId]?.[h.currency.toLowerCase()];
            if (price != null) {
              result[h.id] = price;
              srcMap[h.id] = 'live';
              cache[coinId] = { price, timestamp: Date.now() };
            }
          }
        } catch {
          setError('Could not reach CoinGecko. Using cached or manual prices for crypto.');
        }
      }

      // Pass 3: fetch stocks/ETFs/funds from Yahoo Finance
      const stockNeeded = hs.filter(
        h => (h.assetType === 'stock' || h.assetType === 'etf' || h.assetType === 'fund') && result[h.id] == null
      );
      await Promise.allSettled(
        stockNeeded.map(async h => {
          const symbol = h.priceId ?? h.symbol;
          const price = await fetchStockPrice(symbol);
          if (price != null) {
            result[h.id] = price;
            srcMap[h.id] = 'live';
            cache[symbol] = { price, timestamp: Date.now() };
          }
        })
      );

      // Pass 4: anything still missing falls back to manual price or 0
      for (const h of hs) {
        if (result[h.id] == null) {
          result[h.id] = h.manualPrice ?? 0;
          srcMap[h.id] = h.manualPrice != null ? 'manual' : 'missing';
        }
      }

      if (!cancelled) {
        saveCache(cache);
        setPrices(result);
        setSources(srcMap);
        setLastUpdated(Date.now());
        setLoading(false);
      }
    }

    run().catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [holdingsKey, refreshTick]);

  return {
    prices,
    sources,
    loading,
    error,
    lastUpdated,
    refresh: () => setRefreshTick(t => t + 1),
  };
}
