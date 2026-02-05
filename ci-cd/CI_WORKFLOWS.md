# CI/CD Workflows for AIMSGO Platform

This document describes the CI/CD workflows for building and deploying AIMSGO applications.

## Overview

The AIMSGO platform uses a GitOps approach with the following components:

1. **GitHub Actions**: Builds Docker images and pushes to GitHub Container Registry
2. **ArgoCD**: Monitors git repositories and deploys applications
3. **Terraform**: Manages infrastructure and ArgoCD installation

## Architecture

```
┌─────────────────┐
│  Code Change    │
│  (Git Push)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ GitHub Actions  │
│ - Build Image   │
│ - Push to GHCR  │
│ - Update Chart  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Git Repository │
│  (Helm Charts)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    ArgoCD       │
│ - Detect Change │
│ - Pull Chart    │
│ - Deploy to K8s │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Kubernetes     │
│  (Running Apps) │
└─────────────────┘
```

## CI Workflows

### AIMS Project

Location: `.github/workflows/` in aims repository

#### Backend Workflow (`build-backend.yml`)

```yaml
name: "CI: Build Backend Image & Update Helm Chart"

on:
  push:
    branches: [main, master]
    paths:
      - 'backend/**'
      - '.github/workflows/build-backend.yml'
  workflow_dispatch:
    inputs:
      current_version:
        description: 'Current version to bump'
        required: false
        type: string

permissions:
  contents: read
  packages: write

jobs:
  ci:
    name: Build Backend and Deploy
    uses: africaone-dev/aimsgo-ci-templates/.github/workflows/docker-helm-template.yaml@main
    with:
      image_name: aims-backend
      helm_chart_path: helm-template
      dockerfile_path: backend/Dockerfile
      context_path: backend
      current_version: ${{ github.event.inputs.current_version }}
    secrets:
      GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      AIMSGO_ARGOCD_APPS_TOKEN: ${{ secrets.AIMSGO_ARGOCD_APPS_TOKEN }}
```

**Triggers:**
- Push to `main`/`master` when backend files change
- Manual trigger via GitHub Actions UI

**Actions:**
1. Builds Docker image from `backend/Dockerfile`
2. Tags image as `ghcr.io/africaone-dev/aims-backend:latest` and versioned tag
3. Pushes to GitHub Container Registry
4. Updates Helm chart with new image tag
5. Commits changes to aimsgo-argocd-apps repository

#### Frontend Workflow (`build-frontend.yml`)

```yaml
name: "CI: Build Frontend Image & Update Helm Chart"

on:
  push:
    branches: [main, master]
    paths:
      - 'frontend/**'
      - '.github/workflows/build-frontend.yml'
  workflow_dispatch:

permissions:
  contents: read
  packages: write

jobs:
  ci:
    name: Build Frontend and Deploy
    uses: africaone-dev/aimsgo-ci-templates/.github/workflows/docker-helm-template.yaml@main
    with:
      image_name: aims-frontend
      helm_chart_path: helm-template
      dockerfile_path: frontend/Dockerfile
      context_path: frontend
    secrets:
      GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      AIMSGO_ARGOCD_APPS_TOKEN: ${{ secrets.AIMSGO_ARGOCD_APPS_TOKEN }}
```

### AIMS-Core Project

Similar workflows for `aims-core-backend` and `aims-core-frontend`.

### AIMSGO Project

Single workflow for the React SPA application.

## Container Images

All images are published to GitHub Container Registry:

| Project | Component | Image | Workflow File |
|---------|-----------|-------|---------------|
| aims | Frontend | `ghcr.io/africaone-dev/aims-frontend` | `build-frontend.yml` |
| aims | Backend | `ghcr.io/africaone-dev/aims-backend` | `build-backend.yml` |
| aims-core | Frontend | `ghcr.io/africaone-dev/aims-core-frontend` | `build-frontend.yml` |
| aims-core | Backend | `ghcr.io/africaone-dev/aims-core-backend` | `build-backend.yml` |
| aimsgo | App | `ghcr.io/africaone-dev/aimsgo` | `build-image.yml` |

## GitOps Workflow

### 1. Code Changes

Developer pushes code to application repository (aims, aims-core, aimsgo):

```bash
cd aims
git add backend/
git commit -m "Fix: Update API endpoint"
git push origin main
```

### 2. CI Build

GitHub Actions automatically:
1. Detects the change (backend files modified)
2. Triggers `build-backend.yml` workflow
3. Builds Docker image
4. Pushes to GHCR with tags:
   - `latest`
   - `v1.2.3` (semantic version)
   - `sha-abc123` (git commit SHA)

### 3. Helm Chart Update

The workflow updates the Helm chart repository:

```bash
# Clones aimsgo-argocd-apps
git clone https://github.com/africaone-dev/aimsgo-argocd-apps

# Updates image tag in affected tenant values
sed -i 's|aims-backend:.*|aims-backend:v1.2.3|' helm-template/tenants/*/values.yaml

# Commits and pushes
git commit -m "Update aims-backend to v1.2.3"
git push
```

### 4. ArgoCD Detection

ArgoCD continuously monitors the git repository:

```bash
# ArgoCD polls every 3 minutes (configurable)
# Detects the new commit in aimsgo-argocd-apps
# Compares desired state (git) vs actual state (cluster)
```

### 5. Automatic Deployment

ArgoCD syncs the application:

```bash
# Pulls updated Helm chart
# Renders templates with new values
# Applies changes to Kubernetes
# Monitors deployment status
```

### 6. Verification

```bash
# Check sync status
argocd app get my-tenant

# View deployment
kubectl get pods -n my-tenant

# Check image version
kubectl get deployment my-tenant-backend -n my-tenant -o jsonpath='{.spec.template.spec.containers[0].image}'
```

## Secrets Management

### Required Secrets

#### In Application Repositories (aims, aims-core, aimsgo)

- `GITHUB_TOKEN`: Automatically provided by GitHub Actions
- `AIMSGO_ARGOCD_APPS_TOKEN`: Personal Access Token with write access to aimsgo-argocd-apps

```bash
# Create PAT with repo scope
# Add to repository secrets
gh secret set AIMSGO_ARGOCD_APPS_TOKEN --body "ghp_..."
```

#### In Kubernetes

Managed via Terraform:

```hcl
# cluster-bootstrap/argocd.tf
resource "kubernetes_secret" "argocd_repo" {
  metadata {
    name      = "aimsgo-argocd-apps"
    namespace = "argocd"
    labels = {
      "argocd.argoproj.io/secret-type" = "repository"
    }
  }

  data = {
    type     = "git"
    url      = "https://github.com/africaone-dev/aimsgo-argocd-apps"
    username = "git"
    password = var.github_token
  }
}
```

## Deployment Strategies

### Rolling Update (Default)

```yaml
# In tenant values.yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 0
```

### Blue-Green Deployment

Handled by creating a new tenant and switching traffic:

```bash
# Deploy new version to blue tenant
cp -r tenants/prod tenants/prod-blue
vim tenants/prod-blue/values.yaml  # Update image tag

# Test blue deployment
curl https://prod-blue.aimsgo.com

# Switch DNS or update ingress
vim tenants/prod/values.yaml  # Update to new version

# Remove blue after verification
rm -rf tenants/prod-blue
```

### Canary Deployment

Use Argo Rollouts (optional):

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
spec:
  strategy:
    canary:
      steps:
        - setWeight: 20
        - pause: {duration: 5m}
        - setWeight: 50
        - pause: {duration: 5m}
        - setWeight: 80
        - pause: {duration: 5m}
```

## Monitoring and Notifications

### ArgoCD Notifications

Configure in Terraform:

```hcl
# argocd.tf
resource "helm_release" "argocd" {
  # ...existing code...
  
  set {
    name  = "notifications.enabled"
    value = "true"
  }
  
  set {
    name  = "notifications.slack.token"
    value = var.slack_token
  }
}
```

### Sync Hooks

Execute custom actions during sync:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
        - name: db-migrate
          image: aims-backend:latest
          command: ["python", "manage.py", "migrate"]
```

## Troubleshooting

### Build Failures

```bash
# Check workflow logs
gh run list --workflow=build-backend.yml
gh run view <run-id> --log

# Re-run failed workflow
gh run rerun <run-id>
```

### ArgoCD Sync Issues

```bash
# Check application status
argocd app get my-tenant

# View sync errors
argocd app sync my-tenant --dry-run

# Force sync
argocd app sync my-tenant --force

# Refresh app (re-pull from git)
argocd app get my-tenant --refresh
```

### Image Pull Errors

```bash
# Verify image exists
docker pull ghcr.io/africaone-dev/aims-backend:latest

# Check image pull secret
kubectl get secret ghcr-registry -n my-tenant -o yaml

# Test manually
kubectl run test --image=ghcr.io/africaone-dev/aims-backend:latest -n my-tenant
```

## Best Practices

1. **Semantic Versioning**: Use SemVer for image tags
2. **Immutable Tags**: Don't overwrite existing version tags
3. **Git as Source of Truth**: All changes via git commits
4. **Automated Rollbacks**: Configure ArgoCD auto-sync with pruning
5. **Progressive Delivery**: Test in staging before production
6. **Health Checks**: Ensure proper readiness/liveness probes
7. **Resource Limits**: Always set CPU/memory limits

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [Helm Documentation](https://helm.sh/docs/)
