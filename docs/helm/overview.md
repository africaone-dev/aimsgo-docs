---
sidebar_position: 1
id: overview
title: Helm Template Overview
---

# Helm Template for AIMSGO Applications

This Helm chart provides a flexible template for deploying both single-container and multi-container applications in the AIMSGO ecosystem.

## Features

- ✅ **Single-container deployments** (e.g., aimsgo)
- ✅ **Multi-container deployments** (e.g., aims with frontend + backend)
- ✅ **Flexible ingress routing** with path-based routing
- ✅ **Traefik middleware support** (admin path exclusion, redirects)
- ✅ **Horizontal Pod Autoscaling** (optional)
- ✅ **Custom resource limits and requests**
- ✅ **Health checks** (liveness and readiness probes)

## Quick Start

Applications are deployed using **GitOps** with ArgoCD. ArgoCD itself is managed via Terraform using `helm_release`.

### Prerequisites

1. Terraform-managed Kubernetes cluster with ArgoCD installed
2. Access to the ArgoCD UI or CLI
3. Git repository with application manifests

### Deploy Single-Container Application (aimsgo)

Create a tenant values file and commit to git:

```bash
# Create tenant directory
mkdir -p helm-template/tenants/my-tenant

# Create values.yaml
cat > helm-template/tenants/my-tenant/values.yaml <<EOF
deploymentMode: "single"
image:
  repository: ghcr.io/africaone-dev/aimsgo
  tag: "latest"
ingress:
  enabled: true
  hosts:
    - host: my-tenant.aimsgo.com
      paths:
        - path: /
          pathType: Prefix
EOF

# Commit and push
git add helm-template/tenants/my-tenant/
git commit -m "Add my-tenant configuration"
git push
```

The ApplicationSet will automatically create an ArgoCD Application for your tenant.

### Deploy Multi-Container Application (aims)

```bash
# Use the existing aims-example as a template
cp -r helm-template/tenants/aims-example helm-template/tenants/my-aims-tenant

# Edit the values
vim helm-template/tenants/my-aims-tenant/values.yaml

# Commit and push
git add helm-template/tenants/my-aims-tenant/
git commit -m "Add aims tenant"
git push
```

## Deployment Modes

### Single Mode (Default)

Deploys a single container application.

**Use Cases:**
- aims (Next.js + Django)
- aims-core (Next.js + Django)
- Applications with separate frontend/backend codebases

**Resources Created:**
- 1 Deployment
- 1 Service
- 1 Ingress (optional)

### Multi Mode

Deploys separate frontend and backend containers with individual services.

**Use Cases:**
- aims (Next.js frontend + Django backend)
- aims-core (Next.js frontend + Django backend)
- Applications with separate frontend/backend codebases

**Resources Created:**
- 2 Deployments (frontend, backend)
- 2 Services (frontend, backend)
- 1 Ingress with path-based routing

**📖 See [MULTI_CONTAINER_SETUP.md](./MULTI_CONTAINER_SETUP.md) for detailed documentation.**

## Configuration

### Basic Configuration

```yaml
# Deployment mode: "single" or "multi"
deploymentMode: "single"

# Replica count
replicaCount: 1

# Image configuration
image:
  repository: ghcr.io/africaone-dev/aimsgo
  pullPolicy: IfNotPresent
  tag: "latest"

# Service configuration
service:
  type: ClusterIP
  port: 80

# Ingress configuration
ingress:
  enabled: true
  className: "traefik"
  hosts:
    - host: example.aimsgo.com
      paths:
        - path: /
          pathType: Prefix
```

### Multi-Container Configuration

```yaml
deploymentMode: "multi"

frontend:
  enabled: true
  image:
    repository: ghcr.io/africaone-dev/aims-frontend
    tag: "latest"
  port: 3000
  
backend:
  enabled: true
  image:
    repository: ghcr.io/africaone-dev/aims-backend
    tag: "latest"
  port: 8000
```

## Tenants

Example tenant configurations are available in the `tenants/` directory:

- **aims-example/**: Multi-container deployment with aims frontend + backend
- **aims-core/**: Multi-container deployment with aims-core frontend + backend
- **example-school/**: Single-container deployment with aimsgo
- **root/**: Root tenant configuration
- **t25/**, **test/**, **test-2/**, **test-5/**: Additional tenant examples

## Ingress Routing

### Single-Container

All traffic routes to the single service:

```yaml
ingress:
  hosts:
    - host: example.aimsgo.com
      paths:
        - path: /
          pathType: Prefix
```

### Multi-Container with Path Routing

Route different paths to different services:

```yaml
ingress:
  hosts:
    - host: aims.aimsgo.com
      paths:
        - path: /api
          pathType: Prefix
          backend:
            service:
              name: backend
              port: 8000
        - path: /
          pathType: Prefix
          backend:
            service:
              name: frontend
              port: 3000
```

## CI/CD Integration

CI workflows automatically build and push images to GitHub Container Registry:

### AIMS Project
- Frontend: `ghcr.io/africaone-dev/aims-frontend`
- Backend: `ghcr.io/africaone-dev/aims-backend`

### AIMS-Core Project
- Frontend: `ghcr.io/africaone-dev/aims-core-frontend`
- Backend: `ghcr.io/africaone-dev/aims-core-backend`

### AIMSGO Project
- App: `ghcr.io/africaone-dev/aimsgo`

## ArgoCD Integration

### Infrastructure Setup

ArgoCD is deployed via Terraform using `helm_release`:

```hcl
# terraform-hcloud-kube-hetzner/aimsgo/cluster-bootstrap/argocd.tf
resource "helm_release" "argocd" {
  name             = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  namespace        = "argocd"
  create_namespace = true
  version          = "5.x.x"
  
  values = [
    file("${path.module}/helm-values/argocd.yaml")
  ]
}
```

### ApplicationSet for Multi-Tenant Deployments

The ApplicationSet automatically discovers and deploys all tenants from the git repository:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: aimsgo-tenants
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/africaone-dev/aimsgo-argocd-apps
        revision: HEAD
        directories:
          - path: helm-template/tenants/*
  template:
    metadata:
      name: '{{path.basename}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/africaone-dev/aimsgo-argocd-apps
        targetRevision: HEAD
        path: helm-template
        helm:
          valueFiles:
            - 'tenants/{{path.basename}}/values.yaml'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{path.basename}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

### How It Works

1. **Terraform** provisions infrastructure and installs ArgoCD
2. **ApplicationSet** watches the git repository for new tenant directories
3. **GitOps**: When you push a new tenant configuration, ArgoCD automatically:
   - Detects the new directory
   - Creates an Application resource
   - Deploys the Helm chart with tenant-specific values
   - Continuously syncs changes from git

## Testing

### Test Locally with Helm Template

Before committing to git, test your configurations locally:

```bash
# Test single-container mode
cd aimsgo-argocd-apps
helm template test ./helm-template \
  --set deploymentMode=single \
  --set image.tag=latest

# Test multi-container mode
helm template test ./helm-template \
  -f helm-template/tenants/aims-example/values.yaml

# Validate syntax
helm lint ./helm-template
```

### Test in ArgoCD (Dry Run)

```bash
# Create application without syncing
argocd app create test-tenant \
  --repo https://github.com/africaone-dev/aimsgo-argocd-apps \
  --path helm-template \
  --helm-set-file values=helm-template/tenants/my-tenant/values.yaml \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace test-tenant \
  --sync-policy none

# Preview what will be deployed
argocd app diff test-tenant

# Cleanup
argocd app delete test-tenant
```

### Monitor Deployment via ArgoCD

```bash
# Watch application sync status
argocd app get my-tenant --watch

# Check sync history
argocd app history my-tenant

# View application logs
argocd app logs my-tenant --follow
```

## Upgrading Tenants

### Via GitOps (Recommended)

Simply update the tenant values file and push to git:

```bash
# Edit tenant configuration
vim helm-template/tenants/my-tenant/values.yaml

# Update image tag
sed -i 's/tag: "1.0.0"/tag: "1.1.0"/' helm-template/tenants/my-tenant/values.yaml

# Commit and push
git add helm-template/tenants/my-tenant/values.yaml
git commit -m "Update my-tenant to version 1.1.0"
git push
```

ArgoCD will automatically detect the change and sync the application.

### Manual Sync via ArgoCD

```bash
# Trigger immediate sync
argocd app sync my-tenant

# Sync specific resource
argocd app sync my-tenant --resource deployment:my-tenant-frontend

# Hard refresh (bypass cache)
argocd app sync my-tenant --force
```

### Rollback

```bash
# List deployment history
argocd app history my-tenant

# Rollback to specific revision
argocd app rollback my-tenant <revision-id>

# Or via git revert
git revert <commit-hash>
git push
```

## Documentation

- [Multi-Container Setup Guide](./MULTI_CONTAINER_SETUP.md)
- [CI/CD Workflows](../ci-cd/CI_WORKFLOWS.md)
- [ArgoCD Setup](../argocd/ARGOCD_SETUP.md)

## Support

For issues or questions:
1. Check the [Multi-Container Setup Guide](./MULTI_CONTAINER_SETUP.md)
2. Review tenant examples in `aimsgo-argocd-apps/helm-template/tenants/` directory
3. Contact the DevOps team

## License

Copyright © 2024-2026 AfricaOne
