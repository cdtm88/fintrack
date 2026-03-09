import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import https from 'node:https'
import type { IncomingMessage, ServerResponse } from 'node:http'

// ─── Server-side Yahoo Finance proxy ─────────────────────────────────────────
// Yahoo Finance requires session cookies + a crumb token for API calls.
// Browsers can't fetch these directly (CORS), so we handle all /api/yf/*
// requests server-side via Node.js. This is more reliable than http-proxy
// because modifying proxyReq.path in the proxyReq event fires too late
// (the HTTP request line has already been written to the socket).

let _cookies = ''
let _crumb = ''
let _crumbAt = 0

function nodeGet(url: string, cookie = ''): Promise<{ body: string; cookies: string; status: number }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          ...(cookie ? { Cookie: cookie } : {}),
        },
      },
      (resp) => {
        let body = ''
        const cookies = (resp.headers['set-cookie'] ?? [])
          .map((c) => c.split(';')[0])
          .join('; ')
        resp.on('data', (d) => (body += d))
        resp.on('end', () => resolve({ body, cookies, status: resp.statusCode ?? 200 }))
      },
    )
    req.on('error', reject)
    req.end()
  })
}

async function ensureCrumb() {
  if (_crumb && Date.now() - _crumbAt < 3_600_000) return
  try {
    // Step 1: hit finance.yahoo.com to receive Yahoo session cookies
    const { cookies } = await nodeGet('https://finance.yahoo.com/')
    _cookies = cookies
    // Step 2: exchange cookies for a crumb
    const { body } = await nodeGet(
      'https://query1.finance.yahoo.com/v1/test/getcrumb',
      _cookies,
    )
    // Crumb is a short alphanumeric string, not JSON
    if (body && body.length < 50 && !body.startsWith('{') && !body.startsWith('<')) {
      _crumb = body.trim()
      _crumbAt = Date.now()
      console.log('[fintrack] Yahoo Finance crumb obtained ✓')
    } else {
      console.warn('[fintrack] Yahoo Finance crumb unexpected response:', body.slice(0, 100))
    }
  } catch (e) {
    console.warn('[fintrack] Yahoo Finance crumb fetch failed:', e)
  }
}

// ─── Vite config ─────────────────────────────────────────────────────────────
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'yahoo-finance-proxy',
      configureServer(server) {
        // Fetch crumb eagerly when the dev server starts
        ensureCrumb().catch(() => {})

        server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
          const url = req.url ?? ''

          // /api/yf-init — re-trigger crumb refresh, return status
          if (url.startsWith('/api/yf-init')) {
            await ensureCrumb()
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: !!_crumb, crumb: _crumb ? '✓' : '✗' }))
            return
          }

          // /api/yf/* — proxy to query1.finance.yahoo.com server-side
          if (!url.startsWith('/api/yf')) {
            next()
            return
          }

          await ensureCrumb()

          // Strip the /api/yf prefix
          let yfPath = url.slice('/api/yf'.length) || '/'

          // Append crumb to chart/quote requests that require it
          if (_crumb && yfPath.includes('/v8/finance/chart/')) {
            yfPath += (yfPath.includes('?') ? '&' : '?') + `crumb=${encodeURIComponent(_crumb)}`
          }

          try {
            const { body, status } = await nodeGet(
              `https://query1.finance.yahoo.com${yfPath}`,
              _cookies,
            )
            res.statusCode = status
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.end(body)
          } catch (e) {
            console.error('[fintrack] YF proxy error:', e)
            res.statusCode = 502
            res.end(JSON.stringify({ error: 'Yahoo Finance proxy failed' }))
          }
        })
      },
    },
  ],
})
