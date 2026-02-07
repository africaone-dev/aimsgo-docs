# Tenant Management

Tenants are created and deleted via a GitHub Actions workflow in `aimsgo-argocd-apps`.

## Create Tenant

1. Go to **Actions** → **Tenant Management** in the `aimsgo-argocd-apps` repo
2. Select `create-tenant`, enter tenant name (e.g. `school1`)
3. The workflow:
   - Validates the name (DNS-safe: lowercase, numbers, hyphens, 1–63 chars)
   - Creates `helm-template/tenants/school1/values.yaml` from template
   - Generates a random Django `SECRET_KEY`
   - Replaces placeholders (`__TENANT_NAME__`, `__BASE_DOMAIN__`, `__DJANGO_SECRET__`)
   - Commits and pushes
4. ArgoCD detects the new directory and deploys the tenant

**Result**: `https://school1.aimsgo.com` is live within ~3 minutes.

## Delete Tenant

1. Go to **Actions** → **Tenant Management**, select `delete-tenant`, enter tenant name
2. The workflow:
   - Calls the aims-core cleanup API: `POST /api/admin/delete-tenant/`
     - Drops the tenant database (`tenant_school1`)
     - Removes school, roles, and OTP records from `aimsgo_core`
   - Deletes `helm-template/tenants/school1/` directory
   - Commits and pushes
3. ArgoCD prunes all Kubernetes resources (namespace, pods, ingress, etc.)

## What Each Tenant Gets

| Resource | Value |
|---|---|
| Namespace | `school1` |
| Domain | `school1.aimsgo.com` |
| Database | `tenant_school1` (PostgreSQL via PgBouncer) |
| TLS Certificate | Auto-issued by cert-manager (Let's Encrypt) |
| Pods | frontend (Next.js) + backend (Django) |
| Init containers | `create-db` → `migrate-tenant` → `bootstrap-tenant` |

## Database

Each tenant gets its own PostgreSQL database (not a schema). The backend init containers:

1. **create-db**: `CREATE DATABASE tenant_school1` (idempotent)
2. **migrate-tenant**: `python manage.py migrate` against the tenant DB
3. **bootstrap-tenant**: seeds roles, permissions, and default data

Connection goes through PgBouncer (`aimsgo-db-pgbouncer.database.svc.cluster.local:5432`). PostgreSQL is managed by [Crunchy PGO](https://www.crunchydata.com/products/crunchy-postgresql-for-kubernetes).

## Secrets

| Secret | Scope | How managed |
|---|---|---|
| `ghcr-registry` | All namespaces | Reflector auto-replication from `default` ns |
| `postgres-credentials` | All namespaces | Reflector auto-replication from `default` ns |
| `{tenant}-django-secret` | Tenant namespace | Created by Helm chart (`secrets.djangoSecret.create: true`) |

[Reflector](https://github.com/emberstack/kubernetes-reflector) replicates secrets from `default` namespace to all tenant namespaces automatically.

## Tenant Values Template

The workflow generates `values.yaml` with these key settings (see `_TEMPLATE_/values.yaml` for full reference):

```yaml
frontend:
  enabled: true
  image:
    repository: ghcr.io/africaone-dev/aims-frontend
    tag: ""                                    # Filled by CI (appVersion)
  port: 3000
  env:
    - name: NEXT_PUBLIC_API_BASE_URL
      value: "http://school1-helm-template-backend:8000"

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
      value: "tenant_school1"
    - name: TENANT_SUBDOMAIN
      value: "school1"
    - name: SECRET_KEY
      valueFrom:
        secretKeyRef:
          name: school1-django-secret
          key: secret-key

enableAdminPathExclusion: true
enableRedirectDashboard: true

ingress:
  enabled: true
  className: "traefik"
  hosts:
    - host: "school1.aimsgo.com"
      paths:
        - path: /api     → backend:8000
        - path: /admin   → backend:8000
        - path: /        → frontend:3000
  tls:
    - hosts: ["school1.aimsgo.com"]
      secretName: "school1-tls"
```

## Monitoring

```bash
# Check tenant ArgoCD app status
argocd app get school1

# Check pods
kubectl get pods -n school1

# View backend logs
kubectl logs -n school1 -l app.kubernetes.io/component=backend -f

# View frontend logs
kubectl logs -n school1 -l app.kubernetes.io/component=frontend -f

# Check ingress / TLS
kubectl get ingress -n school1
kubectl get certificate -n school1
```

## Cleanup API

The delete-tenant workflow calls the aims-core admin API:

```bash
curl -X POST https://aimsgo.com/api/admin/delete-tenant/ \
  -H "Content-Type: application/json" \
  -H "X-Admin-API-Key: $ADMIN_API_KEY" \
  -d '{"subdomain": "school1"}'
```

This endpoint (protected by `ADMIN_API_KEY` secret) drops the tenant database and removes all related records from the core database.
