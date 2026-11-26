"use client";

import Link from "next/link";
import { civilCategories } from "../../data/civil";

export default function CivilConstructionPage() {
  return (
    <div className="vLandingPage">

      <section className="vLandingHero">
        <div className="vLandingHeroText">
          <Link href="/" className="vBackLink">← All services</Link>

          <span className="vLandingEyebrow">
            CIVIL & CONSTRUCTION
          </span>

          <h1>Build, manage and execute with VISTRAH.</h1>

          <p>
            From planning and estimation to construction, tenders,
            inspections and execution, VISTRAH helps manage your
            construction requirements through one platform.
          </p>
        </div>
      </section>

      <section className="vLandingSection">
        <div className="vLandingSectionHead">
          <div>
            <span className="vLandingEyebrow">SERVICES</span>
            <h2>What do you need help with?</h2>
          </div>
          <span className="vLandingCount">
            {civilCategories.length} services
          </span>
        </div>

        <div className="vLandingGrid">
          {civilCategories.map((category) => (
            <Link
              key={category.slug}
              href={`/service/civil-construction/${category.slug}`}
              className="vLandingCard"
            >
              <div className="vLandingCardImage">
                <img
                  src={category.image}
                  alt={category.title}
                  onError={(event) => {
                    event.currentTarget.src =
                      "/images/photos/civil/residential-construction.jpg";
                  }}
                />
              </div>

              <div className="vLandingCardBody">
                <div className="vLandingCardTop">
                  <h3>{category.title}</h3>

                  <span
                    className={
                      category.status === "Available"
                        ? "vStatus vStatusAvailable"
                        : "vStatus"
                    }
                  >
                    {category.status}
                  </span>
                </div>

                <p>{category.description}</p>

                <span className="vLandingCardLink">
                  Explore service →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}
