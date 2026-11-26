import { notFound } from "next/navigation";
import { ServicePage, getCatalogueService, getMarketingRequestService } from "../../../../../features/catalogue";
import MarketingRequestForm from "./MarketingRequestForm";

export default async function MarketingServiceRoute({
  params,
}: {
  params: Promise<{ subslug: string; service: string }>;
}) {
  const { subslug, service: serviceSlug } = await params;
  if (getMarketingRequestService(subslug, serviceSlug)) {
    return <MarketingRequestForm subslug={subslug} serviceSlug={serviceSlug} />;
  }

  const service = getCatalogueService("marketing", serviceSlug, subslug);
  if (!service) notFound();
  return <ServicePage service={service} />;
}
