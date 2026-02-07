---
sidebar_position: 2
id: aims-core-application
title: AIMS-Core Application
---

# AIMS-Core Application

The core platform application serves `aimsgo.com` and handles:

- Marketing/landing pages
- User authentication (OTP via Resend)
- Tenant registration and lifecycle management
- Admin API for CI/CD integration

## Deployment

Deployed as a standalone ArgoCD Application (not via ApplicationSet):

```yaml
# aims-core.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: aims-core
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/africaone-dev/aimsgo-argocd-apps
    path: helm-aims-core
  destination:
    namespace: aims-core
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

## Helm Chart: `helm-aims-core`

Same template structure as `helm-template` but with aims-core-specific defaults.

### Key Differences from Tenant Chart

| Feature | aims-core | tenant (helm-template) |
|---|---|---|
| Domain | `aimsgo.com` | `{tenant}.aimsgo.com` |
| Images | `aims-core-frontend/backend` | `aims-frontend/backend` |
| Init containers | `migrate` (1) | `create-db`, `migrate-tenant`, `bootstrap-tenant` (3) |
| Admin path exclusion | disabled | enabled |
| Dashboard redirect | disabled | enabled |
| Extra env vars | GitHub Actions, Resend, Admin API | — |

### Backend Environment Variables

```yaml
backend:
  env:
    # Database (via PgBouncer)
    - name: DB_HOST
      value: "aimsgo-db-pgbouncer.database.svc.cluster.local"
    - name: DB_NAME
      value: "aimsgo_core"
    - name: DB_USER
      value: "aimsgo"
    - name: DB_PASSWORD
      valueFrom:
        secretKeyRef: { name: postgres-credentials, key: password }

    # Django
    - name: ALLOWED_HOSTS
      value: "aimsgo.com,*.aimsgo.com,localhost,..."
    - name: CSRF_TRUSTED_ORIGINS
      value: "https://aimsgo.com"
    - name: SECRET_KEY
      valueFrom:
        secretKeyRef: { name: aims-core-django-secret, key: secret-key }

    # GitHub Actions — trigger tenant workflows
    - name: GITHUB_TOKEN
      valueFrom:
        secretKeyRef: { name: github-actions-token, key: token }
    - name: GITHUB_REPO
      value: "africaone-dev/aimsgo-argocd-apps"
    - name: GITHUB_WORKFLOW
      value: "tenant-management.yml"

    # Resend — OTP email delivery
    - name: RESEND_API_KEY
      valueFrom:
        secretKeyRef: { name: resend-api-key, key: api-key }

    # Admin API — tenant cleanup from CI/CD
    - name: ADMIN_API_KEY
      valueFrom:
        secretKeyRef: { name: admin-api-key, key: api-key }
```

### Ingress

```yaml
ingress:
  enabled: true
  className: "traefik"
  hosts:
    - host: aimsgo.com
      paths:
        - path: /         → frontend (Next.js, port 3000)
        - path: /api      → backend (Django, port 8000)
        - path: /admin    → backend
  tls:
    - secretName: aimsgo-tls
      hosts: [aimsgo.com]
```

## Secrets

| Secret | Description |
|---|---|
| `postgres-credentials` | PG password (Reflector-replicated) |
| `ghcr-registry` | Image pull secret (Reflector-replicated) |
| `aims-core-django-secret` | Django SECRET_KEY |
| `github-actions-token` | PAT for triggering tenant-management workflow |
| `resend-api-key` | Resend API key for OTP emails |
| `admin-api-key` | Key for `/api/admin/delete-tenant/` endpoint |

## Admin API

The aims-core backend exposes an admin endpoint used by the tenant-management workflow:

```
POST /api/admin/delete-tenant/
Header: X-Admin-API-Key: <ADMIN_API_KEY>
Body: {"subdomain": "tenant-name"}
```

This drops the tenant database and removes school/roles/OTP records from the core database.

## CI/CD

Uses the same unified CI workflow as tenant apps:

```yaml
uses: africaone-dev/aimsgo-ci-templates/.github/workflows/docker-helm-multi-image.yaml@main
with:
  image_name: aims-core-backend
  frontend_image_name: aims-core-frontend
  helm_chart_path: helm-aims-core
```

The workflow bumps `appVersion` in `helm-aims-core/Chart.yaml`, ArgoCD detects the change and syncs.
