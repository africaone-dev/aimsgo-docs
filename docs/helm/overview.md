---
sidebar_position: 1
id: overview
title: Helm Charts Overview
---

# Helm Charts

The platform uses two Helm charts in the [`aimsgo-argocd-apps`](https://github.com/africaone-dev/aimsgo-argocd-apps) repository:

| Chart | Purpose | Deployed as |
|---|---|---|
| `helm-aims-core` | Core platform (marketing site, auth, admin API) | Single ArgoCD Application → `aims-core` namespace |
| `helm-template` | Tenant app (school dashboard) | ApplicationSet → one Application per tenant |

Both charts share the same template structure (frontend + backend deployments, services, ingress, middleware).

## Repository Structure

```
aimsgo-argocd-apps/
├── root-app.yaml                    # ArgoCD bootstrap entry point
├── aims-core.yaml                   # ArgoCD Application for aims-core
├── apps/                            # App of Apps Helm chart
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/
│       ├── applicationset.yaml      # Auto-discovers tenants
│       └── aims-core.yaml
├── helm-aims-core/                  # Core platform chart
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/
│       ├── deployment-multi.yaml
│       ├── service-multi.yaml
│       ├── ingress.yaml
│       ├── secrets.yaml
│       ├── serviceaccount.yaml
│       ├── hpa.yaml
│       └── middleware/
│           ├── admin-path-exclusion.yaml
│           └── redirect-dashboard.yaml
├── helm-template/                   # Tenant chart (shared template)
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/                   # Same structure as helm-aims-core
│   └── tenants/
│       ├── _TEMPLATE_/values.yaml   # Template for new tenants
│       └── tenant1/values.yaml      # Active tenant
└── .github/workflows/
    └── tenant-management.yml        # Create/delete tenants
```

## Resources Created per Tenant

Each tenant deployment creates:

- **2 Deployments**: `{name}-frontend` + `{name}-backend`
- **2 Services**: frontend (port 3000) + backend (port 8000)
- **1 Ingress**: path-based routing (`/api`, `/admin` → backend, `/` → frontend)
- **1 ServiceAccount**
- **Middleware** (optional): admin path exclusion, dashboard redirect
- **Secrets**: Django secret key, postgres credentials reference

## Tenant Values Configuration

Each tenant has a `values.yaml` that overrides chart defaults. See `_TEMPLATE_/values.yaml` for the full template.

Key settings:

```yaml
frontend:
  enabled: true
  image:
    repository: ghcr.io/africaone-dev/aims-frontend
    tag: ""                              # Set by CI workflow (appVersion)
  port: 3000
  env:
    - name: NEXT_PUBLIC_API_BASE_URL
      value: "http://TENANT-helm-template-backend:8000"

backend:
  enabled: true
  image:
    repository: ghcr.io/africaone-dev/aims-backend
    tag: ""
  port: 8000
  env:
    - name: DB_HOST
      value: "aimsgo-db-pgbouncer.database.svc.cluster.local"
    - name: TENANT_DB_NAME
      value: "tenant_TENANT"
    - name: TENANT_SUBDOMAIN
      value: "TENANT"

ingress:
  enabled: true
  className: "traefik"
  hosts:
    - host: "TENANT.aimsgo.com"
      paths:
        - path: /api
          pathType: Prefix
          backend: { service: { name: backend, port: 8000 } }
        - path: /
          pathType: Prefix
          backend: { service: { name: frontend, port: 3000 } }
  tls:
    - hosts: ["TENANT.aimsgo.com"]
      secretName: "TENANT-tls"

secrets:
  postgresCredentials:
    create: false                       # Replicated by Reflector
  djangoSecret:
    create: true
    key: "generated-by-workflow"
```

## Image Pull Secrets

GHCR credentials are managed by [Reflector](https://github.com/emberstack/kubernetes-reflector). A single `ghcr-registry` secret in the `default` namespace is automatically replicated to all tenant namespaces.

```yaml
imagePullSecrets:
  - name: ghcr-registry
```

## ApplicationSet (Tenant Auto-Discovery)

The ApplicationSet watches `helm-template/tenants/*` for directories (excluding `_TEMPLATE_`) and creates an ArgoCD Application for each:

```yaml
spec:
  generators:
    - git:
        repoURL: https://github.com/africaone-dev/aimsgo-argocd-apps
        revision: HEAD
        directories:
          - path: helm-template/tenants/*
          - path: helm-template/tenants/_TEMPLATE_
            exclude: true
  template:
    spec:
      source:
        path: helm-template
        helm:
          valueFiles:
            - 'tenants/{{path.basename}}/values.yaml'
      destination:
        namespace: '{{path.basename}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

## Testing

```bash
# Lint chart
helm lint ./helm-template

# Render templates with tenant values
helm template test ./helm-template \
  -f helm-template/tenants/tenant1/values.yaml

# Lint aims-core
helm lint ./helm-aims-core
```
