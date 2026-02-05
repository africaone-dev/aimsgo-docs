# GitHub Pages Setup Instructions

This document explains how to configure GitHub Pages for the aimsgo-docs repository.

## Prerequisites

- Repository: `africaone-dev/aimsgo-docs`
- GitHub Actions workflow is already configured in `.github/workflows/deploy.yml`
- Node.js and npm are configured in the workflow

## Configuration Steps

### 1. Enable GitHub Pages

1. Go to your repository: https://github.com/africaone-dev/aimsgo-docs
2. Navigate to **Settings** → **Pages**
3. Under **Build and deployment**:
   - **Source**: Select "GitHub Actions"
4. Click **Save**

### 2. Update Repository Permissions

Ensure GitHub Actions has the necessary permissions:

1. Go to **Settings** → **Actions** → **General**
2. Scroll to **Workflow permissions**
3. Select **Read and write permissions**
4. Check **Allow GitHub Actions to create and approve pull requests**
5. Click **Save**

### 3. Trigger First Deployment

Option A: Push to main branch
```bash
git add .
git commit -m "Setup Docusaurus and GitHub Pages"
git push origin main
```

Option B: Manually trigger workflow
1. Go to **Actions** tab
2. Select "Deploy Docusaurus to GitHub Pages" workflow
3. Click **Run workflow**
4. Select branch: `main`
5. Click **Run workflow**

### 4. Verify Deployment

1. Go to **Actions** tab
2. Watch the workflow run
3. Once completed (green checkmark), the site should be live at:
   - https://africaone-dev.github.io/aimsgo-docs/

### 5. Configure Custom Domain (Optional)

If you want to use a custom domain:

1. Go to **Settings** → **Pages**
2. Under **Custom domain**, enter: `docs.aimsgo.com`
3. Click **Save**
4. Add a CNAME record in your DNS:
   ```
   docs.aimsgo.com CNAME africaone-dev.github.io
   ```
5. Wait for DNS propagation
6. Check **Enforce HTTPS**

## Workflow Details

The deployment workflow (`.github/workflows/deploy.yml`) does the following:

1. **Build Job**:
   - Checks out the code
   - Sets up Node.js 20
   - Installs dependencies with `npm ci`
   - Builds the Docusaurus site with `npm run build`
   - Uploads the build artifact

2. **Deploy Job**:
   - Deploys the artifact to GitHub Pages
   - Runs after the build job succeeds

## Automatic Deployments

Every push to `main` or `master` branch will trigger an automatic deployment:

```bash
# Make changes to documentation
vim docs/deployment/quick-start.md

# Commit and push
git add docs/deployment/quick-start.md
git commit -m "Update quick start guide"
git push origin main

# GitHub Actions will automatically build and deploy
```

## Testing Before Deployment

Always test locally before pushing:

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build production version
npm run build

# Test production build
npm run serve
```

## Troubleshooting

### Workflow Fails with Permission Error

**Problem**: "Permission denied" or "403 Forbidden" errors

**Solution**:
1. Go to **Settings** → **Actions** → **General**
2. Under **Workflow permissions**, select **Read and write permissions**
3. Save and re-run the workflow

### Site Shows 404 Error

**Problem**: Site is deployed but shows 404

**Solution**:
1. Check the `baseUrl` in `docusaurus.config.js`:
   ```javascript
   baseUrl: '/aimsgo-docs/',  // Must match repository name
   ```
2. Verify the repository name is correct
3. Wait a few minutes for GitHub Pages to propagate

### Workflow Fails at Build Step

**Problem**: Build fails with module errors

**Solution**:
1. Delete `node_modules` and `package-lock.json`
2. Run `npm install` locally
3. Test with `npm run build`
4. Commit the updated `package-lock.json`

### Old Content Still Showing

**Problem**: Changes deployed but old content shows

**Solution**:
1. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
2. Check the Actions tab to ensure deployment completed
3. Wait a few minutes for CDN to update

## Monitoring

### Check Deployment Status

```bash
# View recent deployments
gh run list --workflow=deploy.yml

# View specific deployment
gh run view <run-id>

# View deployment logs
gh run view <run-id> --log
```

### GitHub Actions Badge

Add this badge to your README to show deployment status:

```markdown
[![Deploy](https://github.com/africaone-dev/aimsgo-docs/actions/workflows/deploy.yml/badge.svg)](https://github.com/africaone-dev/aimsgo-docs/actions/workflows/deploy.yml)
```

## Branch Protection (Recommended)

Protect the main branch to prevent accidental force pushes:

1. Go to **Settings** → **Branches**
2. Click **Add rule**
3. Branch name pattern: `main`
4. Check:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
5. Save changes

## Additional Resources

- [Docusaurus Deployment Guide](https://docusaurus.io/docs/deployment)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
