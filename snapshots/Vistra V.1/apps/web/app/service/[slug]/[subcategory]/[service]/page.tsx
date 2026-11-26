import { notFound } from "next/navigation";
import { ServicePage } from "../../../../../features/catalogue";
import { getCatalogueService } from "../../../../../features/catalogue/data/services";

export default async function CatalogueNestedServiceRoute({
  params,
}: {
  params: Promise<{ slug: string; subcategory: string; service: string }>;
}) {
  const { slug, subcategory, service: serviceSlug } = await params;
  const service = getCatalogueService(slug, serviceSlug, subcategory);
  if (!service) notFound();
  return <ServicePage service={service} />;
}
