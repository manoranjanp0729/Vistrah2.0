import Link from "next/link";
import PublicImage from "./PublicImage";
import styles from "./PublicPageTemplates.module.css";

export type PageCrumb = { label: string; href?: string };
export type PublicCard = {
  title: string;
  description: string;
  href?: string;
  image?: string;
  status?: string;
};

export function Breadcrumbs({ items }: { items: PageCrumb[] }) {
  return (
    <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
      <Link href="/">Home</Link>
      {items.map((item, index) => (
        <span className={styles.crumb} key={`${item.label}-${index}`}>
          <span aria-hidden="true">/</span>
          {item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function PublicPageFrame({
  crumbs,
  eyebrow,
  title,
  description,
  image,
  imageAlt,
  children,
  action,
}: {
  crumbs: PageCrumb[];
  eyebrow: string;
  title: string;
  description: string;
  image?: string;
  imageAlt?: string;
  children?: React.ReactNode;
  action?: { label: string; href: string };
}) {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Breadcrumbs items={crumbs} />
        <header className={`${styles.hero} ${image ? styles.heroWithImage : ""}`}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h1>{title}</h1>
            <p className={styles.description}>{description}</p>
            {action && <Link className={styles.button} href={action.href}>{action.label}</Link>}
          </div>
          {image && <div className={`${styles.heroImage} ${image.toLowerCase().endsWith(".svg") ? styles.containImage : ""}`}>
            <PublicImage src={image} alt={imageAlt || title} fill priority sizes="(max-width: 760px) 100vw, 42vw" />
          </div>}
        </header>
        {children}
      </div>
    </main>
  );
}

export function PublicSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return <section className={styles.section}>
    <div className={styles.sectionHeading}><h2>{title}</h2>{description && <p>{description}</p>}</div>
    {children}
  </section>;
}

export function PublicCardGrid({ cards }: { cards: PublicCard[] }) {
  return <div className={styles.grid}>
    {cards.map((card) => {
      const content = <>
        {card.image && <div className={`${styles.cardImage} ${card.image.toLowerCase().endsWith(".svg") ? styles.containImage : ""}`}><PublicImage src={card.image} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" /></div>}
        <div className={styles.cardBody}>
          {card.status && <span className={styles.status}>{card.status}</span>}
          <h3>{card.title}</h3><p>{card.description}</p>
          {card.href && <span className={styles.cardLink}>Explore <span aria-hidden="true">→</span></span>}
        </div>
      </>;
      return card.href
        ? <Link key={card.title} href={card.href} className={styles.card}>{content}</Link>
        : <article key={card.title} className={`${styles.card} ${styles.disabledCard}`}>{content}</article>;
    })}
  </div>;
}
