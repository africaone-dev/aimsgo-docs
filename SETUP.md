# First-Time Setup Guide

This guide will help you get the Docusaurus documentation site running for the first time.

## Step 1: Install Dependencies

```bash
cd /Users/dmitriimashkov/PycharmProjects/africaone-dev/aimsgo-docs

# Install all npm packages
npm install
```

This will install:
- Docusaurus 3.1.0
- React 18.2.0
- All necessary plugins and dependencies

## Step 2: Test Locally

Start the development server:

```bash
npm start
```

This will:
- Start a local web server at http://localhost:3000
- Open your browser automatically
- Enable hot reloading (changes appear immediately)

You should see the AIMSGO Platform documentation homepage.

## Step 3: Build for Production

Test the production build:

```bash
# Build the static site
npm run build

# Serve the production build locally
npm run serve
```

The production build will be in the `build/` directory.

## Step 4: Commit and Push

If everything looks good, commit the changes:

```bash
# Check status
git status

# Add all new files
git add .

# Commit
git commit -m "Add Docusaurus documentation site with GitHub Pages deployment"

# Push to GitHub
git push origin main
```

## Step 5: Enable GitHub Pages

Follow the instructions in [GITHUB_PAGES_SETUP.md](./GITHUB_PAGES_SETUP.md) to:

1. Enable GitHub Pages in repository settings
2. Configure GitHub Actions permissions
3. Wait for the automatic deployment

## Verification

After deployment (takes ~3-5 minutes), your site will be live at:

🌐 https://africaone-dev.github.io/aimsgo-docs/

## File Structure

```
aimsgo-docs/
├── .github/
│   └── workflows/
│       └── deploy.yml           # GitHub Actions workflow for deployment
├── docs/                        # Documentation markdown files
│   ├── intro.md                 # Introduction page
│   ├── deployment/
│   │   └── quick-start.md
│   ├── helm/
│   │   ├── overview.md
│   │   └── multi-container-setup.md
│   ├── argocd/
│   │   ├── setup.md
│   │   └── aims-core-application.md
│   └── ci-cd/
│       └── workflows.md
├── src/
│   ├── css/
│   │   └── custom.css           # Custom styles
│   └── pages/
│       ├── index.js             # Homepage
│       └── index.module.css
├── static/
│   └── img/
│       ├── logo.svg             # Site logo
│       └── favicon.ico          # Favicon
├── docusaurus.config.js         # Docusaurus configuration
├── sidebars.js                  # Sidebar navigation structure
├── package.json                 # Node.js dependencies
├── README.md                    # Project README
└── GITHUB_PAGES_SETUP.md        # GitHub Pages setup instructions
```

## Common Commands

```bash
# Start development server
npm start

# Build for production
npm run build

# Serve production build locally
npm run serve

# Clear cache and build
npm run clear && npm run build

# Generate TypeScript types
npm run write-translations

# Check for broken links
npm run build -- --no-minify
```

## Editing Documentation

### Add a New Page

1. Create a new markdown file in `docs/`:
   ```bash
   touch docs/my-category/my-page.md
   ```

2. Add frontmatter:
   ```markdown
   ---
   sidebar_position: 1
   title: My Page Title
   ---

   # My Page Content
   ```

3. The page will automatically appear in the sidebar

### Edit Existing Pages

Just edit the markdown files in `docs/` and save. The dev server will hot-reload.

### Update Sidebar

Edit `sidebars.js` to change the sidebar structure:

```javascript
const sidebars = {
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'My Category',
      items: [
        'my-category/page-1',
        'my-category/page-2',
      ],
    },
  ],
};
```

### Customize Homepage

Edit `src/pages/index.js` to customize the homepage.

### Change Colors/Theme

Edit `src/css/custom.css` to change colors and styling.

## Troubleshooting

### Port 3000 Already in Use

```bash
# Use a different port
npm start -- --port 3001
```

### Module Not Found

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Build Fails

```bash
# Clear Docusaurus cache
npm run clear

# Try building again
npm run build
```

## Next Steps

1. ✅ Install dependencies
2. ✅ Test locally
3. ✅ Build for production
4. ✅ Commit and push
5. ✅ Enable GitHub Pages
6. 📝 Start editing documentation!

## Support

- [Docusaurus Documentation](https://docusaurus.io/docs)
- [React Documentation](https://react.dev/)
- [Markdown Guide](https://www.markdownguide.org/)
