import { categories as legacyCategories } from "../../../app/data/categoryServices";
import { serviceImages } from "../../../app/data/serviceImages";

export type CatalogueCategory = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  image?: string;
  listing: "services" | "subcategories";
};

const overrides: Record<string, Partial<CatalogueCategory>> = {
  "civil-construction": {
    title: "Civil & Construction",
    eyebrow: "Services",
    description: "Browse civil and construction service categories. Outdoor & Lifestyle Design is currently listed as available; the remaining categories are marked as coming soon.",
    image: serviceImages.categories.civilConstruction,
    listing: "services",
  },
  marketing: {
    title: "Marketing",
    eyebrow: "Services",
    description: "Browse digital marketing, advertising, branding, displays, events and promotional services managed through VISTRAH.",
    image: serviceImages.categories.marketing,
    listing: "subcategories",
  },
};

export const catalogueCategories: CatalogueCategory[] = Object.entries(legacyCategories).map(([slug, category]) => ({
  slug,
  title: category.title,
  eyebrow: category.eyebrow,
  description: category.description,
  image: category.heroImage,
  listing: "services",
  ...overrides[slug],
}));

export const additionalCategories: CatalogueCategory[] = [];

export function getCatalogueCategory(slug: string) {
  return [...catalogueCategories, ...additionalCategories].find((category) => category.slug === slug);
}
