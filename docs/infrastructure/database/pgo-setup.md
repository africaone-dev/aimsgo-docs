# PostgreSQL Operator (PGO) Deployment Guide

## 🏆 Почему PGO вместо Bitnami?

### Bitnami PostgreSQL ❌
- Один инстанс (single point of failure)
- Ручной failover
- Нет connection pooling
- Ручные бэкапы

### PGO by Crunchy Data ✅
- **Автоматический HA** - primary + replicas
- **Автоматический failover** - < 10 сек downtime
- **Connection pooling** - PgBouncer встроен
- **Автобэкапы** - full, differential, incremental
- **Point-in-time recovery**
- **TLS из коробки**
- **Мониторинг** - Prometheus metrics
- **100% Open Source** - Apache 2.0

---

## 📋 Шаг 1: Инициализация Terraform

```bash
cd /Users/dmitriimashkov/PycharmProjects/africaone-dev/terraform-hcloud-kube-hetzner/aimsgo

# Инициализация (установит kubectl provider)
terraform init -upgrade
```

---

## 🚀 Шаг 2: Деплой PGO Operator (TARGETED PLAN)

### Без GITHUB_TOKEN (рекомендуется):

```bash
# Plan
terraform plan -target=module.cluster-bootstrap.helm_release.pgo

# Apply
terraform apply -target=module.cluster-bootstrap.helm_release.pgo
```

### С GITHUB_TOKEN (если хотите full plan):

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxx
terraform plan
terraform apply
```

**Ожидаемый результат:**
```
module.cluster-bootstrap.helm_release.pgo: Creating...
module.cluster-bootstrap.helm_release.pgo: Creation complete after 2m30s
```

---

## 🗄️ Шаг 3: Деплой PostgresCluster

```bash
# Plan
terraform plan -target=module.cluster-bootstrap.kubectl_manifest.aimsgo_postgres_cluster

# Apply
terraform apply -target=module.cluster-bootstrap.kubectl_manifest.aimsgo_postgres_cluster
```

**Что произойдет:**
- Создастся namespace `database`
- Поднимется PostgreSQL 16 pod (primary)
- Поднимутся 2 PgBouncer pods
- Создастся база данных `aimsgo_core`
- Создастся пользователь `aimsgo`
- Настроятся автоматические бэкапы

---

## ✅ Шаг 4: Проверка развертывания

```bash
# 1. Проверить что PGO operator работает
kubectl get pods -n postgres-operator

# Ожидаемый вывод:
# NAME                        READY   STATUS    RESTARTS   AGE
# pgo-578b9d7f96-xxxxx        1/1     Running   0          5m

# 2. Проверить PostgresCluster
kubectl get postgrescluster -n database

# Ожидаемый вывод:
# NAME         INSTANCES   READY   AGE
# aimsgo-db    1           1       3m

# 3. Проверить pods
kubectl get pods -n database

# Ожидаемый вывод:
# NAME                               READY   STATUS    RESTARTS   AGE
# aimsgo-db-instance1-xxxxx          4/4     Running   0          3m
# aimsgo-db-pgbouncer-xxxxx-xxxxx    2/2     Running   0          3m
# aimsgo-db-pgbouncer-xxxxx-yyyyy    2/2     Running   0          3m
# aimsgo-db-repo-host-0              2/2     Running   0          3m

# 4. Проверить PVC
kubectl get pvc -n database

# 5. Проверить Services
kubectl get svc -n database

# Должны быть:
# - aimsgo-db-primary (порт 5432)
# - aimsgo-db-replicas (порт 5432)
# - aimsgo-db-pgbouncer (порт 5432) ← использовать для подключения!
```

---

## 🔑 Шаг 5: Получить credentials

```bash
# Пароль хранится в Kubernetes Secret
kubectl get secret aimsgo-db-pguser-aimsgo -n database -o jsonpath='{.data.password}' | base64 -d
# Сохраните этот пароль!

# Полный connection string:
kubectl get secret aimsgo-db-pguser-aimsgo -n database -o jsonpath='{.data.uri}' | base64 -d

# Или отдельные параметры:
kubectl get secret aimsgo-db-pguser-aimsgo -n database -o jsonpath='{.data.user}' | base64 -d
kubectl get secret aimsgo-db-pguser-aimsgo -n database -o jsonpath='{.data.dbname}' | base64 -d
kubectl get secret aimsgo-db-pguser-aimsgo -n database -o jsonpath='{.data.host}' | base64 -d
kubectl get secret aimsgo-db-pguser-aimsgo -n database -o jsonpath='{.data.port}' | base64 -d
```

---

## 🔌 Шаг 6: Connection Details для Applications

**Используйте PgBouncer endpoint (connection pooling):**

```yaml
host: aimsgo-db-pgbouncer.database.svc.cluster.local
port: 5432
database: aimsgo_core
username: aimsgo
password: <из secret aimsgo-db-pguser-aimsgo>
```

**Или напрямую к Primary (без pooling):**

```yaml
host: aimsgo-db-primary.database.svc.cluster.local
port: 5432
database: aimsgo_core
username: aimsgo
password: <из secret>
```

---

## 🧪 Шаг 7: Тестирование подключения

```bash
# Запустить psql client pod
kubectl run -it --rm postgresql-client \
  --image=postgres:16 \
  --restart=Never \
  --namespace=database \
  --env="PGPASSWORD=$(kubectl get secret aimsgo-db-pguser-aimsgo -n database -o jsonpath='{.data.password}' | base64 -d)" \
  -- psql -h aimsgo-db-pgbouncer -U aimsgo -d aimsgo_core

# Внутри psql:
\l                  # Список баз данных
\dt                 # Список таблиц
SELECT version();   # Версия PostgreSQL
\q                  # Выход
```

---

## 📊 Шаг 8: Мониторинг и Metrics

```bash
# Проверить ServiceMonitor (если есть Prometheus)
kubectl get servicemonitor -n database

# Посмотреть metrics напрямую
kubectl port-forward -n database svc/aimsgo-db-primary 9187:9187
# Откройте: http://localhost:9187/metrics
```

---

## 🔧 Troubleshooting

### PGO Operator не запустился
```bash
kubectl describe pod -n postgres-operator -l app.kubernetes.io/name=pgo
kubectl logs -n postgres-operator -l app.kubernetes.io/name=pgo
```

### PostgresCluster не создается
```bash
kubectl describe postgrescluster aimsgo-db -n database
kubectl logs -n postgres-operator -l app.kubernetes.io/name=pgo --tail=100
```

### Pod PostgreSQL не запускается
```bash
kubectl describe pod -n database -l postgres-operator.crunchydata.com/cluster=aimsgo-db
kubectl logs -n database -l postgres-operator.crunchydata.com/cluster=aimsgo-db -c database
```

### Проблемы с PVC
```bash
kubectl get pvc -n database
kubectl describe pvc -n database
```

### Проверить статус репликации
```bash
# Подключиться к primary
kubectl exec -it -n database aimsgo-db-instance1-xxxxx -c database -- psql -U postgres

# В psql:
SELECT * FROM pg_stat_replication;
\q
```

---

## 🔄 Масштабирование до HA (3 replicas)

Отредактируйте `pgo.tf`:

```hcl
instances:
  - name: instance1
    replicas: 3  # Было 1, стало 3
```

Затем:
```bash
terraform apply -target=module.cluster-bootstrap.kubectl_manifest.aimsgo_postgres_cluster
```

---

## 💾 Бэкапы

### Проверить расписание бэкапов
```bash
kubectl get postgrescluster aimsgo-db -n database -o jsonpath='{.spec.backups.pgbackrest.repos[0].schedules}'
```

### Запустить ручной backup
```bash
kubectl annotate postgrescluster aimsgo-db -n database \
  postgres-operator.crunchydata.com/pgbackrest-backup="$(date +%Y-%m-%d_%H:%M:%S)"
```

### Проверить статус бэкапов
```bash
kubectl exec -n database -it aimsgo-db-repo-host-0 -c pgbackrest -- pgbackrest info
```

---

## 📚 Дополнительные ресурсы

- **Официальная документация:** https://access.crunchydata.com/documentation/postgres-operator/latest/
- **Примеры:** https://github.com/CrunchyData/postgres-operator-examples
- **PGO Tutorial:** https://access.crunchydata.com/documentation/postgres-operator/latest/tutorial/

---

## ⚠️ Важные заметки

1. **Бэкапы:** Настроены локальные бэкапы (PVC). Для production рекомендуется S3/GCS.
2. **HA:** Начали с 1 replica для экономии ресурсов. Можно масштабировать до 3.
3. **TLS:** PGO автоматически создает TLS сертификаты для всех connections.
4. **Credentials:** Хранятся в Kubernetes Secrets, автоматически ротируются.
5. **Мониторинг:** Prometheus ServiceMonitor создается автоматически.
