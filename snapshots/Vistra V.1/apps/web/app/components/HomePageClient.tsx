"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { serviceImages } from "../data/serviceImages";
import { additionalCategories, catalogueCategories } from "../../features/catalogue/data/categories";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  image?: string;
};

const localFallbackImage = serviceImages.placeholders.default;
type PopularService = { name: string; description?: string; base_price_paise?: number | null; slug: string; categorySlug: string; image?: string };

const categoryImages: Record<string, string> = {
  "jobs-careers": serviceImages.categories.jobsCareers,
  "real-estate": serviceImages.categories.realEstate,
  "civil-construction": serviceImages.categories.civilConstruction,
  marketing: serviceImages.categories.marketing,
  "tax-compliance": serviceImages.categories.taxCompliance,
  "it-technology": serviceImages.categories.digitalTechnology,
  "business-services": serviceImages.categories.businessServices,
  "local-professional-services": serviceImages.categories.localProfessionalServices,
};

const popularServiceImages: Record<string, string> = {
  "resume-job-assistance": serviceImages.services.jobs.jobApplicationAssistance,
  "construction-estimate-boq": serviceImages.services.civil.boqEstimationCosting,
  "new-building-construction": serviceImages.services.civil.residentialConstruction,
  "social-media-marketing": serviceImages.services.marketing.individual["social-media-marketing"],
  "gst-registration": serviceImages.services.taxCompliance.gstRegistration,
  "income-tax-return": serviceImages.services.taxCompliance.incomeTaxReturnFiling,
  "website-development": serviceImages.services.digital.websiteDevelopment,
};

const safeImage = (src?: string) => {
  if (!src) return localFallbackImage;
  if (src.startsWith("http://") || src.startsWith("https://")) return localFallbackImage;
  return src;
};

export default function HomePageClient() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [apiCategories, setApiCategories] = useState<Category[]>([]);
  const [popularServices, setPopularServices] = useState<PopularService[]>([]);
  const [catalogueLoading, setCatalogueLoading] = useState(true);
  const [catalogueError, setCatalogueError] = useState("");

  useEffect(() => {
    setSearch(new URLSearchParams(window.location.search).get("q") || "");
  }, []);

  useEffect(() => {
    const onSearch = (event: Event) => {
      if (event instanceof CustomEvent && typeof event.detail === "string") {
        setSearch(event.detail);
      }
    };
    window.addEventListener("vistrah:search", onSearch);
    return () => window.removeEventListener("vistrah:search", onSearch);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API}/categories`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Services are temporarily unavailable.");
        return response.json();
      })
      .then(async (data) => {
        if (!Array.isArray(data)) throw new Error("Unable to load services.");
        const categories = data.map((item: Category) => ({
          ...item,
          image: categoryImages[item.slug] || localFallbackImage,
        }));
        const apiSlugs = new Set(categories.map((category) => category.slug));
        const localCategories: Category[] = [...catalogueCategories, ...additionalCategories]
          .filter((category) => !apiSlugs.has(category.slug))
          .map((category) => ({
            id: category.slug,
            name: category.title,
            slug: category.slug,
            icon: "",
            description: category.description,
            image: category.image || localFallbackImage,
          }));
        setApiCategories([...categories, ...localCategories]);
        const lists = await Promise.all(categories.map(async (category) => {
          const response = await fetch(`${API}/categories/${encodeURIComponent(category.slug)}/services`, { signal: controller.signal });
          if (!response.ok) throw new Error("Unable to load services.");
          const items = await response.json();
          return Array.isArray(items) ? items.map((item: Omit<PopularService, "categorySlug">) => ({
            ...item,
            categorySlug: category.slug,
            image: popularServiceImages[item.slug] || localFallbackImage,
          })) : [];
        }));
        setPopularServices(lists.flat().slice(0, 8));
      })
      .catch((error) => {
        if (!controller.signal.aborted) setCatalogueError(error?.message || "Services are temporarily unavailable.");
      })
      .finally(() => { if (!controller.signal.aborted) setCatalogueLoading(false); });
    return () => controller.abort();
  }, []);

  const filteredCategories = apiCategories.filter((category) =>
    `${category.name} ${category.description}`.toLowerCase().includes(search.toLowerCase())
  );

  const openCategory = (slug: string) => {
    router.push(`/service/${slug}`);
  };

  return (
    <main className="vistraPage">
      <div className="homeContent">
        <section className="heroMarketplace">
          <div className="heroCopy">
            <span className="heroEyebrow">ONE PLATFORM. EVERYTHING YOU NEED.</span>
            <h1>
              Get things done,
              <br />
              without the hassle.
            </h1>
            <p>
              Find trusted professionals and services for your personal and business needs.
            </p>

            <form
              className="heroSearch"
              onSubmit={(event) => {
                event.preventDefault();
                document.getElementById("category-results")?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
              }}
            >
              <span>⌕</span>
              <input
                type="search"
                aria-label="Search services"
                placeholder="What do you need help with?"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <button type="submit">Search →</button>
            </form>
          </div>

          <div className="categoryPanel">
            <div className="categoryPanelHeader">
              <div>
                <span>EXPLORE</span>
                <h2>Services</h2>
              </div>

              <button
                onClick={() => {
                  setSearch("");
                  document.getElementById("category-results")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }}
              >
                View all →
              </button>
            </div>

            <div className="compactCategoryGrid" id="category-results">
              {catalogueLoading ? (
                <p role="status" style={{ gridColumn: "1 / -1" }}>Loading services…</p>
              ) : catalogueError ? (
                <p role="alert" style={{ gridColumn: "1 / -1" }}>{catalogueError}</p>
              ) : filteredCategories.length === 0 ? (
                <p role="status" style={{ gridColumn: "1 / -1" }}>
                  {search ? `No services match “${search}”. Try another search.` : "Services will appear here once the catalogue is available."}
                </p>
              ) : (
                filteredCategories.map((category) => (
                  <button
                    key={category.slug}
                    className="compactCategory"
                    onClick={() => openCategory(category.slug)}
                  >
                    <div className="compactImage">
                      <Image
                        src={safeImage(category.image)}
                        alt={`${category.name} services`}
                        width={160}
                        height={120}
                        sizes="80px"
                        loading="lazy"
                        decoding="async"
                        onError={(event) => {
                          event.currentTarget.src = localFallbackImage;
                        }}
                      />
                    </div>

                    <div className="compactInfo">
                      <strong>{category.name}</strong>
                      <span>{category.description}</span>
                    </div>

                    <span className="categoryArrow">→</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="popularSection">
          <div className="sectionTitleRow">
            <div>
              <h2>Popular services</h2>
              <p>Most requested services by people like you.</p>
            </div>

            <button
              onClick={() => {
                setSearch("");
                document.getElementById("category-results")?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
              }}
            >
              View all services →
            </button>
          </div>

          <div className="popularScroller">
            {popularServices.map((service) => (
              <button key={service.name} className="popularCard" onClick={() => openCategory(`${service.categorySlug}/service/${service.slug}`)}>
                <div className="popularImage">
                  <Image
                    src={safeImage(service.image)}
                    alt={service.name}
                    width={640}
                    height={420}
                    sizes="(max-width: 640px) 80vw, 320px"
                    loading="lazy"
                    decoding="async"
                    onError={(event) => {
                      event.currentTarget.src = localFallbackImage;
                    }}
                  />
                </div>

                <div className="popularInfo">
                  <h3>{service.name}</h3>
                  <p>{service.description}</p>

                  <div className="popularBottom">
                    <strong>{service.base_price_paise ? `From ₹${(service.base_price_paise / 100).toLocaleString("en-IN")}` : "Request a quote"}</strong>
                    <span>→</span>
                  </div>
                </div>
              </button>
            ))}
            {!catalogueLoading && !catalogueError && popularServices.length === 0 && <p className="empty">No services are available yet.</p>}
          </div>
        </section>

        <section className="howSection" id="how-it-works">
          <div className="sectionTitleRow">
            <div>
              <h2>How Vistra works</h2>
              <p>A simple and transparent process.</p>
            </div>
          </div>

          <div className="steps">
            {[
              ["01", "Choose a service", "Browse and select the service you need."],
              ["02", "Submit requirements", "Tell us what you need and provide details."],
              ["03", "Confirm & pay", "Review the quote and make a secure payment."],
              ["04", "We start working", "Our team starts processing your request."],
              ["05", "Track your application", "Get updates and follow progress."],
            ].map(([number, title, description]) => (
              <div className="step" key={String(number)}>
                <span className="stepNumber">{number}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="promoGrid">
          <div className="promo promoCareer">
            <div>
              <span>CAREER</span>
              <h2>
                Grow your career
                <br />
                with the right support.
              </h2>
              <p>Resume, interview prep, job opportunities and more.</p>
              <button onClick={() => openCategory("jobs-careers")}>Explore Jobs →</button>
            </div>
          </div>

          <div className="promo promoConstruction">
            <div>
              <span>CONSTRUCTION</span>
              <h2>
                Build your
                <br />
                dream home.
              </h2>
              <p>From design and estimation to construction.</p>
              <button onClick={() => openCategory("civil-construction")}>Explore Construction →</button>
            </div>
          </div>

          <div className="promo promoMarketing">
            <div>
              <span>BUSINESS GROWTH</span>
              <h2>
                Grow your
                <br />
                business online.
              </h2>
              <p>Reach more customers with digital marketing.</p>
              <button onClick={() => openCategory("marketing/digital-marketing")}>Explore Marketing →</button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
