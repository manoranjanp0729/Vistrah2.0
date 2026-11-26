import { notFound } from "next/navigation";
import { ServicePage } from "../../../../../features/catalogue";
import { getCatalogueService } from "../../../../../features/catalogue/data/services";

export default async function CatalogueDirectServiceRoute({
  params,
}: {
  params: Promise<{ slug: string; service: string }>;
}) {
  const { slug, service: serviceSlug } = await params;
  const service = getCatalogueService(slug, serviceSlug);
  if (!service) notFound();
  return <ServicePage service={service} />;
}
