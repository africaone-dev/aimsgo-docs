# Hetzner Object Storage — operational notes

## Buckets

- **`aims`** — tenant document exports, served to browsers from `https://aimsgo.com` and `https://*.aimsgo.com`.

Buckets are created manually in the Hetzner Console (not codified in Terraform). Credentials are stored in the cluster as `object-storage-credentials` in the `database` namespace and reflected to every tenant namespace via Emberstack Reflector.

## Applying the CORS rule

The CORS rule for the `aims` bucket is committed at [`aims-cors.json`](./aims-cors.json). Apply or re-apply with:

```bash
export AWS_ACCESS_KEY_ID=$(kubectl get secret object-storage-credentials -n database -o jsonpath='{.data.access-key-id}' | base64 -d)
export AWS_SECRET_ACCESS_KEY=$(kubectl get secret object-storage-credentials -n database -o jsonpath='{.data.secret-access-key}' | base64 -d)

aws s3api put-bucket-cors \
  --bucket aims \
  --cors-configuration file://aims-cors.json \
  --endpoint-url https://fsn1.your-objectstorage.com
```

Verify:

```bash
aws s3api get-bucket-cors \
  --bucket aims \
  --endpoint-url https://fsn1.your-objectstorage.com
```

The operation is idempotent — re-running replaces the CORS configuration with the file contents.
