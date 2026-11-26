import Link from "next/link";
import { rayshadeServices } from "../../../../../../data/civil";

export default function RayShadeCompanyPage() {
  return (
    <main className="companyPage">
      <section className="companyHero">
        <div className="companyHeroContent">
          <Link
            href="/service/civil-construction/outdoor-lifestyle-design/retractable-roofing/companies"
            className="backLink"
          >
            ← Company Directory
          </Link>

          <span className="civilEyebrow">
            RETRACTABLE ROOFING PROVIDER
          </span>

          <h1>RayShade Technologies</h1>

          <p>
            Explore retractable roofing and outdoor lifestyle solutions
            available through this company profile.
          </p>
        </div>
      </section>

      <section className="civilCategorySection">
        <div className="civilSectionHeading">
          <h2>Solutions</h2>
          <p>Explore the available solution categories.</p>
        </div>

        <div className="civilCategoryGrid">
          {rayshadeServices.map((service) => (
            <div
              key={service.slug}
              className="civilCategoryCard isAvailable"
            >
              <span className="civilStatus">Available</span>
              <h3>{service.title}</h3>
              <p>{service.description}</p>

              <span className="civilExploreButton">
                Explore →
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

