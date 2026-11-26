import { rayshadeServices } from "../../../../../../data/civil";
import { PublicCardGrid, PublicPageFrame, PublicSection } from "../../../../../../components/PublicPageTemplates";

const base = "/service/civil-construction/outdoor-lifestyle-design/retractable-roofing/companies/rayshade-technologies";

export default function RayShadeCompanyPage() {
  return <PublicPageFrame
    crumbs={[
      { label: "Civil & Construction", href: "/service/civil-construction" },
      { label: "Outdoor & Lifestyle Design", href: "/service/civil-construction/outdoor-lifestyle-design" },
      { label: "Retractable Roofing", href: "/service/civil-construction/outdoor-lifestyle-design/retractable-roofing" },
      { label: "RayShade Technologies" },
    ]}
    eyebrow="Provider profile"
    title="RayShade Technologies"
    description="Explore the solution categories listed for RayShade Technologies in the current VISTRAH directory."
  >
    <PublicSection title="Listed solutions" description="Choose a solution to view its service details.">
      <PublicCardGrid cards={rayshadeServices.map((service) => ({
        title: service.title,
        description: service.description,
        href: `${base}/${service.slug}`,
        status: "Listed solution",
      }))} />
    </PublicSection>
  </PublicPageFrame>;
}
