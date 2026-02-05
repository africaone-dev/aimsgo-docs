---
sidebar_position: 1
id: quick-start
title: Quick Start Guide
---

# AIMSGO Platform - Quick Start Guide

This guide helps you quickly get started with deploying and managing AIMSGO applications.

## Documentation Overview

The documentation is organized into the following sections:

- **[helm/](./helm/)**: Helm chart templates and configuration
- **[ci-cd/](./ci-cd/)**: CI/CD workflows and automation
- **[argocd/](./argocd/)**: ArgoCD setup and application management
- **[deployment/](./deployment/)**: Deployment guides and procedures

## Quick Start for Developers

### 1. Deploy a New Tenant

```bash
# Clone the repository
git clone https://github.com/africaone-dev/aimsgo-argocd-apps.git
cd aimsgo-argocd-apps

# Create tenant directory
mkdir -p helm-template/tenants/my-school

# Create configuration for multi-container deployment
cat > helm-template/tenants/my-school/values.yaml <<EOF
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
ingress:
  enabled: true
  hosts:
    - host: my-school.aimsgo.com
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
EOF

# Commit and push
git add helm-template/tenants/my-school/
git commit -m "Add my-school tenant"
git push
```

**Result**: ArgoCD automatically detects and deploys your application within ~3 minutes.

### 2. Update an Application

```bash
# Edit tenant configuration
vim helm-template/tenants/my-school/values.yaml

# Update image tag or other settings
# image.tag: "v1.2.3"

# Commit and push
git add helm-template/tenants/my-school/values.yaml
git commit -m "Update my-school to v1.2.3"
git push
```

**Result**: ArgoCD automatically syncs the changes.

### 3. Monitor Deployment

```bash
# Check application status
argocd app get my-school

# Watch deployment
kubectl get pods -n my-school --watch

# View logs
kubectl logs -l app.kubernetes.io/instance=my-school -n my-school --tail=100 -f
```

## Quick Start for DevOps

### 1. Setup Infrastructure

```bash
cd terraform-hcloud-kube-hetzner/aimsgo

# Initialize Terraform
terraform init

# Review plan
terraform plan

# Deploy infrastructure and ArgoCD
terraform apply
```

**What this does**:
- Provisions Kubernetes cluster
- Installs ArgoCD via `helm_release`
- Configures ApplicationSet for multi-tenant deployments
- Sets up ingress and TLS

### 2. Access ArgoCD

```bash
# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d

# Port forward
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Login
argocd login localhost:8080 --username admin --insecure

# Or access via ingress
open https://argocd.aimsgo.com
```

### 3. Deploy Applications

Applications are deployed automatically via GitOps:

1. **Create tenant configuration** in `aimsgo-argocd-apps` repository
2. **Commit and push** to git
3. **ApplicationSet** detects new tenant
4. **ArgoCD** creates Application and deploys
5. **Monitor** via ArgoCD UI or CLI

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

## Deployment Modes


### Multi-Container (aims, aims-core)

**Use Case**: Applications with separate frontend and backend

```yaml
deploymentMode: "multi"
frontend:
  enabled: true
  image:
    repository: ghcr.io/africaone-dev/aims-frontend
backend:
  enabled: true
  image:
    repository: ghcr.io/africaone-dev/aims-backend
```

**Resources Created**:
- 2 Deployments (frontend, backend)
- 2 Services (frontend, backend)
- 1 Ingress (path-based routing)

## Common Tasks

### Add New Tenant

```bash
cd aimsgo-argocd-apps
mkdir -p helm-template/tenants/new-tenant
cp helm-template/tenants/example-school/values.yaml helm-template/tenants/new-tenant/
vim helm-template/tenants/new-tenant/values.yaml
git add helm-template/tenants/new-tenant/
git commit -m "Add new tenant"
git push
```

### Update Image Version

```bash
vim helm-template/tenants/my-tenant/values.yaml
# Change: tag: "v1.2.3"
git commit -am "Update my-tenant to v1.2.3"
git push
```

### Scale Application

```bash
vim helm-template/tenants/my-tenant/values.yaml
# Change: replicaCount: 3
git commit -am "Scale my-tenant to 3 replicas"
git push
```

### Rollback Deployment

```bash
# Via git revert
git log --oneline
git revert <commit-hash>
git push

# Or via ArgoCD
argocd app history my-tenant
argocd app rollback my-tenant <revision-id>
```

### Delete Tenant

```bash
cd aimsgo-argocd-apps
git rm -r helm-template/tenants/old-tenant/
git commit -m "Remove old tenant"
git push
# ArgoCD will automatically delete all resources
```

## Key Concepts

### GitOps

- **Git as Source of Truth**: All configuration in git
- **Declarative**: Describe desired state, not steps
- **Automated**: Changes applied automatically
- **Auditable**: Full history in git

### Infrastructure as Code (Terraform)

- **Reproducible**: Can recreate entire infrastructure
- **Version Controlled**: Infrastructure changes tracked in git
- **Declarative**: Describe infrastructure, Terraform figures out how

### Multi-Tenancy

- **Isolated Namespaces**: Each tenant in own namespace
- **Shared Infrastructure**: Common cluster resources
- **Independent Configuration**: Tenant-specific settings
- **Automated Discovery**: ApplicationSet finds tenants automatically

## Troubleshooting

### Application Not Deploying

```bash
# Check ApplicationSet
kubectl get applicationset aimsgo-tenants -n argocd

# Check if Application created
kubectl get application -n argocd | grep my-tenant

# Force refresh
argocd app get my-tenant --refresh
argocd app sync my-tenant
```

### Pod Crashes

```bash
# Check pod status
kubectl get pods -n my-tenant

# View logs
kubectl logs <pod-name> -n my-tenant

# Describe pod
kubectl describe pod <pod-name> -n my-tenant
```

### Image Pull Errors

```bash
# Check if image exists
docker pull ghcr.io/africaone-dev/aimsgo:latest

# Verify image pull secret
kubectl get secret ghcr-registry -n my-tenant

# Check pod events
kubectl describe pod <pod-name> -n my-tenant
```

## Best Practices

1. **Never make manual changes in cluster** - Always use git
2. **Test in dev/staging first** - Before pushing to production
3. **Use specific version tags** - Not `latest` in production
4. **Set resource limits** - Prevent resource exhaustion
5. **Monitor applications** - Use ArgoCD notifications
6. **Regular backups** - Backup ArgoCD configuration
7. **Security scanning** - Scan images for vulnerabilities
8. **Document changes** - Good commit messages

## Resources

### Documentation

- [Helm Template Guide](./helm/README.md)
- [Multi-Container Setup](./helm/MULTI_CONTAINER_SETUP.md)
- [CI/CD Workflows](./ci-cd/CI_WORKFLOWS.md)
- [ArgoCD Setup](./argocd/ARGOCD_SETUP.md)
- [AIMS-Core Deployment](./argocd/AIMS_CORE_APPLICATION.md)

### External References

- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [Helm Documentation](https://helm.sh/docs/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Terraform Documentation](https://www.terraform.io/docs/)

### Support

- DevOps Team: devops@aimsgo.com
- Documentation Issues: Open issue in aimsgo-docs repository
- Application Issues: Open issue in respective application repository

---

**Last Updated**: February 5, 2026
