import InfoPage from "../components/InfoPage";

export default function HowItWorksPage() {
  return (
    <InfoPage
      eyebrow="HOW IT WORKS"
      title="From service discovery to completion."
      description="A straightforward journey for sharing a requirement, reviewing available options and moving ahead with the service that suits you."
      sections={[
        {
          title: "Discover a service",
          description:
            "Browse categories and select the service that matches your need.",
        },
        {
          title: "Submit your request",
          description:
            "Provide the details required to understand your service requirement.",
        },
        {
          title: "VISTRAH reviews it",
          description:
            "Your request is reviewed so the appropriate options and next steps can be identified.",
        },
        {
          title: "Options and provider coordination",
          description:
            "Relevant options and provider details are handled for your request.",
        },
        {
          title: "Review and approve",
          description:
            "Consider the proposed next steps and approve the option you choose.",
        },
        {
          title: "Work moves forward",
          description:
            "The selected work proceeds, with updates shared as the request progresses.",
        },
      ]}
    />
  );
}
