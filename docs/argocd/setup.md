---
sidebar_position: 1
id: setup
title: ArgoCD Setup
---

# ArgoCD Setup and Management

This document describes how ArgoCD is installed and managed using Terraform for the AIMSGO platform.

## Overview

ArgoCD is deployed and managed entirely through Terraform using the `helm_release` resource. This ensures infrastructure-as-code practices and makes the setup reproducible.

## Architecture

```
┌─────────────────────────────────────┐
│        Terraform                    │
│  ┌──────────────────────────────┐  │
│  │  helm_release "argocd"       │  │
│  │  - Installs ArgoCD           │  │
│  │  - Configures settings       │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │  kubernetes_manifest         │  │
│  │  - ApplicationSet            │  │
│  │  - Repository credentials    │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│        Kubernetes Cluster           │
│  ┌──────────────────────────────┐  │
│  │  ArgoCD Namespace            │  │
│  │  - argocd-server             │  │
│  │  - argocd-repo-server        │  │
│  │  - argocd-application-       │  │
│  │    controller                │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │  Tenant Namespaces           │  │
│  │  - tenant-1                  │  │
│  │  - tenant-2                  │  │
│  │  - aims-core                 │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Terraform Configuration

### Directory Structure

```
terraform-hcloud-kube-hetzner/aimsgo/
├── kube.tf                          # Main cluster configuration
├── terraform.tfvars                 # Variable values
└── cluster-bootstrap/
    ├── argocd.tf                    # ArgoCD installation
    ├── supabase.tf                  # Supabase installation
    ├── helm-values/
    │   ├── argocd.yaml             # ArgoCD Helm values
    │   └── supabase.yaml           # Supabase Helm values
    └── manifests/
        └── applicationset.yaml      # Tenant ApplicationSet
```

### ArgoCD Installation

File: `cluster-bootstrap/argocd.tf`

```hcl
resource "helm_release" "argocd" {
  name             = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  namespace        = "argocd"
  create_namespace = true
  version          = "5.51.6"  # Pin to specific version

  values = [
    file("${path.module}/helm-values/argocd.yaml")
  ]

  # Ensure cluster is ready before installing
  depends_on = [
    kubernetes_namespace.argocd
  ]
}

# Create ArgoCD namespace
resource "kubernetes_namespace" "argocd" {
  metadata {
    name = "argocd"
    labels = {
      "app.kubernetes.io/name"       = "argocd"
      "app.kubernetes.io/managed-by" = "terraform"
    }
  }
}

# Repository credentials
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

  depends_on = [helm_release.argocd]
}

# ApplicationSet for multi-tenant deployments
resource "kubernetes_manifest" "applicationset" {
  manifest = yamldecode(file("${path.module}/manifests/applicationset.yaml"))
  
  depends_on = [helm_release.argocd]
}
```

### ArgoCD Helm Values

File: `cluster-bootstrap/helm-values/argocd.yaml`

```yaml
global:
  domain: argocd.aimsgo.com

configs:
  params:
    server.insecure: true  # TLS terminated at ingress
    
  cm:
    # Repository polling interval
    timeout.reconciliation: 180s
    
    # Application sync settings
    application.instanceLabelKey: argocd.argoproj.io/instance
    
    # Resource tracking
    application.resourceTrackingMethod: annotation
    
    # SSO configuration (optional)
    url: https://argocd.aimsgo.com
    
  rbac:
    policy.default: role:readonly
    policy.csv: |
      p, role:admin, applications, *, */*, allow
      p, role:admin, clusters, *, *, allow
      p, role:admin, repositories, *, *, allow
      g, admins, role:admin

server:
  ingress:
    enabled: true
    ingressClassName: traefik
    annotations:
      cert-manager.io/cluster-issuer: letsencrypt-prod
      traefik.ingress.kubernetes.io/router.tls: "true"
    hosts:
      - argocd.aimsgo.com
    tls:
      - secretName: argocd-tls
        hosts:
          - argocd.aimsgo.com
  
  resources:
    limits:
      cpu: 500m
      memory: 512Mi
    requests:
      cpu: 250m
      memory: 256Mi

repoServer:
  resources:
    limits:
      cpu: 1000m
      memory: 1Gi
    requests:
      cpu: 500m
      memory: 512Mi

controller:
  resources:
    limits:
      cpu: 2000m
      memory: 2Gi
    requests:
      cpu: 1000m
      memory: 1Gi

# Notifications (optional)
notifications:
  enabled: true
  argocdUrl: https://argocd.aimsgo.com
  
redis:
  enabled: true
  resources:
    limits:
      cpu: 200m
      memory: 256Mi
    requests:
      cpu: 100m
      memory: 128Mi
```

### ApplicationSet Configuration

File: `cluster-bootstrap/manifests/applicationset.yaml`

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
      labels:
        tenant: '{{path.basename}}'
        managed-by: applicationset
      annotations:
        notifications.argoproj.io/subscribe.on-sync-succeeded.slack: aimsgo-deployments
    
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
          prune: true          # Delete resources not in git
          selfHeal: true       # Sync when cluster state drifts
          allowEmpty: false    # Prevent deleting all resources
        
        syncOptions:
          - CreateNamespace=true
          - PrunePropagationPolicy=foreground
          - PruneLast=true
        
        retry:
          limit: 5
          backoff:
            duration: 5s
            factor: 2
            maxDuration: 3m
      
      # Ignore certain differences
      ignoreDifferences:
        - group: apps
          kind: Deployment
          jsonPointers:
            - /spec/replicas  # Ignore if HPA is managing replicas
```

## Deployment Workflow

### 1. Infrastructure Setup

```bash
cd terraform-hcloud-kube-hetzner/aimsgo

# Initialize Terraform
terraform init

# Plan infrastructure changes
terraform plan

# Apply (installs ArgoCD)
terraform apply
```

### 2. Verify ArgoCD Installation

```bash
# Check ArgoCD pods
kubectl get pods -n argocd

# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d

# Port forward to access UI
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Login via CLI
argocd login localhost:8080 --username admin --insecure
```

### 3. Deploy Tenants

```bash
# Add tenant configuration
cd aimsgo-argocd-apps
mkdir -p helm-template/tenants/my-tenant

# Create values.yaml
cat > helm-template/tenants/my-tenant/values.yaml <<EOF
deploymentMode: "single"
image:
  repository: ghcr.io/africaone-dev/aimsgo
  tag: "latest"
EOF

# Commit and push
git add helm-template/tenants/my-tenant/
git commit -m "Add my-tenant"
git push

# ApplicationSet automatically creates the Application
# Wait ~3 minutes for sync
```

### 4. Monitor Deployment

```bash
# List applications
argocd app list

# Watch specific application
argocd app get my-tenant --watch

# Check sync status
argocd app sync my-tenant
```

## Management Operations

### Access ArgoCD UI

```bash
# Via port-forward
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Or via ingress (if configured)
open https://argocd.aimsgo.com
```

### Add New Tenant

```bash
# 1. Create tenant directory and values
mkdir -p helm-template/tenants/school-a
cp helm-template/tenants/example-school/values.yaml \
   helm-template/tenants/school-a/values.yaml

# 2. Edit configuration
vim helm-template/tenants/school-a/values.yaml

# 3. Commit and push
git add helm-template/tenants/school-a/
git commit -m "Add school-a tenant"
git push

# 4. ApplicationSet automatically creates the Application
```

### Update Tenant Configuration

```bash
# Edit tenant values
vim helm-template/tenants/school-a/values.yaml

# Commit and push
git add helm-template/tenants/school-a/values.yaml
git commit -m "Update school-a: increase replicas"
git push

# ArgoCD auto-syncs the changes
```

### Delete Tenant

```bash
# Remove tenant directory
git rm -r helm-template/tenants/school-a/
git commit -m "Remove school-a tenant"
git push

# ApplicationSet removes the Application
# ArgoCD deletes all resources (due to prune: true)
```

### Manually Sync Application

```bash
# Sync immediately (don't wait for polling)
argocd app sync my-tenant

# Sync with replace (not recommended)
argocd app sync my-tenant --replace

# Sync specific resource
argocd app sync my-tenant --resource deployment:my-tenant-backend
```

### Rollback Application

```bash
# View history
argocd app history my-tenant

# Rollback to specific revision
argocd app rollback my-tenant <revision-id>

# Or revert git commit
cd aimsgo-argocd-apps
git revert <commit-hash>
git push
```

## Upgrading ArgoCD

### Via Terraform

```bash
cd terraform-hcloud-kube-hetzner/aimsgo/cluster-bootstrap

# Update version in argocd.tf
vim argocd.tf
# Change: version = "5.51.6" to version = "5.52.0"

# Apply changes
terraform plan
terraform apply

# Verify upgrade
kubectl get pods -n argocd
argocd version
```

## Troubleshooting

### ArgoCD Not Syncing

```bash
# Check ApplicationSet
kubectl get applicationset -n argocd
kubectl describe applicationset aimsgo-tenants -n argocd

# Check if Applications are created
kubectl get applications -n argocd

# Force refresh
argocd app get my-tenant --refresh
argocd app sync my-tenant
```

### Repository Connection Issues

```bash
# Check repository secret
kubectl get secret aimsgo-argocd-apps -n argocd

# Test connection
argocd repo list
argocd repo get https://github.com/africaone-dev/aimsgo-argocd-apps

# Update credentials
kubectl edit secret aimsgo-argocd-apps -n argocd
```

### Sync Errors

```bash
# View detailed error
argocd app get my-tenant

# Check application events
kubectl describe application my-tenant -n argocd

# View application logs
argocd app logs my-tenant --follow
```

### Helm Template Errors

```bash
# Test template locally
helm template test ./helm-template \
  -f helm-template/tenants/my-tenant/values.yaml

# Validate in ArgoCD
argocd app diff my-tenant
```

## Best Practices

1. **Pin ArgoCD Version**: Use specific version in Terraform, not "latest"
2. **Automated Sync**: Enable for non-production environments
3. **Manual Sync**: Consider for production environments
4. **Health Checks**: Configure proper health assessments
5. **Resource Hooks**: Use PreSync/PostSync hooks for migrations
6. **Notifications**: Configure Slack/email notifications
7. **RBAC**: Implement proper role-based access control
8. **Backup**: Regularly backup ArgoCD configuration
9. **Git as Source of Truth**: Never make manual changes in cluster
10. **Monitoring**: Monitor ArgoCD metrics and sync status

## Security

### Repository Access

```hcl
# Use deploy key instead of PAT
resource "kubernetes_secret" "argocd_repo" {
  data = {
    type          = "git"
    url           = "git@github.com:africaone-dev/aimsgo-argocd-apps.git"
    sshPrivateKey = var.deploy_key
  }
}
```

### RBAC Configuration

```yaml
# helm-values/argocd.yaml
configs:
  rbac:
    policy.csv: |
      # Developers can view applications
      p, role:developer, applications, get, */*, allow
      p, role:developer, applications, sync, */*, allow
      
      # DevOps can manage everything
      p, role:devops, *, *, */*, allow
      
      # Assign users to roles
      g, alice@example.com, role:developer
      g, bob@example.com, role:devops
```

## References

- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [ArgoCD Helm Chart](https://github.com/argoproj/argo-helm/tree/main/charts/argo-cd)
- [ApplicationSet Documentation](https://argo-cd.readthedocs.io/en/stable/user-guide/application-set/)
- [Terraform Helm Provider](https://registry.terraform.io/providers/hashicorp/helm/latest/docs)
