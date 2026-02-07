import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

const features = [
  {
    title: 'Multi-Tenant GitOps',
    emoji: '🏫',
    description: 'Each school gets an isolated namespace with its own frontend, backend, and database. Managed entirely through Git.',
  },
  {
    title: 'Automated CI/CD',
    emoji: '🔄',
    description: 'Unified workflow builds Docker images, bumps versions, and triggers ArgoCD deployment. Old images cleaned up automatically.',
  },
  {
    title: 'One-Click Tenants',
    emoji: '🚀',
    description: 'Create or delete a tenant via GitHub Actions workflow. Database, secrets, and DNS configured automatically.',
  },
  {
    title: 'Helm + ArgoCD',
    emoji: '⎈',
    description: 'Two Helm charts (aims-core + tenant template) with ApplicationSet auto-discovery. Self-healing and auto-sync enabled.',
  },
  {
    title: 'PostgreSQL (PGO)',
    emoji: '🐘',
    description: 'Crunchy PGO operator manages PostgreSQL with pgBouncer connection pooling. Per-tenant databases with automated migrations.',
  },
  {
    title: 'Secrets via Reflector',
    emoji: '🔐',
    description: 'GHCR registry credentials replicated to all namespaces automatically. App secrets managed via Kubernetes Secrets.',
  },
];

function Feature({title, emoji, description}) {
  return (
    <div className={clsx('col col--4', styles.featureCol)}>
      <div className={styles.featureCard}>
        <div className={styles.featureEmoji}>{emoji}</div>
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={styles.heroBanner}>
      <div className="container">
        <Heading as="h1" className={styles.heroTitle}>
          {siteConfig.title}
        </Heading>
        <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link className="button button--primary button--lg" to="/docs/intro">
            Get Started
          </Link>
          <Link className="button button--outline button--lg" to="/docs/tenants/tenant-management">
            Tenant Management
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description="AIMS Platform — DevOps Documentation">
      <HomepageHeader />
      <main>
        <section className={styles.features}>
          <div className="container">
            <div className="row">
              {features.map((props, idx) => (
                <Feature key={idx} {...props} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
