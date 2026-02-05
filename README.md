# AIMSGO Platform Documentation

Welcome to the AIMSGO platform documentation. This repository contains comprehensive documentation for deploying, configuring, and managing AIMSGO applications.

## 🚀 Live Site

The documentation is published at: https://africaone-dev.github.io/aimsgo-docs/

## 📖 About

AIMSGO is a multi-tenant education management platform that supports both single-container and multi-container deployment architectures.

**Projects:**
- **aims**: Multi-container application (Next.js frontend + Django backend)
- **aims-core**: Core multi-container application (Next.js frontend + Django backend)

## 🛠️ Local Development

This website is built using [Docusaurus 3](https://docusaurus.io/), a modern static website generator.

### Quick Setup

```bash
# Install dependencies
npm install

# Start development server (opens browser automatically)
npm start

# Build for production
npm run build
```

For detailed setup instructions, see [SETUP.md](./SETUP.md).

### Installation

```bash
npm install
```

### Local Development Server

```bash
npm start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

### Build

```bash
npm run build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

### Test Production Build Locally

```bash
npm run serve
```

## 📝 Contributing

1. Edit documentation in the `docs/` directory
2. Test locally with `npm start`
3. Commit and push to main branch
4. GitHub Actions will automatically build and deploy to GitHub Pages

## 📁 Documentation Structure

- **[helm/](./docs/helm/)**: Helm chart documentation and guides
- **[ci-cd/](./docs/ci-cd/)**: CI/CD workflows and automation
- **[argocd/](./docs/argocd/)**: ArgoCD setup and application management
- **[deployment/](./docs/deployment/)**: Deployment guides and procedures

## 🔄 Deployment

Documentation is automatically deployed to GitHub Pages when changes are pushed to the `main` or `master` branch.

The deployment workflow:
1. GitHub Actions triggers on push
2. Builds the Docusaurus site
3. Deploys to GitHub Pages

## 📄 License

Copyright © 2024-2026 AfricaOne

