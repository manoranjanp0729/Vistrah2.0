"use client";

import { useParams, useRouter } from "next/navigation";

type ServiceCard = {
  title: string;
  description: string;
  image: string;
  slug: string;
};

type CategoryData = {
  title: string;
  eyebrow: string;
  description: string;
  heroImage: string;
  services: ServiceCard[];
};

const categories: Record<string, CategoryData> = {
  "jobs-careers": {
    title: "Jobs & Careers",
    eyebrow: "CAREER SUPPORT",
    description:
      "Get professional support for resumes, job applications, interviews and career growth.",
    heroImage:
      "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1400&q=85",
    services: [
      {
        title: "Resume Building",
        slug: "resume-building",
        description:
          "Create a professional resume designed for better opportunities.",
        image:
          "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Job Application Assistance",
        slug: "job-application-assistance",
        description:
          "Get help finding and applying for suitable job opportunities.",
        image:
          "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "LinkedIn Profile",
        slug: "linkedin-profile",
        description:
          "Build a professional LinkedIn profile that attracts recruiters.",
        image:
          "https://images.unsplash.com/photo-1611944212129-29977ae1398c?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Interview Preparation",
        slug: "interview-preparation",
        description:
          "Prepare for interviews with structured guidance and practice.",
        image:
          "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Career Consultation",
        slug: "career-consultation",
        description:
          "Get guidance on career direction, skills and opportunities.",
        image:
          "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Job Search Assistance",
        slug: "job-search-assistance",
        description:
          "Get assistance identifying relevant job opportunities.",
        image:
          "https://images.unsplash.com/photo-1521791055366-0d553872125f?auto=format&fit=crop&w=900&q=85",
      },
    ],
  },

  "real-estate": {
    title: "Real Estate",
    eyebrow: "PROPERTY SERVICES",
    description:
      "Get assistance with property search, verification, valuation, buying, selling and rentals.",
    heroImage:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=85",
    services: [
      {
        title: "Property Search",
        slug: "property-search",
        description:
          "Find properties matching your location, budget and requirements.",
        image:
          "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Property Verification",
        slug: "property-verification",
        description:
          "Get property documents and details reviewed before proceeding.",
        image:
          "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Property Valuation",
        slug: "property-valuation",
        description:
          "Understand the estimated market value of a property.",
        image:
          "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Buy Property",
        slug: "buy-property",
        description:
          "Get assistance throughout the property buying process.",
        image:
          "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Sell Property",
        slug: "sell-property",
        description:
          "Get assistance preparing and marketing your property for sale.",
        image:
          "https://images.unsplash.com/photo-1605146769289-440113cc3d00?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Rental Assistance",
        slug: "rental-assistance",
        description:
          "Find or manage suitable residential and commercial rentals.",
        image:
          "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=85",
      },
    ],
  },

  "civil-construction": {
    title: "Civil & Construction",
    eyebrow: "CONSTRUCTION SERVICES",
    description:
      "From planning and estimation to construction, tenders, contractors and inspections.",
    heroImage:
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1400&q=85",
    services: [
      {
        title: "Residential Construction",
        slug: "residential-construction",
        description:
          "Plan and execute residential construction projects.",
        image:
          "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Commercial Construction",
        slug: "commercial-construction",
        description:
          "Construction support for commercial and business properties.",
        image:
          "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Architecture & Design",
        slug: "architecture-design",
        description:
          "Get architectural planning and design support.",
        image:
          "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Civil Engineering",
        slug: "civil-engineering",
        description:
          "Professional civil engineering and project support.",
        image:
          "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Estimation & BOQ",
        slug: "estimation-boq",
        description:
          "Prepare construction estimates, quantities and BOQs.",
        image:
          "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Tenders",
        slug: "tenders",
        description:
          "Find, analyze and prepare documentation for construction tenders.",
        image:
          "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Contracts & Documentation",
        slug: "contracts-documentation",
        description:
          "Construction contracts and project documentation support.",
        image:
          "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Contractors & Subcontractors",
        slug: "contractors-subcontractors",
        description:
          "Connect with suitable construction professionals.",
        image:
          "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Inspection & Verification",
        slug: "inspection-verification",
        description:
          "Inspection and verification support for construction projects.",
        image:
          "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Equipment & Materials",
        slug: "equipment-materials",
        description:
          "Find construction equipment and material suppliers.",
        image:
          "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=900&q=85",
      },
    ],
  },

  "marketing": {
    title: "Marketing",
    eyebrow: "BUSINESS GROWTH",
    description:
      "Promote your business through digital marketing, outdoor advertising, LED displays, signage, print, media and campaigns.",
    heroImage:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1400&q=85",
    services: [
      {
        title: "Digital Marketing",
        slug: "digital-marketing",
        description:
          "Social media, Google Ads, SEO, content and online customer growth.",
        image:
          "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Outdoor Advertising",
        slug: "outdoor-advertising",
        description:
          "Hoardings, billboards, bus shelters, poles and transit advertising.",
        image:
          "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "LED & Digital Displays",
        slug: "led-digital-displays",
        description:
          "LED signage boards, video walls, digital displays and menu boards.",
        image:
          "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Signage & Branding",
        slug: "signage-branding",
        description:
          "Shop signs, ACP signage, 3D lettering, glow signs and corporate branding.",
        image:
          "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Print Advertising",
        slug: "print-advertising",
        description:
          "Brochures, flyers, posters, banners, business cards and promotional materials.",
        image:
          "https://images.unsplash.com/photo-1586953208448-b95a79798f07?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Events & Promotions",
        slug: "events-promotions",
        description:
          "Event branding, exhibitions, stalls, product promotions and campaigns.",
        image:
          "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Media Advertising",
        slug: "media-advertising",
        description:
          "Newspaper, magazine, radio, TV and cinema advertising campaigns.",
        image:
          "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Marketing Consultation",
        slug: "marketing-consultation",
        description:
          "Marketing strategy, brand strategy, campaign planning and market research.",
        image:
          "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=85",
      },
    ],
  },

  "tax-compliance": {
    title: "Tax & Compliance",
    eyebrow: "FINANCE & COMPLIANCE",
    description:
      "Get assistance with income tax, GST, registrations, TDS and business compliance.",
    heroImage:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1400&q=85",
    services: [
      {
        title: "Income Tax Return Filing",
        slug: "income-tax-return-filing",
        description:
          "Get assistance preparing and filing your income tax return.",
        image:
          "https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "GST Registration",
        slug: "gst-registration",
        description:
          "Get assistance with GST registration for your business.",
        image:
          "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "GST Filing",
        slug: "gst-filing",
        description:
          "Stay compliant with regular GST filing support.",
        image:
          "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Business Registration",
        slug: "business-registration",
        description:
          "Get help registering and structuring your business.",
        image:
          "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "TDS Compliance",
        slug: "tds-compliance",
        description:
          "Get assistance with TDS-related compliance requirements.",
        image:
          "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Tax Consultation",
        slug: "tax-consultation",
        description:
          "Get professional guidance for tax-related requirements.",
        image:
          "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=85",
      },
    ],
  },

  "it-technology": {
    title: "IT & Technology",
    eyebrow: "TECHNOLOGY SERVICES",
    description:
      "Build, deploy and maintain digital products, cloud infrastructure and technology systems.",
    heroImage:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=85",
    services: [
      {
        title: "Website Development",
        slug: "website-development",
        description:
          "Professional websites for businesses and organizations.",
        image:
          "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Mobile App Development",
        slug: "mobile-app-development",
        description:
          "Build mobile applications for Android and iOS.",
        image:
          "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Cloud Services",
        slug: "cloud-services",
        description:
          "Cloud infrastructure and deployment assistance.",
        image:
          "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "DevOps Services",
        slug: "devops-services",
        description:
          "CI/CD, cloud automation, containers and DevOps support.",
        image:
          "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "IT Support",
        slug: "it-support",
        description:
          "Technology troubleshooting and IT support services.",
        image:
          "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Software Consultation",
        slug: "software-consultation",
        description:
          "Get guidance on technology and software decisions.",
        image:
          "https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=900&q=85",
      },
    ],
  },

  "business-services": {
    title: "Business Services",
    eyebrow: "BUSINESS SUPPORT",
    description:
      "Get practical assistance with business setup, consulting, research, documentation and operations.",
    heroImage:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=85",
    services: [
      {
        title: "Business Setup",
        slug: "business-setup",
        description:
          "Get assistance setting up and organizing your business.",
        image:
          "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Business Consultation",
        slug: "business-consultation",
        description:
          "Get practical guidance for business decisions and growth.",
        image:
          "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Market Research",
        slug: "market-research",
        description:
          "Research markets, customers and competitors.",
        image:
          "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Documentation Services",
        slug: "documentation-services",
        description:
          "Professional business documentation assistance.",
        image:
          "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Vendor Assistance",
        slug: "vendor-assistance",
        description:
          "Find and coordinate with suitable vendors and suppliers.",
        image:
          "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Business Process Support",
        slug: "business-process-support",
        description:
          "Improve and organize day-to-day business processes.",
        image:
          "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=900&q=85",
      },
    ],
  },

  "local-professional-services": {
    title: "Local & Professional Services",
    eyebrow: "EVERYDAY SERVICES",
    description:
      "Find practical local services and professional assistance for your home and business.",
    heroImage:
      "https://images.unsplash.com/photo-1521791055366-0d553872125f?auto=format&fit=crop&w=1400&q=85",
    services: [
      {
        title: "Home Services",
        slug: "home-services",
        description:
          "Find trusted professionals for everyday home requirements.",
        image:
          "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "AC Service & Repair",
        slug: "ac-service-repair",
        description:
          "Professional AC maintenance and repair assistance.",
        image:
          "https://images.unsplash.com/photo-1631545806609-6eebf4b6d1d5?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Electrical Services",
        slug: "electrical-services",
        description:
          "Get assistance with electrical installation and repairs.",
        image:
          "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Plumbing Services",
        slug: "plumbing-services",
        description:
          "Professional plumbing repair and maintenance.",
        image:
          "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Pest Control",
        slug: "pest-control",
        description:
          "Safe and effective pest control solutions.",
        image:
          "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=85",
      },
      {
        title: "Professional Consultation",
        slug: "professional-consultation",
        description:
          "Connect with professionals for specific requirements.",
        image:
          "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=85",
      },
    ],
  },
};

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();

  const slug =
    typeof params?.slug === "string"
      ? params.slug
      : Array.isArray(params?.slug)
        ? params.slug[0]
        : "";

  const category = categories[slug];

  if (!category) {
    return (
      <main className="categoryPage">
        <header className="mainHeader">
          <div className="headerInner">
            <button
              className="brand"
              onClick={() => router.push("/")}
            >
              VISTRAH
            </button>
          </div>
        </header>

        <div className="notFound">
          <span>PAGE NOT FOUND</span>
          <h1>Service category not found.</h1>
          <p>
            The category you are looking for does not exist.
          </p>

          <button onClick={() => router.push("/")}>
            Back to Services
          </button>
        </div>
      </main>
    );
  }

  const handleServiceClick = (service: ServiceCard) => {
    router.push(`/service/${slug}/${service.slug}`);
  };

  return (
    <main className="categoryPage">

      {/* HEADER */}

      <header className="mainHeader">
        <div className="headerInner">

          <button
            className="mobileMenuButton"
            onClick={() => router.push("/")}
          >
            ←
          </button>

          <button
            className="brand"
            onClick={() => router.push("/")}
          >
            VISTRAH
          </button>

          <nav className="desktopNav">

            <button onClick={() => router.push("/")}>
              Services
            </button>

            <button
              onClick={() =>
                router.push("/#how-it-works")
              }
            >
              How it works
            </button>

            <button>
              For Business
            </button>

            <button>
              About
            </button>

          </nav>

          <div className="headerActions">

            <button className="locationButton">
              <span>⌖</span>
              Bengaluru, Karnataka
              <span>⌄</span>
            </button>

            <div className="headerSearch">
              <span>⌕</span>

              <input
                placeholder="Search for any service..."
              />
            </div>

            <button className="headerIcon">
              🛒
            </button>

            <button className="headerIcon">
              🔔
            </button>

            <button className="profileButton">
              ◉
            </button>

          </div>

        </div>
      </header>


      {/* MAIN */}

      <div className="categoryContent">

        {/* HERO */}

        <section className="categoryHero">

          <div className="categoryHeroContent">

            <span className="heroEyebrow">
              {category.eyebrow}
            </span>

            <h1>
              {category.title}
            </h1>

            <p>
              {category.description}
            </p>

            <div className="heroActions">

              <button
                className="primaryButton"
                onClick={() =>
                  document
                    .getElementById("services")
                    ?.scrollIntoView({
                      behavior: "smooth",
                    })
                }
              >
                Explore Services →
              </button>

              <button
                className="secondaryButton"
                onClick={() => router.push("/")}
              >
                ← All Categories
              </button>

            </div>

          </div>

          <div className="categoryHeroImage">

            <img
              src={category.heroImage}
              alt={category.title}
            />

          </div>

        </section>


        {/* SERVICES */}

        <section
          className="servicesSection"
          id="services"
        >

          <div className="sectionHeading">

            <div>
              <span>
                EXPLORE
              </span>

              <h2>
                {category.title} Services
              </h2>

              <p>
                Choose the service that matches your requirement.
              </p>
            </div>

            <button
              onClick={() => router.push("/")}
            >
              All Categories →
            </button>

          </div>


          <div className="serviceGrid">

            {category.services.map((service) => (

              <button
                key={service.slug}
                className="serviceCard"
                onClick={() =>
                  handleServiceClick(service)
                }
              >

                <div className="serviceImage">

                  <img
                    src={service.image}
                    alt={service.title}
                  />

                </div>

                <div className="serviceInfo">

                  <div>

                    <h3>
                      {service.title}
                    </h3>

                    <p>
                      {service.description}
                    </p>

                  </div>

                  <span className="serviceArrow">
                    →
                  </span>

                </div>

              </button>

            ))}

          </div>

        </section>


        {/* WHY VISTRAH */}

        <section className="whySection">

          <div className="sectionHeading">

            <div>

              <span>
                WHY VISTRAH
              </span>

              <h2>
                One platform.
                <br />
                Less hassle.
              </h2>

            </div>

            <p>
              Instead of searching for different providers,
              comparing options and coordinating everything
              yourself, VISTRAH helps manage the process from
              one place.
            </p>

          </div>


          <div className="benefitGrid">

            <div className="benefitCard">
              <span>01</span>
              <h3>Simple process</h3>
              <p>
                Tell us what you need and submit your
                requirements in one place.
              </p>
            </div>

            <div className="benefitCard">
              <span>02</span>
              <h3>Managed service</h3>
              <p>
                Our team coordinates the work instead of
                making you manage every step.
              </p>
            </div>

            <div className="benefitCard">
              <span>03</span>
              <h3>Transparent progress</h3>
              <p>
                Track your application and receive updates
                as your work progresses.
              </p>
            </div>

            <div className="benefitCard">
              <span>04</span>
              <h3>One place</h3>
              <p>
                Keep your requirements, documents,
                payments and applications together.
              </p>
            </div>

          </div>

        </section>


        {/* HOW IT WORKS */}

        <section className="howSection">

          <div className="sectionHeading">

            <div>

              <span>
                HOW IT WORKS
              </span>

              <h2>
                From requirement
                <br />
                to completion.
              </h2>

            </div>

            <p>
              A simple and transparent process designed
              around your requirement.
            </p>

          </div>


          <div className="steps">

            {[
              [
                "01",
                "Choose a service",
                "Select the service that matches your requirement.",
              ],
              [
                "02",
                "Submit requirements",
                "Tell us what you need and provide the required details.",
              ],
              [
                "03",
                "Confirm & pay",
                "Review the work details and make a secure payment.",
              ],
              [
                "04",
                "We start working",
                "Our team starts processing and coordinating your request.",
              ],
              [
                "05",
                "Track your application",
                "Follow progress and receive updates until completion.",
              ],
            ].map(
              ([number, title, description]) => (

                <div
                  className="step"
                  key={number}
                >

                  <span className="stepNumber">
                    {number}
                  </span>

                  <div>

                    <h3>
                      {title}
                    </h3>

                    <p>
                      {description}
                    </p>

                  </div>

                </div>

              )
            )}

          </div>

        </section>

      </div>


      <style jsx>{`

        .categoryPage {
          min-height: 100vh;
          background: #ffffff;
          color: #17211c;
        }

        .mainHeader {
          height: 72px;
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(255,255,255,.96);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid #e6e9e7;
        }

        .headerInner {
          max-width: 1470px;
          height: 100%;
          margin: 0 auto;
          padding: 0 30px;
          display: flex;
          align-items: center;
          gap: 30px;
        }

        .brand {
          border: 0;
          background: transparent;
          color: #073b27;
          font-size: 25px;
          font-weight: 900;
          letter-spacing: .14em;
          cursor: pointer;
          white-space: nowrap;
        }

        .desktopNav {
          display: flex;
          align-items: center;
          gap: 27px;
          flex: 1;
        }

        .desktopNav button,
        .headerActions button {
          border: 0;
          background: transparent;
          cursor: pointer;
          color: #29342e;
        }

        .desktopNav button {
          font-size: 14px;
          font-weight: 600;
        }

        .headerActions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .locationButton {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
        }

        .headerSearch {
          width: 290px;
          height: 46px;
          border: 1px solid #e1e4e2;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 13px;
          background: #fff;
        }

        .headerSearch input {
          width: 100%;
          border: 0;
          outline: 0;
          font-size: 13px;
          background: transparent;
        }

        .headerIcon {
          width: 38px;
          height: 38px;
          border-radius: 10px !important;
          background: #f5f7f5 !important;
        }

        .profileButton {
          width: 38px;
          height: 38px;
          border-radius: 50% !important;
          background: #073b27 !important;
          color: white !important;
        }

        .mobileMenuButton {
          display: none;
          border: 0;
          background: transparent;
          font-size: 22px;
          cursor: pointer;
        }

        .categoryContent {
          max-width: 1470px;
          margin: 0 auto;
          padding: 18px 30px 80px;
        }

        .categoryHero {
          min-height: 390px;
          display: grid;
          grid-template-columns: 1.05fr .95fr;
          overflow: hidden;
          border-radius: 18px;
          background: linear-gradient(
            135deg,
            #edf7f1,
            #f7faf8
          );
          border: 1px solid #e2ebe5;
        }

        .categoryHeroContent {
          padding: 55px 55px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .heroEyebrow,
        .sectionHeading > div > span {
          color: #6d8176;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .16em;
        }

        .categoryHero h1 {
          margin: 12px 0 16px;
          color: #073b27;
          font-size: clamp(42px, 5vw, 68px);
          line-height: .98;
          letter-spacing: -.045em;
        }

        .categoryHero p {
          max-width: 650px;
          margin: 0;
          color: #5c6962;
          font-size: 17px;
          line-height: 1.65;
        }

        .heroActions {
          display: flex;
          gap: 12px;
          margin-top: 28px;
          flex-wrap: wrap;
        }

        .primaryButton,
        .secondaryButton {
          min-height: 46px;
          padding: 0 20px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 700;
          font-size: 14px;
        }

        .primaryButton {
          background: #073b27;
          color: white;
          border: 1px solid #073b27;
        }

        .secondaryButton {
          background: white;
          color: #073b27;
          border: 1px solid #d7dfda;
        }

        .categoryHeroImage {
          min-height: 390px;
          overflow: hidden;
        }

        .categoryHeroImage img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .servicesSection,
        .whySection,
        .howSection {
          padding-top: 72px;
        }

        .sectionHeading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 30px;
          margin-bottom: 28px;
        }

        .sectionHeading h2 {
          margin: 7px 0 0;
          font-size: 34px;
          line-height: 1.08;
          letter-spacing: -.035em;
          color: #16241c;
        }

        .sectionHeading p {
          max-width: 530px;
          margin: 0;
          color: #66736c;
          line-height: 1.6;
        }

        .sectionHeading > button {
          border: 0;
          background: transparent;
          color: #073b27;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
        }

        .serviceGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
        }

        .serviceCard {
          padding: 0;
          border: 1px solid #e4e8e5;
          border-radius: 15px;
          background: white;
          overflow: hidden;
          text-align: left;
          cursor: pointer;
          transition:
            transform .2s ease,
            box-shadow .2s ease,
            border-color .2s ease;
        }

        .serviceCard:hover {
          transform: translateY(-3px);
          border-color: #cbd8d0;
          box-shadow: 0 12px 30px rgba(7,59,39,.08);
        }

        .serviceImage {
          height: 185px;
          overflow: hidden;
          background: #eef2ef;
        }

        .serviceImage img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          transition: transform .25s ease;
        }

        .serviceCard:hover .serviceImage img {
          transform: scale(1.03);
        }

        .serviceInfo {
          min-height: 145px;
          padding: 18px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }

        .serviceInfo h3 {
          margin: 0 0 7px;
          color: #18231d;
          font-size: 17px;
          line-height: 1.25;
        }

        .serviceInfo p {
          margin: 0;
          color: #6c7771;
          font-size: 13px;
          line-height: 1.55;
        }

        .serviceArrow {
          flex-shrink: 0;
          color: #073b27;
          font-size: 20px;
          font-weight: 700;
        }

        .whySection {
          padding-bottom: 10px;
        }

        .benefitGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          border: 1px solid #e3e8e5;
          border-radius: 16px;
          overflow: hidden;
        }

        .benefitCard {
          min-height: 190px;
          padding: 25px;
          border-right: 1px solid #e3e8e5;
        }

        .benefitCard:last-child {
          border-right: 0;
        }

        .benefitCard > span {
          color: #7d9185;
          font-size: 12px;
          font-weight: 800;
        }

        .benefitCard h3 {
          margin: 25px 0 8px;
          color: #16241c;
          font-size: 17px;
        }

        .benefitCard p {
          margin: 0;
          color: #68756e;
          font-size: 13px;
          line-height: 1.6;
        }

        .steps {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          border: 1px solid #e3e8e5;
          border-radius: 16px;
          overflow: hidden;
        }

        .step {
          min-height: 175px;
          padding: 23px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          border-right: 1px solid #e3e8e5;
        }

        .step:last-child {
          border-right: 0;
        }

        .stepNumber {
          color: #073b27;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: .08em;
        }

        .step h3 {
          margin: 0 0 7px;
          font-size: 16px;
        }

        .step p {
          margin: 0;
          color: #6c7771;
          font-size: 13px;
          line-height: 1.55;
        }

        .notFound {
          max-width: 700px;
          margin: 100px auto;
          padding: 30px;
          text-align: center;
        }

        .notFound span {
          color: #6d8176;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .15em;
        }

        .notFound h1 {
          color: #073b27;
          margin: 12px 0;
        }

        .notFound p {
          color: #68756e;
        }

        .notFound button {
          margin-top: 20px;
          padding: 13px 20px;
          border: 0;
          border-radius: 10px;
          background: #073b27;
          color: white;
          font-weight: 700;
          cursor: pointer;
        }

        @media (max-width: 1150px) {

          .desktopNav {
            display: none;
          }

          .serviceGrid {
            grid-template-columns: repeat(3, 1fr);
          }

          .benefitGrid {
            grid-template-columns: repeat(2, 1fr);
          }

          .benefitCard:nth-child(2) {
            border-right: 0;
          }

          .benefitCard:nth-child(-n+2) {
            border-bottom: 1px solid #e3e8e5;
          }

          .steps {
            grid-template-columns: repeat(3, 1fr);
          }

          .step:nth-child(3) {
            border-right: 0;
          }

          .step:nth-child(-n+3) {
            border-bottom: 1px solid #e3e8e5;
          }

        }

        @media (max-width: 850px) {

          .headerActions {
            margin-left: auto;
          }

          .locationButton,
          .headerSearch {
            display: none;
          }

          .mobileMenuButton {
            display: block;
          }

          .categoryHero {
            grid-template-columns: 1fr;
          }

          .categoryHeroContent {
            padding: 40px 30px;
          }

          .categoryHeroImage {
            min-height: 280px;
          }

          .serviceGrid {
            grid-template-columns: repeat(2, 1fr);
          }

          .sectionHeading {
            align-items: flex-start;
            flex-direction: column;
          }

        }

        @media (max-width: 560px) {

          .headerInner {
            padding: 0 16px;
            gap: 14px;
          }

          .categoryContent {
            padding: 12px 16px 60px;
          }

          .categoryHeroContent {
            padding: 35px 22px;
          }

          .categoryHero h1 {
            font-size: 43px;
          }

          .categoryHero p {
            font-size: 15px;
          }

          .categoryHeroImage {
            min-height: 230px;
          }

          .serviceGrid {
            grid-template-columns: 1fr;
          }

          .benefitGrid {
            grid-template-columns: 1fr;
          }

          .benefitCard {
            border-right: 0;
            border-bottom: 1px solid #e3e8e5;
          }

          .benefitCard:last-child {
            border-bottom: 0;
          }

          .steps {
            grid-template-columns: 1fr;
          }

          .step {
            border-right: 0;
            border-bottom: 1px solid #e3e8e5;
          }

          .step:last-child {
            border-bottom: 0;
          }

        }

      `}</style>

    </main>
  );
}