---
sidebar_position: 1
slug: /intro
---

# Welcome to AIMSGO Platform

Welcome to the AIMSGO platform documentation. This repository contains comprehensive documentation for deploying, configuring, and managing AIMSGO applications.

## Overview

AIMSGO is a **multi-tenant education management platform** that supports both single-container and multi-container deployment architectures.

## Projects

- **aimsgo**: Single-page React application
- **aims**: Multi-container application (Next.js frontend + Django backend)
- **aims-core**: Core multi-container application (Next.js frontend + Django backend)

## Architecture

### Infrastructure Layer (Terraform)

```
Terraform
├── Kubernetes Cluster (Hetzner Cloud)
├── ArgoCD (helm_release)
├── Ingress Controller (Traefik)
├── Cert Manager (Let's Encrypt)
└── Other Infrastructure Components
```

### Application Layer (GitOps)

```
Git Repository (aimsgo-argocd-apps)
├── ApplicationSet (watches for new tenants)
├── Helm Template (shared across tenants)
└── Tenants
    ├── tenant-1/values.yaml
    ├── tenant-2/values.yaml
    ├── aims-core/values.yaml
    └── ...
```

### CI/CD Pipeline

```
Code Push → GitHub Actions → Build Image → Push to GHCR → Update Helm Chart → ArgoCD Sync → Deploy
```

## Container Images

All images are hosted on GitHub Container Registry (GHCR):

| Project | Component | Image |
|---------|-----------|-------|
| aims | Frontend | `ghcr.io/africaone-dev/aims-frontend` |
| aims | Backend | `ghcr.io/africaone-dev/aims-backend` |
| aims-core | Frontend | `ghcr.io/africaone-dev/aims-core-frontend` |
| aims-core | Backend | `ghcr.io/africaone-dev/aims-core-backend` |

## Quick Links

### For Developers
- [Quick Start Guide](./deployment/quick-start)
- [Multi-container deployment](./helm/multi-container-setup)
- [CI/CD Workflows](./ci-cd/workflows)

### For DevOps
- [Deploying a new tenant](./deployment/quick-start#add-new-tenant)
- [ArgoCD configuration](./argocd/setup)
- [Helm template customization](./helm/overview)

### For Platform Administrators
- [Managing multi-tenant deployments](./argocd/setup)
- [Resource management and scaling](./helm/multi-container-setup#best-practices)
- [Troubleshooting guide](./helm/multi-container-setup#troubleshooting)

## Getting Started

Follow our [Quick Start Guide](./deployment/quick-start) to get started with deploying your first tenant.
