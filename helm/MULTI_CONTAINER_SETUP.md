# Multi-Container Deployment Setup for AIMS

This document explains how to use the Helm template to deploy applications with multiple containers (frontend + backend) like the AIMS project.

## Overview

The Helm template now supports two deployment modes:

1. **Single Mode** (default): Deploys a single container (e.g., aimsgo)
2. **Multi Mode**: Deploys separate frontend and backend containers with separate services

## Directory Structure

```
helm-template/
├── templates/
│   ├── deployment.yaml          # Single-container deployment
│   ├── deployment-multi.yaml    # Multi-container deployments (frontend + backend)
│   ├── service.yaml             # Single-container service
│   ├── service-multi.yaml       # Multi-container services (frontend + backend)
│   └── ingress.yaml             # Ingress with routing support
├── tenants/
│   ├── aims-example/            # Example AIMS tenant with frontend + backend
│   │   └── values.yaml
│   └── example-school/          # Example single-container tenant
│       └── values.yaml
└── values.yaml                   # Default values
```

## Configuration

### Multi-Container Mode (AIMS with Frontend + Backend)

Set `deploymentMode: "multi"` and enable frontend and/or backend:

```yaml
# Set deployment mode to multi-container
deploymentMode: "multi"

# Frontend configuration
frontend:
  enabled: true
  image:
    repository: ghcr.io/africaone-dev/aims-frontend
    pullPolicy: IfNotPresent
    tag: "latest"
  port: 3000
  env:
    - name: NEXT_PUBLIC_API_URL
      value: "http://localhost:8000"
    - name: NODE_ENV
      value: "production"
  resources:
    limits:
      cpu: 500m
      memory: 512Mi
    requests:
      cpu: 250m
      memory: 256Mi
  livenessProbe:
    httpGet:
      path: /
      port: 3000
    initialDelaySeconds: 30
    periodSeconds: 10
  readinessProbe:
    httpGet:
      path: /
      port: 3000
    initialDelaySeconds: 10
    periodSeconds: 5

# Backend configuration
backend:
  enabled: true
  image:
    repository: ghcr.io/africaone-dev/aims-backend
    pullPolicy: IfNotPresent
    tag: "latest"
  port: 8000
  env:
    - name: DJANGO_SETTINGS_MODULE
      value: "backend.settings"
    - name: DATABASE_URL
      value: "postgresql://user:password@postgres:5432/aims_db"
  resources:
    limits:
      cpu: 1000m
      memory: 1Gi
    requests:
      cpu: 500m
      memory: 512Mi
  livenessProbe:
    httpGet:
      path: /health/
      port: 8000
    initialDelaySeconds: 30
    periodSeconds: 10
  readinessProbe:
    httpGet:
      path: /health/
      port: 8000
    initialDelaySeconds: 10
    periodSeconds: 5
```

### Ingress Routing

For multi-container deployments, you can route different paths to different services:

```yaml
ingress:
  enabled: true
  className: "traefik"
  hosts:
    - host: "aims-example.aimsgo.com"
      paths:
        # Route /api to backend
        - path: /api
          pathType: Prefix
          backend:
            service:
              name: backend
              port: 8000
        # Route /admin to backend
        - path: /admin
          pathType: Prefix
          backend:
            service:
              name: backend
              port: 8000
        # Route everything else to frontend
        - path: /
          pathType: Prefix
          backend:
            service:
              name: frontend
              port: 3000
  tls:
    - hosts:
        - "aims-example.aimsgo.com"
      secretName: "aims-example-tls"
```

## Created Resources

### Multi-Container Mode

When using multi-container mode, the following resources are created:

1. **Deployments**:
   - `{release-name}-frontend` - Frontend deployment
   - `{release-name}-backend` - Backend deployment

2. **Services**:
   - `{release-name}-frontend` - Service for frontend (port 3000)
   - `{release-name}-backend` - Service for backend (port 8000)

3. **Ingress**:
   - Single ingress with path-based routing to frontend/backend services

### Single-Container Mode

When using single-container mode (default):

1. **Deployment**: `{release-name}` - Single container deployment
2. **Service**: `{release-name}` - Single service
3. **Ingress**: Routes all traffic to the single service

## Testing

### Test Single-Container Mode

```bash
helm template test-single ./helm-template \
  --set deploymentMode=single \
  --set image.tag=latest
```

### Test Multi-Container Mode

```bash
helm template test-multi ./helm-template \
  -f ./helm-template/tenants/aims-example/values.yaml
```

## Deployment Examples

### Deploy AIMS Tenant

```bash
# Using ArgoCD ApplicationSet
kubectl apply -f apps/applicationset.yaml

# Or manually with Helm
helm upgrade --install aims-tenant-1 ./helm-template \
  -f ./helm-template/tenants/aims-example/values.yaml \
  --namespace tenant-1 \
  --create-namespace
```

## Image Management

The CI workflows automatically build and push images:

- **aims-frontend**: `ghcr.io/africaone-dev/aims-frontend:latest`
- **aims-backend**: `ghcr.io/africaone-dev/aims-backend:latest`
- **aims-core-frontend**: `ghcr.io/africaone-dev/aims-core-frontend:latest`
- **aims-core-backend**: `ghcr.io/africaone-dev/aims-core-backend:latest`

## Migration Guide

### From Single-Container to Multi-Container

1. Update tenant values file:
   ```yaml
   deploymentMode: "multi"
   
   frontend:
     enabled: true
     image:
       repository: ghcr.io/africaone-dev/aims-frontend
       tag: "latest"
     # ... frontend config
   
   backend:
     enabled: true
     image:
       repository: ghcr.io/africaone-dev/aims-backend
       tag: "latest"
     # ... backend config
   ```

2. Update ingress paths to route to correct services

3. Deploy the updated configuration

## Troubleshooting

### Services Not Created

Ensure `deploymentMode: "multi"` and `frontend.enabled: true` / `backend.enabled: true` are set.

### Ingress Not Routing Correctly

Check that the `backend.service.name` in ingress paths matches either "frontend" or "backend".

### Images Not Pulling

Verify:
1. GitHub Container Registry credentials are configured
2. Image tags exist in the registry
3. `imagePullSecrets` is configured correctly

## Best Practices

1. **Environment Variables**: Keep sensitive data in Kubernetes Secrets
2. **Resource Limits**: Always set resource limits and requests
3. **Health Checks**: Configure appropriate liveness and readiness probes
4. **Image Tags**: Use specific version tags in production, not `latest`
5. **Ingress Paths**: Order paths from most specific to least specific

## Support

For issues or questions, contact the DevOps team or open an issue in the repository.
