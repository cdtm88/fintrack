# Python Security Checklist

## Injection
- [ ] SQL queries use parameterised queries (`cursor.execute(sql, params)`) — never f-strings or `%` formatting
- [ ] ORM usage: check for `.raw()` queries or `.extra()` with user input (Django), `text()` in SQLAlchemy
- [ ] `subprocess` calls: use list form (`['ls', path]`), never `shell=True` with user input
- [ ] `eval()`, `exec()`, `compile()` — flag all uses near user input
- [ ] `pickle.loads()` on untrusted data — critical RCE risk
- [ ] `yaml.load()` without `Loader=yaml.SafeLoader` — flag

## Input Validation
- [ ] Request data validated with pydantic, marshmallow, or similar — not ad-hoc
- [ ] File uploads: extension, MIME type, and size validated server-side
- [ ] Path traversal: `os.path.join` with user input — check for `..` and absolute path injection
- [ ] Integer/type coercions on user-supplied data without validation

## Secrets & Credentials
- [ ] No hardcoded secrets, tokens, or passwords in source
- [ ] `os.environ.get('SECRET')` — check for fallback defaults that are insecure
- [ ] Secrets not logged via `logging.*`, `print()`, or exception handlers
- [ ] Django `SECRET_KEY` / Flask `SECRET_KEY` not hardcoded or using defaults

## Authentication & Sessions (Framework-Specific)
- [ ] Django: `DEBUG=True` not in production settings; `ALLOWED_HOSTS` not `['*']`
- [ ] Flask: `app.secret_key` not hardcoded; session cookie `HttpOnly` and `Secure` flags set
- [ ] FastAPI: OAuth2/JWT deps applied to protected routes
- [ ] Password hashing: `bcrypt`, `argon2`, or `pbkdf2` — never `md5`/`sha1`/plain

## Dependencies
- [ ] `requirements.txt` pins exact versions for security-sensitive packages
- [ ] Known vulnerable packages (check common patterns: older `requests`, `cryptography`, `Pillow`)
- [ ] `setup.py` or `pyproject.toml` not fetching from untrusted sources

## Error Handling
- [ ] `except Exception` swallowing errors silently — flag
- [ ] Stack traces or raw exception messages returned in HTTP responses
- [ ] Django `DEBUG=True` exposing tracebacks in responses

## File & OS Operations
- [ ] `open()` with user-supplied filenames — check for path traversal
- [ ] `tempfile` usage: using `tempfile.mkstemp()` not `tempfile.mktemp()` (race condition)
- [ ] XML parsing: using `defusedxml` not stdlib `xml` (XXE vulnerability)

## Serialisation
- [ ] `pickle` / `marshal` / `shelve` with any external data — critical
- [ ] `json.loads` on untrusted input — safe, but validate schema after parsing
- [ ] `ast.literal_eval` preferred over `eval` for data parsing
