import type { VercelRequest, VercelResponse } from '@vercel/node';

const FINNHUB_KEY = process.env.FINNHUB_KEY;
const ALLOWED_ORIGINS = [
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
  process.env.ALLOWED_ORIGIN ?? '',
  'http://localhost:5173',
].filter(Boolean);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin ?? '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!FINNHUB_KEY) {
    return res.status(500).json({ error: 'FINNHUB_KEY not configured' });
  }

  const symbol = typeof req.query.symbol === 'string' ? req.query.symbol.trim() : '';
  if (!symbol || symbol.length > 20 || !/^[A-Za-z0-9.\-]+$/.test(symbol)) {
    return res.status(400).json({ error: 'Invalid symbol' });
  }

  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`;
    const upstream = await fetch(url);
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'Upstream error' });
    }
    const data = await upstream.json();
    // Only return the current price field — don't proxy the full response
    const price = typeof data.c === 'number' && data.c > 0 ? data.c : null;
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ price });
  } catch {
    return res.status(502).json({ error: 'Failed to fetch quote' });
  }
}
