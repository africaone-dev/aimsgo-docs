---
sidebar_position: 1
id: workflows
title: CI/CD Workflows
---

# CI/CD Workflows

## Overview

The platform uses a **unified reusable CI workflow** from [`aimsgo-ci-templates`](https://github.com/africaone-dev/aimsgo-ci-templates). Both `aims` and `aims-core` repos call the same workflow.

```
Code Push → GitHub Actions → Build & Push to GHCR → Bump appVersion in Chart.yaml → ArgoCD Sync → Deploy
```

## Unified CI Workflow

Single reusable workflow: `docker-helm-multi-image.yaml`

### What it does

1. **Reads** current `appVersion` from Helm `Chart.yaml` (via GitHub API)
2. **Bumps** patch version (e.g. `1.1.46` → `1.1.47`)
3. **Builds & pushes** Docker image(s) to GHCR
4. **Updates** `appVersion` in Helm chart → ArgoCD auto-deploys
5. **Cleans up** old images (keeps last 10 by default)

### Usage in Application Repos

```yaml
# .github/workflows/build-and-deploy.yml
name: "CI/CD: Build and Deploy"
on:
  push:
    branches: [main]
    paths: ['frontend/**', 'backend/**']
permissions:
  contents: read
  packages: write

jobs:
  build:
    uses: africaone-dev/aimsgo-ci-templates/.github/workflows/docker-helm-multi-image.yaml@main
    with:
      image_name: aims-backend
      frontend_image_name: aims-frontend        # omit to skip frontend build
      helm_chart_path: helm-template
      dockerfile_path: backend/Dockerfile
      context_path: backend
      frontend_dockerfile_path: frontend/Dockerfile
      frontend_context_path: frontend
    secrets:
      GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      AIMSGO_ARGOCD_APPS_TOKEN: ${{ secrets.AIMSGO_ARGOCD_APPS_TOKEN }}
```

For **aims-core**, use `helm_chart_path: helm-aims-core` and the corresponding image names (`aims-core-backend`, `aims-core-frontend`).

### Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `image_name` | ✅ | — | Backend Docker image name |
| `frontend_image_name` | ❌ | `''` | Frontend image name (omit to skip frontend build) |
| `helm_chart_path` | ✅ | — | Path to Helm chart in `aimsgo-argocd-apps` |
| `dockerfile_path` | ❌ | `Dockerfile` | Backend Dockerfile path |
| `context_path` | ❌ | `.` | Backend build context |
| `frontend_dockerfile_path` | ❌ | `frontend/Dockerfile` | Frontend Dockerfile |
| `frontend_context_path` | ❌ | `frontend` | Frontend build context |
| `current_version` | ❌ | `''` | Override version (skips Chart.yaml lookup) |
| `retention_keep` | ❌ | `10` | Keep N latest images per package (0 = no cleanup) |

### Required Secrets

| Secret | Source | Description |
|---|---|---|
| `GH_TOKEN` | `${{ secrets.GITHUB_TOKEN }}` | GHCR write access (auto-provided) |
| `AIMSGO_ARGOCD_APPS_TOKEN` | PAT | Write access to `aimsgo-argocd-apps` repo |

## Container Images

| Project | Component | Image |
|---|---|---|
| aims | Frontend | `ghcr.io/africaone-dev/aims-frontend` |
| aims | Backend | `ghcr.io/africaone-dev/aims-backend` |
| aims-core | Frontend | `ghcr.io/africaone-dev/aims-core-frontend` |
| aims-core | Backend | `ghcr.io/africaone-dev/aims-core-backend` |

## Image Retention

The workflow automatically cleans up old container images from GHCR. Default: **keep last 10 versions** per package. Set `retention_keep: 0` to disable cleanup.

## Version Strategy

- Versions are stored in Helm `Chart.yaml` (`appVersion` field)
- Each CI run bumps the patch version automatically
- Image tags match the `appVersion` (e.g. `1.1.47`)
- ArgoCD detects the `Chart.yaml` change and syncs

## Tenant Management Workflow

Tenant lifecycle is managed by a separate workflow in `aimsgo-argocd-apps`:

- **Create tenant**: generates `values.yaml` from template, creates Django secret, commits
- **Delete tenant**: calls aims-core cleanup API (drops DB, removes records), deletes directory

See [Tenant Management](../tenants/tenant-management) for details.

## Troubleshooting

```bash
# Check workflow runs
gh run list --repo africaone-dev/aims --workflow=build-and-deploy.yml

# View failed run logs
gh run view <run-id> --log-failed

# Re-run failed workflow
gh run rerun <run-id>

# Check image in GHCR
docker pull ghcr.io/africaone-dev/aims-backend:1.1.47
```
