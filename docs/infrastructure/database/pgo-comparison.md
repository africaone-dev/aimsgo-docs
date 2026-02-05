# План: PostgreSQL Operator (PGO) от Crunchy Data

## Почему PGO лучше чем Bitnami?

### Bitnami PostgreSQL
- ✅ Простой
- ✅ Быстрая установка
- ❌ Ручной failover
- ❌ Нет автоматических бэкапов
- ❌ Нет connection pooling
- ❌ Сложное масштабирование

### PGO (Crunchy Data)
- ✅ **Production-ready** - используется в enterprise
- ✅ **Автоматический failover** - HA из коробки
- ✅ **Встроенные бэкапы** - в S3, GCS, Azure, MinIO
- ✅ **Connection pooling** - PgBouncer автоматически
- ✅ **Мониторинг** - Prometheus exporter встроен
- ✅ **Репликация** - синхронная/асинхронная
- ✅ **Disaster Recovery** - point-in-time recovery
- ✅ **Полностью open source** - Apache 2.0 лицензия
- ✅ **Декларативный** - управление через CRD
- ✅ **TLS из коробки** - автоматические сертификаты

## Архитектура PGO

```
┌─────────────────────────────────────────────────────┐
│           PGO Operator (управляет всем)             │
└─────────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌────────┐      ┌────────┐      ┌────────┐
    │Primary │──────│Replica1│──────│Replica2│
    │ (RW)   │ sync │ (RO)   │ async│ (RO)   │
    └────────┘      └────────┘      └────────┘
         │
         ▼
    ┌─────────┐
    │PgBouncer│ (connection pooling)
    └─────────┘
         │
         ▼
    ┌─────────┐
    │  Apps   │
    └─────────┘
```

## PGO vs CloudNativePG vs Zalando

| Функция | PGO | CloudNativePG | Zalando |
|---------|-----|---------------|---------|
| Operator зрелость | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Документация | 🔥 Отличная | ✅ Хорошая | ⚠️ Средняя |
| Community | 🔥 Большое | ✅ Растущее | ⚠️ Меньше |
| Connection pooling | ✅ PgBouncer | ✅ PgBouncer | ❌ Отдельно |
| Бэкапы | ✅ pgBackRest | ✅ Barman | ✅ WAL-G |
| TLS | ✅ Авто | ✅ Авто | ⚠️ Ручная |
| UI Dashboard | ✅ Есть | ❌ Нет | ❌ Нет |
| Лицензия | Apache 2.0 | Apache 2.0 | MIT |

## Рекомендация: PGO 🏆

**Почему именно PGO:**
1. **Самая зрелая** - 5+ лет в production
2. **Лучшая документация** - примеры для всех случаев
3. **Enterprise features бесплатно** - HA, бэкапы, мониторинг
4. **Легко начать** - простой PostgresCluster CRD
5. **Kubernetes-native** - управление через kubectl

## Установка PGO

### Способ 1: Через Helm (Рекомендуется)
```bash
helm install pgo oci://registry.developers.crunchydata.com/crunchydata/pgo \
  --create-namespace --namespace postgres-operator
```

### Способ 2: Через Terraform (Мы используем)
```hcl
resource "helm_release" "pgo" {
  name             = "pgo"
  repository       = "oci://registry.developers.crunchydata.com/crunchydata"
  chart            = "pgo"
  version          = "5.7.3"
  namespace        = "postgres-operator"
  create_namespace = true
}
```

## PostgresCluster для AIMSGO

```yaml
apiVersion: postgres-operator.crunchydata.com/v1beta1
kind: PostgresCluster
metadata:
  name: aimsgo-db
  namespace: database
spec:
  image: registry.developers.crunchydata.com/crunchydata/crunchy-postgres:ubi8-16.7-0
  postgresVersion: 16
  
  # Количество инстансов (1 primary + N replicas)
  instances:
    - name: instance1
      replicas: 3  # 1 primary + 2 replicas
      dataVolumeClaimSpec:
        accessModes:
          - "ReadWriteOnce"
        resources:
          requests:
            storage: 20Gi
      
      # Resources per instance
      resources:
        requests:
          memory: 512Mi
          cpu: 500m
        limits:
          memory: 2Gi
          cpu: 2000m

  # Connection Pooling (PgBouncer)
  proxy:
    pgBouncer:
      image: registry.developers.crunchydata.com/crunchydata/crunchy-pgbouncer:ubi8-1.23-6
      replicas: 2
      config:
        global:
          pool_mode: transaction
          max_client_conn: 1000
          default_pool_size: 25
      resources:
        requests:
          memory: 128Mi
          cpu: 100m
        limits:
          memory: 256Mi
          cpu: 200m

  # Backups (pgBackRest)
  backups:
    pgbackrest:
      image: registry.developers.crunchydata.com/crunchydata/crunchy-pgbackrest:ubi8-2.54.1-0
      repos:
        - name: repo1
          schedules:
            full: "0 2 * * 0"      # Weekly full backup (Sunday 2 AM)
            differential: "0 2 * * 1-6"  # Daily differential
          volume:
            volumeClaimSpec:
              accessModes:
                - "ReadWriteOnce"
              resources:
                requests:
                  storage: 50Gi

  # Monitoring
  monitoring:
    pgmonitor:
      exporter:
        image: registry.developers.crunchydata.com/crunchydata/crunchy-postgres-exporter:ubi8-0.16.0-0

  # Users and databases
  users:
    - name: aimsgo
      databases:
        - aimsgo_core
      options: "CREATEDB"
```

## Преимущества для AIMSGO Platform

### 1. Multi-tenant готовность
```yaml
# Легко создать БД для каждого tenant
users:
  - name: aimsgo_core
    databases: [aimsgo_core]
  - name: tenant_school1
    databases: [school1_db]
  - name: tenant_school2
    databases: [school2_db]
```

### 2. Автоматический Failover
- Primary падает → автоматическое продвижение Replica
- Приложения подключаются через Service → прозрачно
- Downtime < 10 секунд

### 3. Point-in-Time Recovery
```bash
# Восстановить БД на любую точку времени
kubectl apply -f restore-to-timestamp.yaml
```

### 4. Connection Pooling из коробки
```yaml
# Приложения подключаются к PgBouncer
host: aimsgo-db-pgbouncer.database.svc.cluster.local
port: 5432
```

### 5. Мониторинг
```bash
# Prometheus metrics автоматически
kubectl get servicemonitor -n database
```

## План реализации

- [ ] Создать Terraform конфигурацию для PGO operator
- [ ] Создать PostgresCluster manifest для AIMSGO
- [ ] Применить PGO operator через Terraform
- [ ] Создать PostgresCluster через kubectl/ArgoCD
- [ ] Настроить бэкапы
- [ ] Получить connection credentials
- [ ] Обновить helm-aims-core для подключения
- [ ] Настроить мониторинг (опционально)

## Сравнение ресурсов

### Bitnami (1 инстанс)
- 1 Pod PostgreSQL
- Всего: ~512Mi RAM, ~500m CPU

### PGO (HA setup)
- 3 Pods PostgreSQL (primary + 2 replicas)
- 2 Pods PgBouncer
- 1 Pod Operator
- Всего: ~2.5Gi RAM, ~2 CPU

**Вывод:** PGO требует больше ресурсов, но дает **production-grade** надежность!

## Решение по зависаниям Terraform

Остается то же самое - использовать **targeted plans**:
```bash
terraform plan -target=module.cluster-bootstrap.helm_release.pgo
terraform plan -target=module.cluster-bootstrap.kubectl_manifest.aimsgo_db
```

