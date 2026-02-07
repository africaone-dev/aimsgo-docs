---
sidebar_position: 1
id: setup
title: ArgoCD Setup
---

# ArgoCD Setup

ArgoCD is installed via Terraform (`helm_release`) in the `argocd` namespace. Configuration lives in `terraform-hcloud-kube-hetzner/aimsgo/cluster-bootstrap/argocd.tf`.

## Access

```bash
# UI via ingress
open https://argocd.aimsgo.com

# Or port-forward
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d

# CLI login
argocd login argocd.aimsgo.com --username admin --insecure
```

## How It Works

```
aimsgo-argocd-apps repo
├── root-app.yaml        → bootstraps everything
├── apps/                → App of Apps chart
│   └── templates/
│       ├── applicationset.yaml  → auto-discovers tenants
│       └── aims-core.yaml       → standalone app
├── helm-aims-core/      → chart for aimsgo.com
└── helm-template/       → chart for tenant apps
    └── tenants/
        ├── _TEMPLATE_/
        └── tenant1/
```

- **ApplicationSet** watches `helm-template/tenants/*` directories (excluding `_TEMPLATE_`)
- Each directory = one ArgoCD Application = one tenant namespace
- **aims-core** is a standalone Application (not managed by ApplicationSet)
- Sync policy: automated prune + selfHeal + CreateNamespace

## Tenant Lifecycle

Tenants are managed via GitHub Actions workflow — see [Tenant Management](../tenants/tenant-management).

**Do not** create tenant directories manually. The workflow handles values generation, Django secret creation, and cleanup.

## Common Operations

```bash
# List all apps
argocd app list

# Check app status
argocd app get tenant1

# Force sync
argocd app sync tenant1

# Force refresh (re-read git)
argocd app get tenant1 --refresh

# View sync history
argocd app history tenant1

# Rollback
argocd app rollback tenant1 <revision-id>
```

## Upgrading ArgoCD

Update the `version` in `argocd.tf` and apply:

```bash
cd terraform-hcloud-kube-hetzner/aimsgo
terraform apply -target=module.cluster-bootstrap.helm_release.argocd
```

## Troubleshooting

### App not syncing

```bash
kubectl get applicationset -n argocd
kubectl describe applicationset aimsgo-tenants -n argocd
argocd app get <app-name> --refresh
```

### Repository connection issues

```bash
argocd repo list
kubectl get secret aimsgo-argocd-apps -n argocd
```

### Helm template errors

```bash
helm template test ./helm-template \
  -f helm-template/tenants/tenant1/values.yaml

argocd app diff tenant1
```

### Pod issues

```bash
kubectl describe pod <pod> -n <namespace>
kubectl logs <pod> -n <namespace> --previous
```

## References

- [ArgoCD Docs](https://argo-cd.readthedocs.io/)
- [ApplicationSet Docs](https://argo-cd.readthedocs.io/en/stable/user-guide/application-set/)
