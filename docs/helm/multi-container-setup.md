---
sidebar_position: 2
id: multi-container-setup
title: Multi-Container Setup
---

# Multi-Container Deployment

All applications (aims and aims-core) are deployed as **multi-container** setups: separate frontend (Next.js) and backend (Django) containers with their own services.

## Template Structure

```
helm-template/templates/
├── deployment-multi.yaml   # Frontend + backend Deployments
├── service-multi.yaml      # Frontend + backend Services
├── ingress.yaml            # Ingress with path-based routing
├── secrets.yaml            # Django secret, postgres credentials
├── serviceaccount.yaml
├── hpa.yaml                # Optional HPA
├── _helpers.tpl
├── NOTES.txt
├── namespace.yaml
└── middleware/
    ├── admin-path-exclusion.yaml   # Block /admin for tenants
    └── redirect-dashboard.yaml     # Redirect / to /dashboard
```

## Deployments

### Frontend

- Image: `ghcr.io/africaone-dev/aims-frontend` (or `aims-core-frontend`)
- Port: 3000
- Env: `NEXT_PUBLIC_API_BASE_URL` pointing to backend service

### Backend

- Image: `ghcr.io/africaone-dev/aims-backend` (or `aims-core-backend`)
- Port: 8000
- Init containers (tenant chart): `create-db`, `migrate-tenant`, `bootstrap-tenant`
- Init containers (aims-core chart): `migrate`
- Env: database connection, Django settings, tenant-specific vars

### Init Containers

The tenant chart (`helm-template`) runs three init containers before the backend starts:

1. **create-db** — creates the tenant database (`tenant_TENANT`) if it doesn't exist
2. **migrate-tenant** — runs Django migrations against the tenant database
3. **bootstrap-tenant** — seeds initial data (roles, permissions)

The aims-core chart (`helm-aims-core`) runs a single `migrate` init container.

## Ingress Routing

Path-based routing directs traffic to the correct service:

```yaml
ingress:
  hosts:
    - host: "school1.aimsgo.com"
      paths:
        - path: /api
          pathType: Prefix
          backend: { service: { name: backend, port: 8000 } }
        - path: /admin
          pathType: Prefix
          backend: { service: { name: backend, port: 8000 } }
        - path: /
          pathType: Prefix
          backend: { service: { name: frontend, port: 3000 } }
  tls:
    - hosts: ["school1.aimsgo.com"]
      secretName: "school1-tls"
```

TLS certificates are issued automatically by cert-manager with Let's Encrypt.

## Traefik Middleware

Optional middleware can be enabled per tenant:

### Admin Path Exclusion

Blocks access to `/admin` for tenant deployments (enabled by default for tenants):

```yaml
enableAdminPathExclusion: true
```

### Dashboard Redirect

Redirects `/` to `/dashboard`:

```yaml
enableRedirectDashboard: true
```

## Database Configuration

Each tenant gets its own PostgreSQL database (`tenant_TENANT`), created by the `create-db` init container. Connection goes through PgBouncer:

```yaml
backend:
  env:
    - name: DB_HOST
      value: "aimsgo-db-pgbouncer.database.svc.cluster.local"
    - name: DB_PORT
      value: "5432"
    - name: TENANT_DB_NAME
      value: "tenant_school1"
    - name: CORE_DB_NAME
      value: "aimsgo_core"
    - name: CORE_DB_PASSWORD
      valueFrom:
        secretKeyRef:
          name: postgres-credentials
          key: password
```

## Secrets

Managed via `secrets.yaml` template:

| Secret | Source | Description |
|---|---|---|
| `postgres-credentials` | Reflector (from `default` ns) | PostgreSQL password |
| `ghcr-registry` | Reflector (from `default` ns) | GHCR image pull credentials |
| `{tenant}-django-secret` | Created by tenant-management workflow | Django `SECRET_KEY` |

## Health Checks

Default probes:

```yaml
# Frontend
livenessProbe:
  httpGet: { path: /, port: 3000 }
readinessProbe:
  httpGet: { path: /, port: 3000 }

# Backend
livenessProbe:
  httpGet: { path: /health/, port: 8000 }
  initialDelaySeconds: 30
readinessProbe:
  httpGet: { path: /health/, port: 8000 }
  initialDelaySeconds: 10
```

## aims-core Differences

The `helm-aims-core` chart is nearly identical to `helm-template` but has:

- Different chart name prefix (`helm-aims-core` vs `helm-template`)
- Single `migrate` init container (vs three for tenants)
- Additional env vars: `GITHUB_TOKEN`, `GITHUB_REPO`, `RESEND_API_KEY`, `ADMIN_API_KEY`
- No admin path exclusion or dashboard redirect by default
- Ingress on `aimsgo.com` (not a subdomain)

See [AIMS-Core Application](../argocd/aims-core-application) for details.
