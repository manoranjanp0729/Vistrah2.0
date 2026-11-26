import Link from "next/link";
import { outdoorLifestyleServices } from "../../../data/civil";

export default function OutdoorLifestylePage() {
  return (
    <main className="outdoorPage">
      <section className="outdoorHero">
        <div>
          <Link
            href="/service/civil-construction"
            className="backLink"
          >
            ← Civil &amp; Construction
          </Link>

          <span className="civilEyebrow">
            OUTDOOR &amp; LIFESTYLE DESIGN
          </span>

          <h1>Outdoor &amp; Lifestyle Design</h1>

          <p>
            Explore specialized solutions for premium outdoor spaces,
            terraces, patios, gardens and lifestyle areas.
          </p>
        </div>
      </section>

      <section className="civilCategorySection">
        <div className="civilSectionHeading">
          <h2>Services</h2>
          <p>Select a service to explore available solutions.</p>
        </div>

        <div className="civilCategoryGrid">
          {outdoorLifestyleServices.map((service) => (
            <Link
              key={service.slug}
              href={`/service/civil-construction/outdoor-lifestyle-design/${service.slug}`}
              className="civilCategoryCard isAvailable"
            >
              <span className="civilStatus">Available</span>
              <div className="civilCategoryImage">
          <img
            src={service.image}
            alt={service.title}
            loading="lazy"
          />
        </div>
        <h3>{service.title}</h3>
              <p>{service.description}</p>
              <span className="civilExploreButton">
                Explore →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

