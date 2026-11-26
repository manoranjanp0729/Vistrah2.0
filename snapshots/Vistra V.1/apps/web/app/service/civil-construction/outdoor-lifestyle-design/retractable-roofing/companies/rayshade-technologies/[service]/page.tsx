import { notFound } from "next/navigation";
import { ServicePage } from "../../../../../../../../features/catalogue";
import { getProviderService } from "../../../../../../../../features/catalogue/data/services";
import { rayshadeServices } from "../../../../../../../../app/data/civil";

export function generateStaticParams() {
  return rayshadeServices.map(({ slug }) => ({ service: slug }));
}

export default async function RayShadeSolutionRoute({ params }: { params: Promise<{ service: string }> }) {
  const { service: slug } = await params;
  const service = getProviderService(slug);
  if (!service) notFound();
  return <ServicePage service={service} />;
}
