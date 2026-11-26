"use client";
import { Menu } from 'lucide-react';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Bell, UserCircle } from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  image: string;
};

const categories: Category[] = [
  {
    id: "1",
    name: "Jobs & Careers",
    slug: "jobs-careers",
    icon: "💼",
    description: "Jobs, resume, interviews",
    image:
      "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "2",
    name: "Real Estate",
    slug: "real-estate",
    icon: "🏠",
    description: "Buy, sell, rent, property",
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "3",
    name: "Civil & Construction",
    slug: "civil-construction",
    icon: "🏗️",
    description: "Construction, BOQ, tenders",
    image:
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "4",
    name: "Marketing",
    slug: "marketing",
    icon: "📣",
    description: "SEO, ads, social media",
    image:
      "https://images.unsplash.com/photo-1557838923-2985c318be48?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "5",
    name: "Tax & Compliance",
    slug: "tax-compliance",
    icon: "🧾",
    description: "ITR, GST, registrations",
    image:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "6",
    name: "IT & Technology",
    slug: "it-technology",
    icon: "💻",
    description: "Web, apps, cloud, AI",
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "7",
    name: "Business Services",
    slug: "business-services",
    icon: "🏢",
    description: "Registration, consulting",
    image:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "8",
    name: "Local & Professional",
    slug: "local-professional-services",
    icon: "🛠️",
    description: "Legal, repair, local services",
    image:
      "https://images.unsplash.com/photo-1521791055366-0d553872125f?auto=format&fit=crop&w=500&q=80",
  },
];

const popularServices = [
  {
    name: "Resume Building",
    description: "Professional resume for better opportunities",
    price: "From ₹499",
    image:
      "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=600&q=80",
    category: "jobs-careers",
  },
  {
    name: "Home Construction",
    description: "Plan and build your home",
    price: "From ₹499/sqft",
    image:
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=600&q=80",
    category: "civil-construction",
  },
  {
    name: "Digital Marketing",
    description: "Grow your business online",
    price: "From ₹4,999",
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80",
    category: "digital-marketing",
  },
  {
    name: "ITR Filing",
    description: "File your income tax easily",
    price: "From ₹299",
    image:
      "https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=600&q=80",
    category: "tax-compliance",
  },
  {
    name: "AC Service & Repair",
    description: "Professional appliance service",
    price: "From ₹399",
    image:
      "https://images.unsplash.com/photo-1631545806609-6eebf4b6d1d5?auto=format&fit=crop&w=600&q=80",
    category: "local-professional-services",
  },
  {
    name: "Interior Design",
    description: "Modern and functional designs",
    price: "From ₹999/sqft",
    image:
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=600&q=80",
    category: "civil-construction",
  },
  {
    name: "Website Development",
    description: "Professional websites for business",
    price: "From ₹7,999",
    image:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80",
    category: "it-technology",
  },
  {
    name: "Pest Control",
    description: "Safe and effective solutions",
    price: "From ₹499",
    image:
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80",
    category: "local-professional-services",
  },
];

export default function Home() {
  const router = useRouter();

  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [apiCategories, setApiCategories] =
    useState<Category[]>(categories);

  useEffect(() => {
    setIsLoggedIn(Boolean(localStorage.getItem("vistrah_token")));
  }, []);

  useEffect(() => {
    fetch(`${API}/categories`)
      .then((r) => {
        if (!r.ok) throw new Error("API error");
        return r.json();
      })
      .then((data) => {
        const merged = data.map((item: any) => {
          const local = categories.find(
            (c) => c.slug === item.slug
          );

          return {
            ...item,
            image: local?.image || "",
          };
        });

        if (merged.length) {
          setApiCategories(merged);
        }
      })
      .catch(() => {
        setApiCategories(categories);
      });
  }, []);

  const filteredCategories = apiCategories.filter((category) =>
    `${category.name} ${category.description}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const openCategory = (slug: string) => {
    router.push(`/service/${slug}`);
  };

  return (
    <main className="vistraPage">

      {/* HEADER */}

      <header className="mainHeader">

        <div className="headerInner">

          <button className="mobileMenuButton" onClick={() => setMenu(!menu)} aria-label="Open menu"><Menu size={22} strokeWidth={2.2} /></button>

          <button
  className="brand"
  onClick={() => router.push("/")}
>
  VISTRAH
</button>

          <nav className="desktopNav">
            <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              Services
            </button>

            <button onClick={() =>
              document.getElementById("how-it-works")
                ?.scrollIntoView({ behavior: "smooth" })
            }>
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
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search for any service..."
              />
            </div>

            <button
              className="headerIcon"
              title="My Applications"
              aria-label="My Applications"
              onClick={() => router.push("/applications")}
            >
              <ClipboardCheck size={20} strokeWidth={1.8} />
            </button>

            <button
              className="headerIcon"
              title="Notifications"
              aria-label="Notifications"
              onClick={() => router.push("/notifications")}
            >
              <Bell size={20} strokeWidth={1.8} />
            </button>

            <button
              className="profileButton"
              title="Profile"
              aria-label="Profile"
              onClick={() => router.push("/profile")}
            >
              <UserCircle size={21} strokeWidth={1.8} />
            </button>

          </div>

        </div>

      </header>


      {/* MOBILE MENU */}

      {menu && (
        <div className="mobileMenu">

          {!isLoggedIn ? (
            <>
              <button
                onClick={() => {
                  setMenu(false);
                  router.push("/login");
                }}
              >
                Login
              </button>

              <button
                onClick={() => {
                  setMenu(false);
                  router.push("/signup");
                }}
              >
                Create Account
              </button>

              <div className="menuDivider"></div>

              <button
                onClick={() => {
                  setMenu(false);
                  document.getElementById("how-it-works")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                How It Works
              </button>

              <button>
                For Business
              </button>

              <button>
                About VISTRAH
              </button>

              <button
                onClick={() => {
                  setMenu(false);
                  window.location.href = "tel:+918000000000";
                }}
              >
                Call VISTRAH
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setMenu(false);
                  router.push("/profile");
                }}
              >
                Profile
              </button>

              <button
                onClick={() => {
                  setMenu(false);
                  router.push("/applications");
                }}
              >
                My Applications
              </button>

              <button
                onClick={() => {
                  setMenu(false);
                  router.push("/refer");
                }}
              >
                Refer & Earn
              </button>

              <div className="menuDivider"></div>

              <button
                onClick={() => {
                  setMenu(false);
                  document.getElementById("how-it-works")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                How It Works
              </button>

              <button>
                For Business
              </button>

              <button>
                About VISTRAH
              </button>

              <button
                onClick={() => {
                  setMenu(false);
                  window.location.href = "tel:+918000000000";
                }}
              >
                Call VISTRAH
              </button>

              <div className="menuDivider"></div>

              <button
                className="logoutMenuButton"
                onClick={() => {
                  localStorage.removeItem("vistrah_token");
                  localStorage.removeItem("vistrah_user");
                  setIsLoggedIn(false);
                  setMenu(false);
                }}
              >
                Logout
              </button>
            </>
          )}

        </div>
      )}

      {/* MAIN */}

      <div className="homeContent">

        {/* HERO + CATEGORIES */}

        <section className="heroMarketplace">

          <div className="heroCopy">

            <span className="heroEyebrow">
              ONE PLATFORM. EVERYTHING YOU NEED.
            </span>

            <h1>
              Get things done,
              <br />
              without the hassle.
            </h1>

            <p>
              Find trusted professionals and services
              for your personal and business needs.
            </p>

            <div className="heroSearch">

              <span>⌕</span>

              <input
                placeholder="What do you need help with?"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />

              <button>
                Search →
              </button>

            </div>

          </div>


          <div className="categoryPanel">

            <div className="categoryPanelHeader">

              <div>
                <span>EXPLORE</span>
                <h2>Services</h2>
              </div>

              <button>
                View all →
              </button>

            </div>


            <div className="compactCategoryGrid">

              {filteredCategories.map((category) => (

                <button
                  key={category.slug}
                  className="compactCategory"
                  onClick={() =>
                    openCategory(category.slug)
                  }
                >

                  <div className="compactImage">

                    <img
                      src={category.image}
                      alt=""
                    />

                  </div>

                  <div className="compactInfo">

                    <strong>
                      {category.name}
                    </strong>

                    <span>
                      {category.description}
                    </span>

                  </div>

                  <span className="categoryArrow">
                    →
                  </span>

                </button>

              ))}

            </div>

          </div>

        </section>


        {/* POPULAR SERVICES */}

        <section className="popularSection">

          <div className="sectionTitleRow">

            <div>

              <h2>
                Popular services
              </h2>

              <p>
                Most requested services by people like you.
              </p>

            </div>

            <button>
              View all services →
            </button>

          </div>


          <div className="popularScroller">

            {popularServices.map((service) => (

              <button
                key={service.name}
                className="popularCard"
                onClick={() =>
                  openCategory(service.category)
                }
              >

                <div className="popularImage">

                  <img
                    src={service.image}
                    alt={service.name}
                  />

                </div>

                <div className="popularInfo">

                  <h3>
                    {service.name}
                  </h3>

                  <p>
                    {service.description}
                  </p>

                  <div className="popularBottom">

                    <strong>
                      {service.price}
                    </strong>

                    <span>
                      →
                    </span>

                  </div>

                </div>

              </button>

            ))}

          </div>

        </section>


        {/* HOW IT WORKS */}

        <section
          className="howSection"
          id="how-it-works"
        >

          <div className="sectionTitleRow">

            <div>

              <h2>
                How Vistra works
              </h2>

              <p>
                A simple and transparent process.
              </p>

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

            ))}

          </div>

        </section>


        {/* PROMOTIONAL BANNERS */}

        <section className="promoGrid">

          <div className="promo promoCareer">

            <div>

              <span>
                CAREER
              </span>

              <h2>
                Grow your career
                <br />
                with the right support.
              </h2>

              <p>
                Resume, interview prep, job opportunities
                and more.
              </p>

              <button
                onClick={() =>
                  openCategory("jobs-careers")
                }
              >
                Explore Jobs →
              </button>

            </div>

          </div>


          <div className="promo promoConstruction">

            <div>

              <span>
                CONSTRUCTION
              </span>

              <h2>
                Build your
                <br />
                dream home.
              </h2>

              <p>
                From design and estimation
                to construction.
              </p>

              <button
                onClick={() =>
                  openCategory("civil-construction")
                }
              >
                Explore Construction →
              </button>

            </div>

          </div>


          <div className="promo promoMarketing">

            <div>

              <span>
                BUSINESS GROWTH
              </span>

              <h2>
                Grow your
                <br />
                business online.
              </h2>

              <p>
                Reach more customers with
                digital marketing.
              </p>

              <button
                onClick={() =>
                  openCategory("digital-marketing")
                }
              >
                Explore Marketing →
              </button>

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}





