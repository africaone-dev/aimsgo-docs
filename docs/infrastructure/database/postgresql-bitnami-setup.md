# PostgreSQL Deployment Guide

## 1. Создайте terraform.tfvars с паролями

```bash
cd /Users/dmitriimashkov/PycharmProjects/africaone-dev/terraform-hcloud-kube-hetzner/aimsgo/cluster-bootstrap

# Создайте файл terraform.tfvars
cat > terraform.tfvars << 'EOF'
# PostgreSQL credentials
postgres_admin_password   = "CHANGE_ME_STRONG_PASSWORD_1"
postgres_aimsgo_password  = "CHANGE_ME_STRONG_PASSWORD_2"

# Existing ArgoCD credentials
argo_cd_private_key      = "your-existing-key"
github_client_id         = "your-existing-id"
github_client_secret     = "your-existing-secret"
EOF

# Защитите файл
chmod 600 terraform.tfvars
```

## 2. Примените PostgreSQL через Terraform (ИСПОЛЬЗУЙТЕ TARGETED PLAN)

```bash
# Из основной директории terraform
cd /Users/dmitriimashkov/PycharmProjects/africaone-dev/terraform-hcloud-kube-hetzner/aimsgo

# Вариант А: Targeted plan (БЫСТРО, БЕЗ GITHUB_TOKEN)
terraform plan -target=module.cluster-bootstrap.helm_release.postgresql
terraform apply -target=module.cluster-bootstrap.helm_release.postgresql

# Вариант Б: С GITHUB_TOKEN (если хотите full plan)
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxx
terraform plan
terraform apply
```

## 3. Проверьте PostgreSQL

```bash
# Получите пароль (если забыли)
export POSTGRES_PASSWORD=$(kubectl get secret --namespace database postgresql -o jsonpath="{.data.postgres-password}" | base64 -d)

# Подключитесь к PostgreSQL
kubectl run postgresql-client --rm --tty -i --restart='Never' \
  --namespace database \
  --image docker.io/bitnami/postgresql:16 \
  --env="PGPASSWORD=$POSTGRES_PASSWORD" \
  --command -- psql --host postgresql.database.svc.cluster.local -U postgres -d postgres

# Внутри psql:
\l                           # Список баз данных
\c aimsgo_core               # Подключиться к БД aimsgo_core
\dt                          # Список таблиц
```

## 4. Получите connection string для aims-core

```yaml
# Connection details для Kubernetes pods:
host: postgresql.database.svc.cluster.local
port: 5432
database: aimsgo_core
username: aimsgo
password: <из terraform.tfvars>
```

## 5. Обновите helm-aims-core для использования PostgreSQL

В `/Users/dmitriimashkov/PycharmProjects/africaone-dev/aimsgo-argocd-apps/helm-aims-core/values.yaml`:

```yaml
backend:
  enabled: true
  env:
    - name: DATABASE_HOST
      value: "postgresql.database.svc.cluster.local"
    - name: DATABASE_PORT
      value: "5432"
    - name: DATABASE_NAME
      value: "aimsgo_core"
    - name: DATABASE_USER
      value: "aimsgo"
    - name: DATABASE_PASSWORD
      valueFrom:
        secretKeyRef:
          name: postgresql
          key: password
```

## Обход зависаний Terraform - Краткая справка

### Почему зависает?
`kube-hetzner` модуль делает запросы к GitHub API для получения последних версий компонентов.
Без GITHUB_TOKEN лимит: **60 запросов/час** → медленно или зависает.

### Решения:

**1. Targeted Plan (БЕЗ токена, БЫСТРО):**
```bash
terraform plan -target=module.cluster-bootstrap
terraform apply -target=module.cluster-bootstrap.helm_release.postgresql
```

**2. С GITHUB_TOKEN (постоянное решение):**
```bash
# Создать токен: https://github.com/settings/tokens
# Scopes: public_repo

export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxx
terraform plan
```

**3. Добавить в ~/.zshrc (навсегда):**
```bash
echo 'export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxx' >> ~/.zshrc
source ~/.zshrc
```

## Troubleshooting

### PostgreSQL pod не запускается
```bash
kubectl get pods -n database
kubectl describe pod postgresql-0 -n database
kubectl logs postgresql-0 -n database
```

### Проблемы с PVC
```bash
kubectl get pvc -n database
kubectl describe pvc data-postgresql-0 -n database
```

### Сменить пароли
```bash
# Удалить secret и helm release пересоздаст с новыми паролями
kubectl delete secret postgresql -n database
terraform apply -target=module.cluster-bootstrap.helm_release.postgresql
```
