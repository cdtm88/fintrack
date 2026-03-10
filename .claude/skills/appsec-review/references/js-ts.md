# JavaScript / TypeScript Security Checklist

## Injection
- [ ] SQL queries use parameterised queries or ORM — never string concatenation
- [ ] NoSQL queries (MongoDB etc.) sanitise user input, no `$where` with user data
- [ ] `eval()`, `Function()`, `setTimeout(string)` — flag any dynamic code execution
- [ ] Shell commands via `child_process` — check for unsanitised input
- [ ] Template literals used in queries or shell commands

## Input Validation & Sanitisation
- [ ] All user input validated with a schema library (zod, joi, yup, etc.)
- [ ] File upload types and sizes validated server-side, not just client-side
- [ ] Path traversal: check `path.join` / `path.resolve` with user-supplied paths
- [ ] JSON.parse on untrusted input wrapped in try/catch with schema validation

## Secrets & Credentials
- [ ] No hardcoded API keys, tokens, passwords, or secrets in source
- [ ] `.env` files not committed; `.gitignore` includes `.env`
- [ ] `process.env` values validated at startup (not silently `undefined`)
- [ ] Secrets not logged (check `console.log`, `logger.*`, error handlers)

## Dependencies
- [ ] `package.json` not using `*` or overly broad version ranges for sensitive packages
- [ ] Known vulnerable packages (check against npm audit patterns)
- [ ] `postinstall` scripts in `node_modules` — flag if present in direct deps

## Error Handling
- [ ] Error messages don't leak stack traces to clients in production
- [ ] Express/Koa/Fastify error handlers return generic messages externally
- [ ] No `res.json(err)` or `res.send(error.stack)` patterns

## API Security (Node.js servers)
- [ ] Rate limiting on auth and sensitive endpoints
- [ ] CORS configured restrictively — not `origin: '*'` in production
- [ ] Helmet.js (or equivalent) used for HTTP security headers
- [ ] Request size limits set (`express.json({ limit: '...' })`)
- [ ] HTTP methods restricted per route (no catch-all)

## Prototype Pollution
- [ ] `Object.assign`, spread with user-supplied keys — check for `__proto__`, `constructor`, `prototype`
- [ ] `lodash.merge` / `_.set` with user input — flag
- [ ] Deep merge utilities called with untrusted data

## TypeScript-Specific
- [ ] `any` type used to bypass validation — flag instances touching user input
- [ ] Type assertions (`as SomeType`) on user-supplied data without runtime validation
- [ ] `!` non-null assertions on values derived from external input
