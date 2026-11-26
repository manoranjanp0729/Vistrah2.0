import Link from "next/link";
import { retractableRoofingCompanies } from "../../../../../data/civil";

export default function RetractableRoofingCompaniesPage() {
  return (
    <main className="companyDirectoryPage">
      <section className="companyDirectoryHeader">
        <Link
          href="/service/civil-construction/outdoor-lifestyle-design/retractable-roofing"
          className="backLink"
        >
          ← Retractable Roofing
        </Link>

        <span className="civilEyebrow">
          COMPANY DIRECTORY
        </span>

        <h1>Companies offering Retractable Roofing</h1>

        <p>
          Explore available providers and their solutions.
        </p>
      </section>

      <section className="civilCategorySection">
        <div className="civilCategoryGrid">
          {retractableRoofingCompanies.map((company) => (
            <Link
              key={company.slug}
              href={`/service/civil-construction/outdoor-lifestyle-design/retractable-roofing/companies/${company.slug}`}
              className="civilCategoryCard isAvailable"
            >
              <span className="civilStatus">Provider</span>
              <h2>{company.name}</h2>
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

