# Managing PostgreSQL via Terraform

## Current Status

PGO (Crunchy Data PostgreSQL Operator) and PostgresCluster are **imported into Terraform state**.

**Imported resources:**
- `module.cluster-bootstrap.helm_release.pgo` — PGO Operator (namespace: `postgres-operator`)
- `module.cluster-bootstrap.kubectl_manifest.aimsgo_postgres_cluster` — PostgreSQL cluster (namespace: `database`)

## Applying Changes

### PGO Operator (already installed)

```bash
cd /path/to/terraform-hcloud-kube-hetzner/aimsgo

# Verify state
terraform state show module.cluster-bootstrap.helm_release.pgo
```

### PostgreSQL Cluster

```bash
# Plan
terraform plan -target=module.cluster-bootstrap.kubectl_manifest.aimsgo_postgres_cluster

# Apply
terraform apply -target=module.cluster-bootstrap.kubectl_manifest.aimsgo_postgres_cluster
```

### Verify Status

```bash
kubectl get postgrescluster -n database
kubectl get pods -n database
kubectl get pods -n postgres-operator

# Get DB password
kubectl get secret aimsgo-db-pguser-aimsgo -n database \
  -o jsonpath='{.data.password}' | base64 -d
```

## Editing Configuration

To modify the PostgreSQL cluster, edit `cluster-bootstrap/pgo.tf` and apply:

```bash
terraform apply -target=module.cluster-bootstrap.kubectl_manifest.aimsgo_postgres_cluster
```

### Common Changes

**Scale to 3 replicas (HA):**
```hcl
instances:
  - name: instance1
    replicas: 3
```

**Increase disk size:**
```hcl
dataVolumeClaimSpec:
  resources:
    requests:
      storage: 50Gi
```

**Add a new database user:**
```hcl
users:
  - name: aimsgo
    databases:
      - aimsgo_core
    options: "CREATEDB"
  - name: readonly_user
    databases:
      - aimsgo_core
```

## ⚠️ Targeted Plan Caveats

Terraform in this project has a known issue with `null_resource` → `terraform_data` migration in the kube-hetzner module.

### Safe commands:

```bash
# ✅ Safe — only affects PostgreSQL cluster
terraform apply -target=module.cluster-bootstrap.kubectl_manifest.aimsgo_postgres_cluster

# ✅ Safe — only affects PGO operator
terraform apply -target=module.cluster-bootstrap.helm_release.pgo

# ⚠️ Caution — may affect kube-hetzner resources
terraform apply -target=module.cluster-bootstrap

# ❌ Do NOT run — may recreate kubeconfig and other resources
terraform apply
```

## Alternative: kubectl apply

If targeted terraform apply fails, apply directly via kubectl:

```bash
# Extract YAML from Terraform
cd cluster-bootstrap
grep -A 100 "yaml_body" pgo.tf | sed '1d;$d' > /tmp/postgres-cluster.yaml

# Apply
kubectl apply -f /tmp/postgres-cluster.yaml

# Sync state
terraform refresh -target=module.cluster-bootstrap.kubectl_manifest.aimsgo_postgres_cluster
```

## Connection Strings

**Via PgBouncer (recommended):**
```
Host: aimsgo-db-pgbouncer.database.svc.cluster.local
Port: 5432
Database: aimsgo_core
User: aimsgo
```

**Direct to Primary (admin tasks):**
```
Host: aimsgo-db-primary.database.svc.cluster.local
Port: 5432
Database: aimsgo_core
User: aimsgo
```

## Deletion

```bash
# Delete PostgreSQL cluster (CAUTION!)
terraform destroy -target=module.cluster-bootstrap.kubectl_manifest.aimsgo_postgres_cluster

# Delete PGO Operator (deletes ALL PostgreSQL clusters!)
terraform destroy -target=module.cluster-bootstrap.helm_release.pgo
```

## References

- [PGO Documentation](https://access.crunchydata.com/documentation/postgres-operator/latest/)
- [PostgresCluster CRD Reference](https://access.crunchydata.com/documentation/postgres-operator/latest/references/crd/)
- [Architecture](https://access.crunchydata.com/documentation/postgres-operator/latest/architecture/)
