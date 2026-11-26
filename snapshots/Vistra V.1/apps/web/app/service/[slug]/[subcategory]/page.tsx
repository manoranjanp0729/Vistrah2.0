import { notFound } from "next/navigation";
import { ServicePage, SubcategoryPage } from "../../../../features/catalogue";
import { getCatalogueService } from "../../../../features/catalogue/data/services";
import { getCatalogueSubcategory } from "../../../../features/catalogue/data/subcategories";

export default async function CatalogueSecondLevelRoute({
  params,
}: {
  params: Promise<{ slug: string; subcategory: string }>;
}) {
  const { slug, subcategory } = await params;

  // A second path segment may identify either a direct service or a subcategory.
  // Prefer subcategories when both data sources contain the same slug.
  if (getCatalogueSubcategory(slug, subcategory)) {
    return <SubcategoryPage categorySlug={slug} slug={subcategory} />;
  }

  const service = getCatalogueService(slug, subcategory);
  if (service) return <ServicePage service={service} />;
  notFound();
}
