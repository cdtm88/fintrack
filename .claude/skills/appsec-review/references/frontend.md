# Frontend / Browser Security Checklist

## Cross-Site Scripting (XSS)
- [ ] No `innerHTML`, `outerHTML`, `document.write()` with user-controlled data
- [ ] React: no `dangerouslySetInnerHTML` with unsanitised content
- [ ] URL parameters rendered into the DOM — check for DOM-based XSS
- [ ] `href`, `src`, `action` attributes set from user data — validate against allowlist (block `javascript:`)
- [ ] Third-party scripts loaded — are they from trusted CDNs with SRI hashes?

## Content Security Policy (CSP)
- [ ] CSP header present and not using `unsafe-inline` or `unsafe-eval`
- [ ] `script-src` restricted to specific origins or uses nonces
- [ ] `default-src` not set to `*`
- [ ] CSP violations being reported (`report-uri` or `report-to`)

## CSRF
- [ ] State-changing requests use CSRF tokens (if cookie-based auth)
- [ ] `SameSite=Strict` or `Lax` on session cookies (mitigates most CSRF)
- [ ] Custom request headers used for AJAX (e.g. `X-Requested-With`) as secondary defence
- [ ] CORS not configured to allow all origins with credentials

## Sensitive Data in Frontend
- [ ] No secrets, API keys, or private tokens in frontend bundle
- [ ] Sensitive data not stored in `localStorage` or `sessionStorage` (prefer memory or HttpOnly cookies)
- [ ] Source maps not exposed in production (leaks original source code)
- [ ] No PII logged to `console.*` in production builds

## Third-Party Dependencies
- [ ] Subresource Integrity (SRI) hashes on CDN-loaded scripts and stylesheets
- [ ] Third-party iframes use `sandbox` attribute appropriately
- [ ] `postMessage` handlers validate `event.origin` before processing

## HTTP Security Headers
- [ ] `X-Frame-Options: DENY` or `SAMEORIGIN` (or CSP `frame-ancestors`)
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `Referrer-Policy` set to `strict-origin-when-cross-origin` or stricter
- [ ] `Permissions-Policy` disabling unused browser features (camera, mic, geolocation)
- [ ] HTTPS enforced; `Strict-Transport-Security` (HSTS) header present

## React/Next.js Specific
- [ ] `next.config.js` security headers configured
- [ ] Server components not passing sensitive server-side data directly as props to client components
- [ ] API routes validate and sanitise input — not trusting `req.body` directly
- [ ] Environment variables: `NEXT_PUBLIC_` prefix only for genuinely public values

## URL & Redirect Safety
- [ ] Open redirect: redirects only to allowlisted or same-origin URLs
- [ ] `window.location` set from user input — validate before setting
- [ ] `target="_blank"` links use `rel="noopener noreferrer"`
