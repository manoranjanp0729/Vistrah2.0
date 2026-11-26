import { civilCategories, outdoorLifestyleServices, rayshadeServices, retractableRoofingCompanies } from "../../../app/data/civil";
import { categories as directServiceCategories } from "../../../app/data/categoryServices";
import { getMarketingService, getMarketingSubcategory } from "../../../app/data/marketing";
import { serviceImages } from "../../../app/data/serviceImages";

export type CatalogueService = {
  categorySlug: string;
  subcategorySlug?: string;
  slug: string;
  title: string;
  description: string;
  image?: string;
  eyebrow: string;
  backHref: string;
  backLabel: string;
  status?: string;
  cta?: { label: string; href: string };
  providerNavigation?: { title: string; description: string; href: string; status?: string }[];
  providerId?: string;
};

export const additionalServices: CatalogueService[] = [];

export function getCatalogueServices(categorySlug: string, subcategorySlug?: string): CatalogueService[] {
  if (categorySlug === "marketing" && subcategorySlug) {
    const subcategory = getMarketingSubcategory(subcategorySlug);
    return (subcategory?.services ?? []).map((service) => ({
      categorySlug,
      subcategorySlug,
      slug: service.slug,
      title: service.name,
      description: service.description,
      image: service.image || serviceImages.placeholders.default,
      eyebrow: `${subcategory?.name} · Marketing`,
      backHref: `/service/marketing/${subcategorySlug}`,
      backLabel: subcategory?.name || "Marketing",
    }));
  }

  if (categorySlug === "civil-construction" && subcategorySlug === "outdoor-lifestyle-design") {
    const builtInServices = outdoorLifestyleServices.map((service) => ({
      categorySlug,
      subcategorySlug,
      slug: service.slug,
      title: service.title,
      description: service.description,
      image: service.image,
      eyebrow: "Outdoor & Lifestyle Design",
      backHref: "/service/civil-construction/outdoor-lifestyle-design",
      backLabel: "Outdoor & Lifestyle Design",
      ...(service.slug === "retractable-roofing" ? {
        cta: {
          label: "View providers",
          href: "/service/civil-construction/outdoor-lifestyle-design/retractable-roofing/companies",
        },
        providerNavigation: retractableRoofingCompanies.map((company) => ({
          title: company.name,
          description: company.description,
          href: `/service/civil-construction/outdoor-lifestyle-design/retractable-roofing/companies/${company.slug}`,
          status: "Provider",
        })),
      } : {}),
    }));
    return [...builtInServices, ...additionalServices.filter((item) => item.categorySlug === categorySlug && item.subcategorySlug === subcategorySlug)];
  }

  if (categorySlug === "civil-construction") {
    if (subcategorySlug) {
      return additionalServices.filter((item) => item.categorySlug === categorySlug && item.subcategorySlug === subcategorySlug);
    }
    const builtInServices = civilCategories.map((service) => ({
      categorySlug,
      slug: service.slug,
      title: service.title,
      description: service.description,
      image: service.image,
      eyebrow: "Civil & Construction",
      backHref: "/service/civil-construction",
      backLabel: "Civil & Construction",
      status: service.status,
    }));
    return [...builtInServices, ...additionalServices.filter((item) => item.categorySlug === categorySlug && !item.subcategorySlug)];
  }

  const category = directServiceCategories[categorySlug];
  const records = subcategorySlug ? [] : (category?.services ?? []).map((service) => ({
    categorySlug,
    slug: service.slug,
    title: service.title,
    description: service.description,
    image: service.image || category?.heroImage || serviceImages.placeholders.default,
    eyebrow: category?.eyebrow || category?.title || "Service",
    backHref: `/service/${categorySlug}`,
    backLabel: category?.title || categorySlug,
  }));

  return [...records, ...additionalServices.filter((item) => item.categorySlug === categorySlug && item.subcategorySlug === subcategorySlug)];
}

export function getCatalogueService(categorySlug: string, serviceSlug: string, subcategorySlug?: string) {
  return getCatalogueServices(categorySlug, subcategorySlug).find((service) => service.slug === serviceSlug);
}

export function getMarketingRequestService(subcategorySlug: string, serviceSlug: string) {
  return getMarketingService(subcategorySlug, serviceSlug);
}

export function getProviderService(serviceSlug: string) {
  const service = rayshadeServices.find((item) => item.slug === serviceSlug);
  if (!service) return undefined;
  const imageBySlug: Record<string, string> = {
    "pvdf-fabric-retractable-roof": serviceImages.services.civil.retractableRoofing,
    "bioclimatic-pergola": serviceImages.services.civil.bioclimaticPergolas,
    "guillotine-glass-system": serviceImages.services.civil.guillotineGlassSystems,
  };
  return {
    categorySlug: "civil-construction",
    subcategorySlug: "outdoor-lifestyle-design",
    ...service,
    image: imageBySlug[service.slug] || serviceImages.placeholders.default,
    backHref: "/service/civil-construction/outdoor-lifestyle-design/retractable-roofing/companies/rayshade-technologies",
    backLabel: "RayShade Technologies",
    eyebrow: "RayShade Technologies · Listed solution",
  };
}
