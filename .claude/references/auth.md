# Authentication & Authorisation Security Checklist

## JWT (JSON Web Tokens)
- [ ] Algorithm explicitly specified and validated — reject `alg: none`
- [ ] RS256/ES256 preferred over HS256 for multi-service setups
- [ ] `exp` (expiration) claim validated and enforced
- [ ] `aud` (audience) and `iss` (issuer) claims validated
- [ ] JWT secret is high-entropy (≥256 bits) and not hardcoded
- [ ] Tokens not stored in `localStorage` — prefer `HttpOnly` cookies
- [ ] Refresh token rotation implemented; old tokens invalidated on use
- [ ] Short access token TTL (≤15 minutes recommended)

## OAuth 2.0 / OpenID Connect
- [ ] `state` parameter used and validated (CSRF protection)
- [ ] `nonce` used for OIDC flows
- [ ] Redirect URIs validated strictly — no wildcard or open redirects
- [ ] PKCE (`code_challenge`) used for public clients (SPAs, mobile)
- [ ] Client secrets not exposed in frontend code or public repos
- [ ] Token introspection or JWKS endpoint used for validation — not manual decoding

## Session Management
- [ ] Session IDs are cryptographically random (≥128 bits)
- [ ] Sessions invalidated on logout (server-side)
- [ ] Session fixation prevention: regenerate session ID after login
- [ ] Session cookies: `HttpOnly`, `Secure`, `SameSite=Strict` or `Lax`
- [ ] Session timeout enforced server-side (not just client-side)
- [ ] Concurrent session handling defined (limit or track)

## Password Handling
- [ ] Passwords hashed with bcrypt (cost ≥12), argon2id, or scrypt — never SHA/MD5
- [ ] Password reset tokens: single-use, short TTL (≤1 hour), high entropy
- [ ] Account enumeration prevented: identical responses for "user not found" vs "wrong password"
- [ ] Brute-force protection: rate limiting or account lockout on login endpoint
- [ ] Password complexity enforced (NIST 800-63B guidelines preferred over complexity rules)

## Authorisation
- [ ] Authorisation checks server-side on every request — not just at login
- [ ] Insecure Direct Object Reference (IDOR): resource IDs validated against current user's permissions
- [ ] Role/permission checks not based solely on client-supplied data
- [ ] Privilege escalation paths reviewed (e.g. user can modify their own role field)
- [ ] Admin routes protected with both auth AND authorisation checks

## MFA
- [ ] TOTP secrets stored encrypted, not plaintext
- [ ] Backup codes are single-use and hashed at rest
- [ ] MFA bypass flows (recovery) have equivalent security scrutiny
- [ ] MFA not bypassable via alternative login flows (e.g. OAuth login skips MFA)

## API Keys
- [ ] API keys have defined scopes/permissions — not all-powerful by default
- [ ] API keys rotatable and revocable
- [ ] Keys not logged in access logs or error messages
- [ ] Key prefixes used for scanning (e.g. `sk_live_...`) to enable secret scanning
