import { PublicPageFrame, PublicSection } from "../../../app/components/PublicPageTemplates";
import { getCatalogueCategory } from "../data/categories";
import { getCatalogueServices } from "../data/services";
import { getCatalogueSubcategory } from "../data/subcategories";
import CatalogueCardGrid from "../components/CatalogueCardGrid";

export default function SubcategoryPage({ categorySlug, slug }: { categorySlug: string; slug: string }) {
  const category = getCatalogueCategory(categorySlug);
  const subcategory = getCatalogueSubcategory(categorySlug, slug);
  if (!category || !subcategory) return <PublicPageFrame
    crumbs={[{ label: "Service category not found" }]}
    eyebrow="Service directory"
    title="Service category not found"
    description="This category may have moved or is not currently available. Return to the service directory to continue browsing."
    action={{ label: `Back to ${category?.title || "services"}`, href: `/service/${categorySlug}` }}
  />;

  const cards = getCatalogueServices(categorySlug, slug).map((service) => ({
    title: service.title,
    description: service.description,
    image: service.image,
    href: `/service/${categorySlug}/${slug}/${service.slug}`,
    status: service.status,
  }));

  return <PublicPageFrame
    crumbs={[{ label: category.title, href: `/service/${categorySlug}` }, { label: subcategory.title }]}
    eyebrow={category.title}
    title={subcategory.title}
    description={subcategory.description}
    image={subcategory.image}
    imageAlt={`${subcategory.title} services`}
  >
    <PublicSection title="Available services" description="Choose a service to review its details and continue to its request or provider information.">
      <CatalogueCardGrid cards={cards} />
    </PublicSection>
  </PublicPageFrame>;
}
