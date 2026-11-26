"use client";

import Link from "next/link";
import { getMarketingSubcategory } from "../../data/marketing";

export default function MarketingLandingPage() {
  const categories = [
    "digital-marketing",
    "outdoor-advertising",
    "led-digital-displays",
    "signage-branding",
    "print-advertising",
    "events-promotions",
    "media-advertising",
    "marketing-consultation",
  ]
    .map((slug) => getMarketingSubcategory(slug))
    .filter(Boolean);

  return (
    <div className="vLandingPage">

      <section className="vLandingHero">
        <div className="vLandingHeroText">
          <Link href="/" className="vBackLink">← All services</Link>

          <span className="vLandingEyebrow">
            MARKETING
          </span>

          <h1>Grow your brand with the right marketing services.</h1>

          <p>
            Digital marketing, advertising, branding, displays, events
            and promotional services managed through one platform.
          </p>
        </div>
      </section>

      <section className="vLandingSection">
        <div className="vLandingSectionHead">
          <div>
            <span className="vLandingEyebrow">MARKETING SERVICES</span>
            <h2>Choose what you need</h2>
          </div>
          <span className="vLandingCount">
            {categories.length} categories
          </span>
        </div>

        <div className="vLandingGrid">
          {categories.map((category) => category && (
            <Link
              key={category.slug}
              href={`/service/marketing/${category.slug}`}
              className="vLandingCard"
            >
              <div className="vLandingCardImage">
                <img
                  src={category.image || "/images/photos/marketing/digital-marketing.jpg"}
                  alt={category.name}
                  onError={(event) => {
                    event.currentTarget.src =
                      "/images/photos/marketing/digital-marketing.jpg";
                  }}
                />
              </div>

              <div className="vLandingCardBody">
                <div className="vLandingCardTop">
                  <h3>{category.name}</h3>
                </div>

                <p>{category.description}</p>

                <span className="vLandingCardLink">
                  View services →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}
