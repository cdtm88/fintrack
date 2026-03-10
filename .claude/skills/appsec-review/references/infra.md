# Infrastructure & Configuration Security Checklist

## Dockerfile
- [ ] Base image is specific (pinned tag or SHA digest) — not `latest`
- [ ] Base image is minimal (`alpine`, `distroless`, `slim`) — not full OS images unless needed
- [ ] Running as non-root user — `USER` instruction present before `CMD`/`ENTRYPOINT`
- [ ] No secrets in `ENV`, `ARG`, `RUN` commands (visible in image layers)
- [ ] Multi-stage builds used to exclude build tools and source from final image
- [ ] `COPY` used instead of `ADD` (unless tar extraction needed)
- [ ] `.dockerignore` present and excludes `.env`, `node_modules`, `.git`, credentials
- [ ] Health check (`HEALTHCHECK`) defined
- [ ] No `--privileged` flag or `CAP_ADD` in Dockerfile (check compose too)
- [ ] Read-only filesystem where possible (`--read-only` at runtime)

## Docker Compose
- [ ] No hardcoded secrets in `environment:` blocks — use `env_file` or secrets manager
- [ ] Ports not unnecessarily exposed to host (e.g. DB port `5432:5432` exposed publicly)
- [ ] `privileged: true` — flag immediately
- [ ] Networks defined and services isolated — not all on default bridge
- [ ] Volume mounts don't expose sensitive host paths (e.g. `/etc`, `/var/run/docker.sock`)
- [ ] `docker.sock` mounted — flag as critical (container escape risk)
- [ ] Resource limits (`mem_limit`, `cpus`) defined for production

## Environment Variables & Secrets
- [ ] `.env` files not committed to version control
- [ ] `.env.example` present without real values
- [ ] Secrets not passed as CLI arguments (visible in `ps aux`)
- [ ] Production secrets managed via secrets manager (Vault, AWS Secrets Manager, etc.) — not flat files
- [ ] Secret rotation process exists

## CI/CD (GitHub Actions, etc.)
- [ ] Secrets stored in CI secret store — not hardcoded in workflow YAML
- [ ] `${{ github.event.issue.body }}` or similar user-controlled input not used directly in `run:` steps (script injection)
- [ ] Third-party actions pinned to commit SHA — not `@main` or `@v1`
- [ ] `pull_request_target` trigger with checkout of fork code — flag (privileged context + untrusted code)
- [ ] Minimal permissions on `GITHUB_TOKEN` (`permissions:` block present)
- [ ] Workflow triggers reviewed — are they appropriately restricted?
- [ ] Artefacts don't include secrets or sensitive build outputs

## Network & TLS
- [ ] TLS 1.2+ enforced; TLS 1.0/1.1 disabled
- [ ] Self-signed certificates only in dev — not production
- [ ] Internal service communication encrypted where possible
- [ ] Firewall / security group rules follow least privilege (not `0.0.0.0/0` on sensitive ports)

## General Hardening
- [ ] Unnecessary services/packages not installed in containers
- [ ] Log aggregation configured — security events are captured
- [ ] Dependency scanning in CI pipeline (e.g. Trivy, Snyk, Dependabot)
- [ ] Image scanning in CI before push to registry
