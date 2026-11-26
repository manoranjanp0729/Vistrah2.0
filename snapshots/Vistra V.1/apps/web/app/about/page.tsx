import InfoPage from "../components/InfoPage";

export default function AboutPage() {
  return (
    <InfoPage
      eyebrow="ABOUT VISTRAH"
      title="Services, coordinated in one place."
      description="VISTRAH helps people and businesses find and manage services through one platform, from choosing a service to sharing a requirement and following its progress."
      sections={[
        {
          title: "One place to start",
          description:
            "Browse service categories and choose the one that fits your requirement.",
        },
        {
          title: "A clear request process",
          description:
            "Share the information needed for your selected service and review the next steps.",
        },
        {
          title: "Coordinated progress",
          description:
            "Keep your service requests and updates together as work moves forward.",
        },
      ]}
    />
  );
}
