import { notFound } from "next/navigation";
import { ServicePage } from "../../../../../features/catalogue";
import { getCatalogueService } from "../../../../../features/catalogue/data/services";

export default async function OutdoorLifestyleServiceRoute({ params }: { params: Promise<{ service: string }> }) {
  const { service: serviceSlug } = await params;
  const service = getCatalogueService("civil-construction", serviceSlug, "outdoor-lifestyle-design");
  if (!service || serviceSlug === "retractable-roofing") notFound();
  return <ServicePage service={service} />;
}
