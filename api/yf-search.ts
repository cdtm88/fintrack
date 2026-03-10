import type { VercelRequest, VercelResponse } from '@vercel/node';

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

  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!query || query.length > 100) {
    return res.status(400).json({ error: 'Invalid query' });
  }

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0&enableFuzzyQuery=false`;
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'Upstream error' });
    }
    const data = await upstream.json();
    // Only return the quotes array — strip everything else
    const quotes = (data?.quotes ?? [])
      .filter((q: Record<string, unknown>) => q.symbol && (q.longname || q.shortname))
      .map((q: Record<string, unknown>) => ({
        symbol: q.symbol,
        name: q.longname ?? q.shortname ?? q.symbol,
        type: q.quoteType,
      }));
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ quotes });
  } catch {
    return res.status(502).json({ error: 'Failed to search' });
  }
}
