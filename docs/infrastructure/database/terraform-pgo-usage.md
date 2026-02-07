# Управление PostgreSQL через Terraform

## ✅ Текущий статус

PGO (Crunchy Data PostgreSQL Operator) и PostgresCluster **импортированы в Terraform state**.

**Импортированные ресурсы:**
- `module.cluster-bootstrap.helm_release.pgo` - PGO Operator (namespace: postgres-operator)
- `module.cluster-bootstrap.kubectl_manifest.aimsgo_postgres_cluster` - PostgreSQL кластер (namespace: database)

## 🚀 Применение через Terraform

### 1. Установка PGO Operator (уже установлен)

```bash
cd /Users/dmitriimashkov/PycharmProjects/africaone-dev/terraform-hcloud-kube-hetzner/aimsgo

# Operator уже установлен через helm, импортирован в Terraform
terraform state show module.cluster-bootstrap.helm_release.pgo
```

### 2. Применение PostgreSQL кластера

```bash
# Plan (показать изменения)
terraform plan -target=module.cluster-bootstrap.kubectl_manifest.aimsgo_postgres_cluster

# Apply (применить изменения)
terraform apply -target=module.cluster-bootstrap.kubectl_manifest.aimsgo_postgres_cluster

# Или apply всего cluster-bootstrap модуля (требует добавить все targets из-за moved resources)
# НЕ РЕКОМЕНДУЕТСЯ из-за конфликтов с null_resource -> terraform_data миграцией
```

### 3. Проверка статуса

```bash
# PostgreSQL кластер
kubectl get postgrescluster -n database
kubectl get pods -n database

# PGO Operator
kubectl get pods -n postgres-operator

# Получить пароль БД
kubectl get secret aimsgo-db-pguser-aimsgo -n database \
  -o jsonpath='{.data.password}' | base64 -d
```

## 📝 Редактирование конфигурации

Для изменения PostgreSQL кластера:

1. Отредактируйте `cluster-bootstrap/pgo.tf` (ресурс `kubectl_manifest.aimsgo_postgres_cluster`)
2. Примените изменения:
   ```bash
   terraform apply -target=module.cluster-bootstrap.kubectl_manifest.aimsgo_postgres_cluster
   ```

### Примеры изменений:

**Масштабирование до 3 реплик (HA):**
```hcl
instances:
  - name: instance1
    replicas: 3  # Было: 1
```

**Изменение размера диска:**
```hcl
dataVolumeClaimSpec:
  resources:
    requests:
      storage: 50Gi  # Было: 20Gi
```

**Добавление нового пользователя:**
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

## ⚠️ Важные замечания

### Проблема с targeted plan

Terraform в этом проекте имеет issue с `null_resource` → `terraform_data` миграцией.

**Симптом:** При выполнении `terraform plan -target=...` требует добавить множество targets для kube-hetzner модуля.

**Решение:**
- Используйте targeted apply **только** для cluster-bootstrap ресурсов
- Избегайте `terraform apply` без targets (может пересоздать kubeconfig и другие ресурсы)

### Безопасные команды:

```bash
# ✅ Безопасно - изменяет только PostgreSQL кластер
terraform apply -target=module.cluster-bootstrap.kubectl_manifest.aimsgo_postgres_cluster

# ✅ Безопасно - изменяет только PGO operator
terraform apply -target=module.cluster-bootstrap.helm_release.pgo

# ⚠️ ОСТОРОЖНО - может затронуть kube-hetzner ресурсы
terraform apply -target=module.cluster-bootstrap

# ❌ НЕ ДЕЛАТЬ - пересоздаст kubeconfig, kustomization и другие ресурсы
terraform apply
```

## 🔄 Альтернатива: kubectl apply

Если targeted terraform apply не работает, можно применять через kubectl:

```bash
# Извлечь YAML из Terraform
cd cluster-bootstrap
grep -A 100 "yaml_body" pgo.tf | sed '1d;$d' > /tmp/postgres-cluster.yaml

# Применить
kubectl apply -f /tmp/postgres-cluster.yaml
```

**После применения через kubectl:**
```bash
# Синхронизировать state с реальным состоянием
terraform refresh -target=module.cluster-bootstrap.kubectl_manifest.aimsgo_postgres_cluster
```

## 📊 Подключение к БД

**Connection string через PgBouncer (рекомендуется):**
```
Host: aimsgo-db-pgbouncer.database.svc.cluster.local
Port: 5432
Database: aimsgo_core
User: aimsgo
Password: <из секрета>
```

**Connection string напрямую к primary (для админских задач):**
```
Host: aimsgo-db-primary.database.svc.cluster.local
Port: 5432
Database: aimsgo_core
User: aimsgo
Password: <из секрета>
```

## 🗑️ Удаление

```bash
# Удалить PostgreSQL кластер (ОСТОРОЖНО!)
terraform destroy -target=module.cluster-bootstrap.kubectl_manifest.aimsgo_postgres_cluster

# Удалить PGO Operator (удалит ВСЕ PostgreSQL кластеры!)
terraform destroy -target=module.cluster-bootstrap.helm_release.pgo
```

## 📚 Документация

- [PGO Documentation](https://access.crunchydata.com/documentation/postgres-operator/latest/)
- [PostgresCluster CRD Reference](https://access.crunchydata.com/documentation/postgres-operator/latest/references/crd/)
- [Architecture](https://access.crunchydata.com/documentation/postgres-operator/latest/architecture/)
