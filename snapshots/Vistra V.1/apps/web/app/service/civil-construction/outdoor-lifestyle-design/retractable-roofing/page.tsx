import { notFound } from "next/navigation";
import { ServicePage } from "../../../../../features/catalogue";
import { getCatalogueService } from "../../../../../features/catalogue/data/services";

export default function RetractableRoofingRoute() {
  const service = getCatalogueService("civil-construction", "retractable-roofing", "outdoor-lifestyle-design");
  if (!service) notFound();
  return <ServicePage service={service} />;
}
