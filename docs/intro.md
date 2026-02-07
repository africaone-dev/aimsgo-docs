---
sidebar_position: 1
slug: /intro
---

# AIMS Platform

Documentation for deploying, configuring, and managing the AIMS multi-tenant education platform.

## Overview

AIMS is a **multi-tenant school management platform** running on K3s (Hetzner Cloud). Each tenant (school) gets an isolated namespace with its own frontend, backend, and database.

## Projects

| Repository | Description | Stack |
|---|---|---|
| **aims** | Tenant application (school dashboard) | Next.js + Django |
| **aims-core** | Core platform (marketing site, auth, admin API) | Next.js + Django |

Supporting repositories:

- **aimsgo-argocd-apps** — Helm charts and tenant configurations (GitOps)
- **aimsgo-ci-templates** — Reusable CI/CD workflows
- **aimsgo-docs** — This documentation

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  Hetzner Cloud (Terraform)                           │
│  ┌─────────────────────────────────────────────────┐ │
│  │  K3s Cluster                                    │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │ │
│  │  │ ArgoCD   │  │ Traefik  │  │ Cert-Manager │  │ │
│  │  └──────────┘  └──────────┘  └──────────────┘  │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │ │
│  │  │ PGO      │  │Reflector │  │ Infisical    │  │ │
│  │  └──────────┘  └──────────┘  └──────────────┘  │ │
│  │                                                 │ │
│  │  ┌─────────────────────────────────────────┐    │ │
│  │  │  Tenant Namespaces                      │    │ │
│  │  │  tenant1/  aims-core/  ...              │    │ │
│  │  │  (frontend + backend pods each)         │    │ │
│  │  └─────────────────────────────────────────┘    │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

## GitOps Flow

```
Code Push → GitHub Actions → Build & Push to GHCR → Update Helm appVersion → ArgoCD Sync → Deploy
```

## Container Images

All images are hosted on GitHub Container Registry (GHCR):

| Project | Component | Image |
|---|---|---|
| aims | Frontend | `ghcr.io/africaone-dev/aims-frontend` |
| aims | Backend | `ghcr.io/africaone-dev/aims-backend` |
| aims-core | Frontend | `ghcr.io/africaone-dev/aims-core-frontend` |
| aims-core | Backend | `ghcr.io/africaone-dev/aims-core-backend` |

## Quick Links

- [Tenant Management](./tenants/tenant-management) — create and delete tenants
- [Helm Charts](./helm/overview) — chart structure and configuration
- [CI/CD Workflows](./ci-cd/workflows) — unified CI template
- [ArgoCD Setup](./argocd/setup) — GitOps configuration
