"use client"

import { useParams, useRouter } from "next/navigation"
import { getMarketingSubcategory } from "../../../data/marketing"

export default function MarketingSubcategoryPage() {
  const params = useParams()
  const router = useRouter()
  const subslug = String(params.subslug || "")
  const category = getMarketingSubcategory(subslug)

  if (!category) {
    return (
      <main style={{ padding: 40, fontFamily: "Arial" }}>
        <h1>Service category not found</h1>
        <button onClick={() => router.push("/service/marketing")}>
          Back to Marketing
        </button>
      </main>
    )
  }

  const categoryImage = category.image || "/images/photos/marketing/digital-marketing.jpg"
  const fallbackImage = "/images/photos/marketing/digital-marketing.jpg"

  return (
    <main className="marketingPage">
      <header className="marketingHeader">
        <button
          className="backButton"
          onClick={() => router.push("/service/marketing")}
        >
          ← Marketing
        </button>

        <div className="marketingBrand">VISTRAH</div>
      </header>

      {/* HERO */}
      <section className="subcategoryHero">
        <div className="heroContent">
          <div className="heroImage">
            <img
              src={categoryImage}
              alt={category.name}
              onError={(event) => {
                event.currentTarget.src = fallbackImage
              }}
            />
          </div>

          <div className="heroText">
            <div className="categoryIcon">{category.icon}</div>

            <p className="eyebrow">MARKETING</p>

            <h1>{category.name}</h1>

            <p className="heroDescription">
              {category.description}
            </p>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="servicesSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">SERVICES</p>
            <h2>What do you need?</h2>
          </div>

          <span>{category.services.length} services</span>
        </div>

        <div className="serviceGrid">
          {category.services.map((service) => (
            <button
              key={service.slug}
              className="serviceCard"
              onClick={() =>
                router.push(
                  `/service/marketing/${category.slug}/${service.slug}`
                )
              }
            >
              {/* SERVICE IMAGE */}
              <div className="serviceImage">
                <img
                  src={categoryImage}
                  alt={service.name}
                  onError={(event) => {
                    event.currentTarget.src = fallbackImage
                  }}
                />

                <div className="imageOverlay" />
              </div>

              {/* CARD CONTENT */}
              <div className="serviceCardContent">
                <div className="serviceArrow">↗</div>

                <h3>{service.name}</h3>

                <p>{service.description}</p>

                <span>Get started →</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <style jsx>{`
        .marketingPage {
          min-height: 100vh;
          background: #fff;
          color: #17352a;
          font-family: Arial, sans-serif;
        }

        /* HEADER */

        .marketingHeader {
          height: 72px;
          border-bottom: 1px solid #e7ebe8;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 30px;
          position: sticky;
          top: 0;
          z-index: 10;
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(12px);
        }

        .marketingBrand {
          font-size: 25px;
          font-weight: 900;
          letter-spacing: 0.14em;
          color: #073b27;
        }

        .backButton {
          border: 0;
          background: transparent;
          color: #164d37;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          padding: 8px 0;
        }

        .backButton:hover {
          color: #0b7a4b;
        }

        /* HERO */

        .subcategoryHero {
          max-width: 1470px;
          margin: 0 auto;
          padding: 50px 30px 30px;
        }

        .heroContent {
          min-height: 330px;
          border-radius: 24px;
          overflow: hidden;
          display: grid;
          grid-template-columns: 42% 58%;
          background: linear-gradient(
            135deg,
            #eff8f2,
            #f8fbf9
          );
          border: 1px solid #e0e9e3;
        }

        .heroImage {
          position: relative;
          min-height: 330px;
          overflow: hidden;
          background: #edf5ef;
        }

        .heroImage img {
          width: 100%;
          height: 100%;
          min-height: 330px;
          display: block;
          object-fit: cover;
        }

        .heroText {
          padding: 50px 55px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .categoryIcon {
          font-size: 38px;
          margin-bottom: 15px;
        }

        .eyebrow {
          margin: 0 0 10px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.16em;
          color: #688274;
        }

        h1 {
          margin: 0 0 16px;
          font-size: clamp(38px, 5vw, 60px);
          line-height: 1;
          letter-spacing: -0.04em;
          color: #17352a;
        }

        .heroDescription {
          margin: 0;
          max-width: 720px;
          font-size: 18px;
          line-height: 1.6;
          color: #617269;
        }

        /* SERVICES */

        .servicesSection {
          max-width: 1470px;
          margin: 0 auto;
          padding: 35px 30px 80px;
        }

        .sectionHeading {
          display: flex;
          align-items: end;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .sectionHeading h2 {
          margin: 0;
          font-size: 32px;
          letter-spacing: -0.03em;
        }

        .sectionHeading > span {
          color: #718078;
          font-size: 14px;
        }

        /* SERVICE GRID */

        .serviceGrid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .serviceCard {
          position: relative;
          overflow: hidden;
          min-height: 370px;
          padding: 0;
          text-align: left;
          border: 1px solid #e1e8e3;
          border-radius: 18px;
          background: #fff;
          cursor: pointer;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            border-color 0.2s ease;
        }

        .serviceCard:hover {
          transform: translateY(-5px);
          border-color: #9db8a8;
          box-shadow: 0 16px 35px rgba(30, 70, 50, 0.1);
        }

        /* CARD IMAGE */

        .serviceImage {
          position: relative;
          height: 175px;
          overflow: hidden;
          background: #edf5ef;
        }

        .serviceImage img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          transition: transform 0.35s ease;
        }

        .serviceCard:hover .serviceImage img {
          transform: scale(1.04);
        }

        .imageOverlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0),
            rgba(0, 0, 0, 0.08)
          );
          pointer-events: none;
        }

        /* CARD CONTENT */

        .serviceCardContent {
          position: relative;
          padding: 23px 25px 25px;
        }

        .serviceCard h3 {
          margin: 0 35px 10px 0;
          font-size: 21px;
          line-height: 1.25;
          color: #173b2c;
        }

        .serviceCard p {
          margin: 0 0 20px;
          color: #718078;
          line-height: 1.5;
          font-size: 15px;
        }

        .serviceCard span {
          font-size: 14px;
          font-weight: 800;
          color: #17613f;
        }

        .serviceArrow {
          position: absolute;
          top: 22px;
          right: 24px;
          font-size: 20px;
          color: #17613f;
        }

        /* TABLET */

        @media (max-width: 1000px) {
          .heroContent {
            grid-template-columns: 1fr;
          }

          .heroImage {
            min-height: 260px;
          }

          .heroImage img {
            min-height: 260px;
          }

          .heroText {
            padding: 35px;
          }

          .serviceGrid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        /* MOBILE */

        @media (max-width: 620px) {
          .marketingHeader {
            height: 64px;
            padding: 0 18px;
          }

          .marketingBrand {
            font-size: 20px;
          }

          .subcategoryHero {
            padding: 20px 18px 15px;
          }

          .heroContent {
            border-radius: 18px;
          }

          .heroImage {
            min-height: 210px;
          }

          .heroImage img {
            min-height: 210px;
          }

          .heroText {
            padding: 28px 24px 32px;
          }

          .categoryIcon {
            font-size: 32px;
          }

          h1 {
            font-size: 38px;
          }

          .heroDescription {
            font-size: 16px;
          }

          .servicesSection {
            padding: 25px 18px 60px;
          }

          .serviceGrid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .serviceCard {
            min-height: 350px;
          }

          .serviceImage {
            height: 185px;
          }

          .sectionHeading {
            align-items: start;
            flex-direction: column;
            gap: 8px;
          }

          .sectionHeading h2 {
            font-size: 28px;
          }
        }
      `}</style>
    </main>
  )
}