import Link from "next/link";
import { retractableRoofingCompanies } from "../../../../data/civil";

export default function RetractableRoofingPage() {
  return (
    <main className="retractablePage">
      <section className="retractableHero">
        <div>
          <Link
            href="/service/civil-construction/outdoor-lifestyle-design"
            className="backLink"
          >
            ← Outdoor &amp; Lifestyle Design
          </Link>

          <span className="civilEyebrow">
            RETRACTABLE ROOFING
          </span>

          <h1>Retractable Roofing</h1>

          <p>
            Explore companies offering retractable roofing solutions
            through VISTRAH.
          </p>
        </div>
      </section>

      <section className="civilCategorySection">
        <div className="civilSectionHeading">
          <h2>Companies</h2>
          <p>Explore available providers.</p>
        </div>

        <div className="civilCategoryGrid">
          {retractableRoofingCompanies.map((company) => (
            <Link
              key={company.slug}
              href={`/service/civil-construction/outdoor-lifestyle-design/retractable-roofing/companies/${company.slug}`}
              className="civilCategoryCard isAvailable"
            >
              <span className="civilStatus">Provider</span>
              <h3>{company.name}</h3>
              <p>{company.description}</p>
              <span className="civilExploreButton">
                View company →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

