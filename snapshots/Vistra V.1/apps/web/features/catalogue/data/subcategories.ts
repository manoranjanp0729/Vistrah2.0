import { outdoorLifestyleServices } from "../../../app/data/civil";
import { getMarketingSubcategory, marketingSubcategories } from "../../../app/data/marketing";
import { serviceImages } from "../../../app/data/serviceImages";

export type CatalogueSubcategory = {
  categorySlug: string;
  slug: string;
  title: string;
  description: string;
  image: string;
};

export const catalogueSubcategories: CatalogueSubcategory[] = [
  ...marketingSubcategories.map((subcategory) => ({
    categorySlug: "marketing",
    slug: subcategory.slug,
    title: subcategory.name,
    description: subcategory.description,
    image: subcategory.image || serviceImages.placeholders.default,
  })),
  {
    categorySlug: "civil-construction",
    slug: "outdoor-lifestyle-design",
    title: "Outdoor & Lifestyle Design",
    description: "Explore the outdoor structures and lifestyle solutions currently listed on VISTRAH.",
    image: serviceImages.services.civil.outdoorLifestyleDesign,
  },
];

export const additionalSubcategories: CatalogueSubcategory[] = [];

export function getCatalogueSubcategories(categorySlug: string) {
  return [...catalogueSubcategories, ...additionalSubcategories].filter((item) => item.categorySlug === categorySlug);
}

export function getCatalogueSubcategory(categorySlug: string, slug: string) {
  const custom = additionalSubcategories.find(
    (subcategory) => subcategory.categorySlug === categorySlug && subcategory.slug === slug,
  );
  if (custom) return custom;

  const item = catalogueSubcategories.find(
    (subcategory) => subcategory.categorySlug === categorySlug && subcategory.slug === slug,
  );
  if (!item) return undefined;

  if (categorySlug === "marketing") {
    const source = getMarketingSubcategory(slug);
    return source ? { ...item, marketingData: source } : undefined;
  }

  if (categorySlug === "civil-construction" && slug === "outdoor-lifestyle-design") {
    return { ...item, outdoorServices: outdoorLifestyleServices };
  }

  return item;
}
