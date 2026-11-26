import Link from "next/link";

type InfoStep = {
  title: string;
  description: string;
};

type InfoPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  sections: InfoStep[];
  actionLabel?: string;
  actionHref?: string;
};

export default function InfoPage({
  eyebrow,
  title,
  description,
  sections,
  actionLabel = "Explore services",
  actionHref = "/#category-results",
}: InfoPageProps) {
  return (
    <main className="infoPage">
      <div className="pageContainer">
        <Link href="/" className="breadcrumb">
          ← All services
        </Link>

        <header className="infoHero">
          <span className="infoEyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </header>

        <section className="infoGrid" aria-label={title}>
          {sections.map((section, index) => (
            <article className="infoCard" key={section.title}>
              <span className="infoStepNumber">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h2>{section.title}</h2>
              <p>{section.description}</p>
            </article>
          ))}
        </section>

        <Link href={actionHref} className="primaryButton">
          {actionLabel}
        </Link>
      </div>
    </main>
  );
}
