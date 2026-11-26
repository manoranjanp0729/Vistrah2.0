import Link from "next/link";
import { civilCategories } from "../../data/civil";

export default function CivilConstructionPage() {
  return (
    <main className="civilPage">
      <section className="civilHero">
        <div>
          <span className="civilEyebrow">VISTRAH CIVIL MARKETPLACE</span>
          <h1>Civil &amp; Construction</h1>
          <p>
            Find construction services, professional support, contractors,
            materials, tenders and specialized outdoor solutions.
          </p>
        </div>
      </section>

      <section className="civilCategorySection">
        <div className="civilSectionHeading">
          <h2>Explore Civil &amp; Construction Services</h2>
          <p>Choose a category to explore available VISTRAH services.</p>
        </div>

        <div className="civilCategoryGrid">
          {civilCategories.map((category) => {
            const available = category.status === "Available";

            return (
              <div
                key={category.slug}
                className={`civilCategoryCard ${
                  available ? "isAvailable" : "isComingSoon"
                }`}
              >
                <div className="civilCardTop">
                  <span className="civilStatus">
                    {available ? "Available" : "Coming soon"}
                  </span>
                </div>

                <div className="civilCategoryImage">
          <img
            src={category.image}
            alt={category.title}
            loading="lazy"
          />
        </div>
        <h3>{category.title}</h3>
                <p>{category.description}</p>

                {available ? (
                  <Link
                    href={`/service/civil-construction/${category.slug}`}
                    className="civilExploreButton"
                  >
                    Explore →
                  </Link>
                ) : (
                  <span className="civilDisabledButton">
                    Coming soon
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

