# План: PostgreSQL в Kubernetes + Решение проблемы Terraform зависаний

## Проблема с GITHUB_TOKEN и зависаниями Terraform

### Зачем нужен GITHUB_TOKEN?

Terraform модуль `kube-hetzner` использует GitHub provider для получения данных о последних релизах:

```hcl
data "github_release" "hetzner_ccm" {
  repository  = "hetznercloud/hcloud-cloud-controller-manager"
  owner       = "hetznercloud"
  retrieve_by = "latest"
}

data "github_release" "hetzner_csi" {
  repository  = "hetznercloud/csi-driver"
  owner       = "hetznercloud"
  retrieve_by = "latest"
}

data "github_release" "kured" {
  repository  = "kubereboot/kured"
  owner       = "kubereboot"
  retrieve_by = "latest"
}
```

**Без GITHUB_TOKEN:**
- GitHub API ограничивает неавторизованные запросы: **60 запросов/час**
- Terraform делает множество запросов для получения версий
- При превышении лимита или медленном API - зависание на 2-5 минут

**С GITHUB_TOKEN:**
- Лимит увеличивается до **5000 запросов/час**
- Запросы выполняются с приоритетом
- Terraform работает быстро

### Как обойти зависания БЕЗ токена?

#### Вариант 1: Targeted Plans (Быстрый)
```bash
# Планировать только конкретные ресурсы
terraform plan -target=module.cluster-bootstrap
terraform plan -target=helm_release.postgresql
```

#### Вариант 2: Закешировать версии в модуле (Постоянное решение)
Модифицировать `kube-hetzner` чтобы использовать фиксированные версии вместо `data.github_release`:

```hcl
# Вместо data sources использовать переменные
variable "hetzner_ccm_version" {
  default = "v1.20.0"  # фиксированная версия
}
```

#### Вариант 3: Использовать GITHUB_TOKEN (Рекомендуется)
```bash
# 1. Создать Personal Access Token:
#    https://github.com/settings/tokens
#    Scopes: public_repo (только чтение публичных репозиториев)

# 2. Установить в окружение
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxx

# 3. Или добавить в ~/.zshrc для постоянного использования
echo 'export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxx' >> ~/.zshrc
```

---

## PostgreSQL для Kubernetes - Варианты

### 1. CloudNativePG (Рекомендуется для production)

**Преимущества:**
- ✅ CNCF проект (зрелый и поддерживаемый)
- ✅ Автоматическая репликация и failover
- ✅ Встроенные бэкапы (S3, GCS, Azure)
- ✅ Мониторинг через Prometheus
- ✅ Поддержка major/minor версий PostgreSQL
- ✅ Connection pooling (PgBouncer встроен)

**Использование:**
```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: aimsgo-db
spec:
  instances: 3
  postgresql:
    parameters:
      max_connections: "200"
  storage:
    size: 20Gi
```

### 2. Bitnami PostgreSQL (Простой и надежный)

**Преимущества:**
- ✅ Очень популярный Helm chart (10+ млн скачиваний)
- ✅ Простая конфигурация
- ✅ Репликация master-slave
- ✅ Хорошая документация
- ✅ Metrics для Prometheus

**Недостатки:**
- ❌ Меньше автоматизации, чем CloudNativePG
- ❌ Ручной failover

### 3. Zalando PostgreSQL Operator

**Преимущества:**
- ✅ Проверен в production (использует Zalando)
- ✅ Автоматический failover
- ✅ Поддержка connection pooling

**Недостатки:**
- ❌ Более сложная настройка
- ❌ Меньше community поддержки

### 4. Crunchy Data (Enterprise-grade)

**Преимущества:**
- ✅ Enterprise функции (audit, compliance)
- ✅ Отличная безопасность

**Недостатки:**
- ❌ Платная поддержка для production
- ❌ Сложнее, чем нужно для большинства случаев

---

## Рекомендация: Bitnami PostgreSQL для начала

Почему Bitnami:
1. **Простота** - легко начать, понятная конфигурация
2. **Надежность** - проверен миллионами установок
3. **Достаточно функций** - репликация, бэкапы, метрики
4. **Легко мигрировать** на CloudNativePG позже, если нужны advanced features

---

## План реализации

- [ ] Объяснить проблему GITHUB_TOKEN
- [ ] Создать Terraform конфигурацию для PostgreSQL (Bitnami)
- [ ] Добавить в cluster-bootstrap модуль
- [ ] Настроить persistence (PVC)
- [ ] Настроить credentials через Kubernetes Secret
- [ ] Создать отдельную БД для aims-core
- [ ] Обновить helm-aims-core для использования PostgreSQL
- [ ] Тестировать подключение

