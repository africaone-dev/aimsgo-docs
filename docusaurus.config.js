// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'AIMS Platform',
  tagline: 'Pan-African School Management — DevOps Documentation',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://africaone-dev.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/aimsgo-docs/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'africaone-dev', // Usually your GitHub org/user name.
  projectName: 'aimsgo-docs', // Usually your repo name.

  onBrokenLinks: 'warn',

  // Markdown configuration
  markdown: {
    mermaid: true,
  },

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/africaone-dev/aimsgo-docs/edit/main/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: 'img/docusaurus-social-card.jpg',
      navbar: {
        title: 'AIMS Platform',
        logo: {
          alt: 'AIMS Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Documentation',
          },
          {
            href: 'https://github.com/africaone-dev/aimsgo-docs',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Documentation',
            items: [
              {
                label: 'Quick Start',
                to: '/docs/deployment/quick-start',
              },
              {
                label: 'Tenant Management',
                to: '/docs/tenants/tenant-management',
              },
              {
                label: 'Helm Charts',
                to: '/docs/helm/overview',
              },
            ],
          },
          {
            title: 'Resources',
            items: [
              {
                label: 'ArgoCD',
                href: 'https://argo-cd.readthedocs.io/',
              },
              {
                label: 'Helm',
                href: 'https://helm.sh/docs/',
              },
              {
                label: 'Kubernetes',
                href: 'https://kubernetes.io/docs/',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/africaone-dev',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} AfricaOne. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['bash', 'yaml', 'hcl', 'json'],
      },
    }),
};

export default config;
