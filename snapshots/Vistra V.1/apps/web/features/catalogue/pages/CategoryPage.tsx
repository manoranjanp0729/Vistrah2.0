"use client";

import { useEffect, useState } from "react";
import { PublicPageFrame, PublicSection } from "../../../app/components/PublicPageTemplates";
import { getCatalogueCategory } from "../data/categories";
import { getCatalogueServices } from "../data/services";
import { getCatalogueSubcategories } from "../data/subcategories";
import CatalogueCardGrid from "../components/CatalogueCardGrid";

export default function CategoryPage({ slug }: { slug: string }) {
  const category = getCatalogueCategory(slug);
  const [serviceSearch, setServiceSearch] = useState("");

  useEffect(() => {
    const onSearch = (event: Event) => {
      if (event instanceof CustomEvent && typeof event.detail === "string") setServiceSearch(event.detail);
    };
    window.addEventListener("vistrah:search", onSearch);
    return () => window.removeEventListener("vistrah:search", onSearch);
  }, []);

  if (!category) return <PublicPageFrame
    crumbs={[{ label: "Category not found" }]}
    eyebrow="Service directory"
    title="Service category not found"
    description="This category may have moved or is not available. Return to the service directory to continue browsing."
    action={{ label: "Browse services", href: "/#category-results" }}
  />;

  const cards = category.listing === "subcategories"
    ? getCatalogueSubcategories(slug).map((subcategory) => ({
      title: subcategory.title,
      description: subcategory.description,
      image: subcategory.image,
      href: `/service/${slug}/${subcategory.slug}`,
    }))
    : getCatalogueServices(slug).map((service) => ({
      title: service.title,
      description: service.description,
      image: service.image,
      href: `/service/${slug}/service/${service.slug}`,
      status: service.status,
    }));
  const filteredCards = cards.filter((card) =>
    `${card.title} ${card.description}`.toLowerCase().includes(serviceSearch.trim().toLowerCase()),
  );

  return <PublicPageFrame
    crumbs={[{ label: category.title }]}
    eyebrow={category.eyebrow}
    title={category.title}
    description={category.description}
    image={category.image}
    imageAlt={`${category.title} services`}
    action={{ label: "All categories", href: "/#category-results" }}
  >
    <PublicSection
      title={category.listing === "subcategories" ? `${category.title} categories` : `${category.title} services`}
      description={category.listing === "subcategories"
        ? "Choose a category to review its listed services."
        : "Choose a service to review its details and continue to the appropriate request flow."}
    >
      {filteredCards.length ? <CatalogueCardGrid cards={filteredCards} /> : <p role="status">No services match your search.</p>}
    </PublicSection>
  </PublicPageFrame>;
}
