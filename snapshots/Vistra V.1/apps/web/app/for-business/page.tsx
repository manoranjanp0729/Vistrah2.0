import InfoPage from "../components/InfoPage";

export default function ForBusinessPage() {
  return (
    <InfoPage
      eyebrow="FOR BUSINESS"
      title="Service support for business needs."
      description="Businesses and service providers can contact VISTRAH to discuss how their requirements or services may fit the platform. Participation and next steps are discussed directly; no vendor enrollment or pricing is published on this page."
      sections={[
        {
          title: "Explore business services",
          description:
            "Browse business setup, consultation, documentation, technology and other service categories.",
        },
        {
          title: "Share your requirement",
          description:
            "Describe the work you need so it can be reviewed in context.",
        },
        {
          title: "Discuss working with VISTRAH",
          description:
            "Businesses and service providers can contact VISTRAH to discuss their needs and potential participation.",
        },
      ]}
      actionLabel="Explore business services"
      actionHref="/#category-results"
    />
  );
}
