import { PublicPageFrame, PublicSection } from "../components/PublicPageTemplates";

const VISTRAH_PHONE = "6364456776";

export default function CallVistrahPage() {
  return (
    <PublicPageFrame
      crumbs={[{ label: "Call VISTRAH" }]}
      eyebrow="VISTRAH"
      title="Call VISTRAH"
      description="Speak directly with VISTRAH about the service you are interested in."
    >
      <PublicSection title="Call VISTRAH" description="For service enquiries, availability and assistance, contact VISTRAH directly.">
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <p style={{ margin: 0, fontSize: "0.9rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Call VISTRAH:
          </p>
          <p style={{ margin: "12px 0 0", fontSize: "clamp(2rem, 6vw, 3.25rem)", fontWeight: 700, letterSpacing: "0.04em" }}>
            {VISTRAH_PHONE}
          </p>
        </div>
      </PublicSection>
    </PublicPageFrame>
  );
}
