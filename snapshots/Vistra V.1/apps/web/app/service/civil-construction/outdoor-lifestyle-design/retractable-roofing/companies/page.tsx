import { retractableRoofingCompanies } from "../../../../../data/civil";
import { PublicCardGrid, PublicPageFrame, PublicSection } from "../../../../../components/PublicPageTemplates";

export default function RetractableRoofingCompaniesPage() {
  return <PublicPageFrame
    crumbs={[
      { label: "Civil & Construction", href: "/service/civil-construction" },
      { label: "Outdoor & Lifestyle Design", href: "/service/civil-construction/outdoor-lifestyle-design" },
      { label: "Retractable Roofing", href: "/service/civil-construction/outdoor-lifestyle-design/retractable-roofing" },
      { label: "Providers" },
    ]}
    eyebrow="Retractable Roofing"
    title="Available providers"
    description="Review the provider profiles currently listed in this VISTRAH service directory."
  >
    <PublicSection title="Company directory">
      <PublicCardGrid cards={retractableRoofingCompanies.map((company) => ({
        title: company.name,
        description: company.description,
        href: `/service/civil-construction/outdoor-lifestyle-design/retractable-roofing/companies/${company.slug}`,
        status: "Provider",
      }))} />
    </PublicSection>
  </PublicPageFrame>;
}
