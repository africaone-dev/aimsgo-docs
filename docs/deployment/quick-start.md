---
sidebar_position: 1
id: quick-start
title: Quick Start Guide
---

# Quick Start Guide

## Create a New Tenant

The easiest way to add a school:

1. Go to **GitHub Actions** → `aimsgo-argocd-apps` → **Tenant Management**
2. Select `create-tenant`, enter name (e.g. `school1`)
3. Wait ~3 minutes — the tenant is live at `https://school1.aimsgo.com`

See [Tenant Management](../tenants/tenant-management) for details.

## Architecture

```
Code Push → GitHub Actions → GHCR → Helm Chart update → ArgoCD → Kubernetes
```

### Infrastructure (Terraform)

- K3s cluster on Hetzner Cloud
- ArgoCD, Traefik, cert-manager, Crunchy PGO, Reflector

### Applications (GitOps)

```
aimsgo-argocd-apps/
├── apps/                          # App of Apps (ApplicationSet + aims-core)
├── helm-aims-core/                # Core platform chart → aimsgo.com
└── helm-template/                 # Tenant chart
    └── tenants/
        ├── _TEMPLATE_/            # Template for new tenants
        └── tenant1/values.yaml    # Active tenant → tenant1.aimsgo.com
```

## Common Tasks

### Deploy Code Changes

Just push to `main` — CI builds images and ArgoCD deploys automatically:

```bash
cd aims
git add .
git commit -m "Fix: Update API endpoint"
git push origin main
```

### Check Deployment Status

```bash
# ArgoCD
argocd app list
argocd app get tenant1

# Kubernetes
kubectl get pods -n tenant1
kubectl logs -n tenant1 -l app.kubernetes.io/component=backend -f
```

### Scale a Tenant

Edit `helm-template/tenants/tenant1/values.yaml`:

```yaml
replicaCount: 3
```

Commit and push — ArgoCD applies the change.

### Delete a Tenant

Use **GitHub Actions** → **Tenant Management** → `delete-tenant`.

This cleans up the database, removes the directory, and ArgoCD prunes all resources.

### Rollback

```bash
# Via git
git revert <commit-hash>
git push

# Or via ArgoCD
argocd app history tenant1
argocd app rollback tenant1 <revision-id>
```

## Troubleshooting

### Pod Not Starting

```bash
kubectl describe pod <pod-name> -n tenant1
kubectl logs <pod-name> -n tenant1 --previous
```

### Image Pull Errors

```bash
# Verify GHCR secret exists (managed by Reflector)
kubectl get secret ghcr-registry -n tenant1

# Test image pull
docker pull ghcr.io/africaone-dev/aims-backend:latest
```

### ArgoCD Sync Issues

```bash
argocd app get tenant1 --refresh
argocd app sync tenant1
```

## Key Concepts

- **GitOps**: all state in Git, ArgoCD syncs cluster to match
- **Multi-tenancy**: each school = namespace + database + domain
- **Unified CI**: one reusable workflow for all repos
- **Reflector**: auto-replicates secrets across namespaces

## Resources

- [Helm Charts](../helm/overview)
- [CI/CD Workflows](../ci-cd/workflows)
- [ArgoCD Setup](../argocd/setup)
- [Tenant Management](../tenants/tenant-management)
- [AIMS-Core Application](../argocd/aims-core-application)
