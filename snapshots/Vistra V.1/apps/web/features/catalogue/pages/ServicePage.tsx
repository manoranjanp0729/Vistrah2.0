"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PublicPageFrame, PublicSection } from "../../../app/components/PublicPageTemplates";
import CatalogueCardGrid from "../components/CatalogueCardGrid";
import type { CatalogueService } from "../data/services";
import { formatINR, getAccessToken, getActiveServiceOffers, membershipApi } from "../../membership/api/client";
import type { MembershipOffer } from "../../membership/types";

type MemberState = "checking" | "member" | "non-member";

function offerBenefit(offer: MembershipOffer) {
  if (offer.benefit_type === "PERCENTAGE") return `${offer.benefit_value}% member benefit`;
  if (offer.benefit_type === "MEMBER_PRICE") return `Member price ${formatINR(offer.benefit_value)}`;
  return `${formatINR(offer.benefit_value)} off`;
}

export default function ServicePage({ service }: { service: CatalogueService }) {
  const [memberState, setMemberState] = useState<MemberState>("checking");
  const [offers, setOffers] = useState<MembershipOffer[]>([]);

  useEffect(() => {
    let active = true;
    const token = getAccessToken();
    const requests: [Promise<MembershipOffer[]>, Promise<{ membership: { status: string } | null }> | null] = [
      getActiveServiceOffers({ categorySlug: service.categorySlug, subcategorySlug: service.subcategorySlug, serviceSlug: service.slug, providerId: service.providerId }),
      token ? membershipApi<{ membership: { status: string } | null }>("/membership/me") : null,
    ];
    void Promise.allSettled(requests).then(([offerResult, memberResult]) => {
      if (!active) return;
      if (offerResult.status === "fulfilled") setOffers(offerResult.value);
      if (!token) setMemberState("non-member");
      else if (memberResult?.status === "fulfilled" && memberResult.value) setMemberState(memberResult.value.membership?.status === "ACTIVE" ? "member" : "non-member");
      else setMemberState("non-member");
    });
    return () => { active = false; };
  }, [service.categorySlug, service.subcategorySlug, service.slug, service.providerId]);

  return <PublicPageFrame
    crumbs={[{ label: service.backLabel, href: service.backHref }, { label: service.title }]}
    eyebrow={service.eyebrow}
    title={service.title}
    description={service.description}
    image={service.image}
    imageAlt={`${service.title} service`}
    action={{ label: "CALL VISTRAH", href: "/call-vistrah" }}
  >
    {memberState === "non-member" && <section className="memberOfferPrompt" aria-label="Membership benefits">
      <div><strong>Members get exclusive offers on selected services.</strong><p>Service purchases are separate. An offer applies only where a current member benefit is configured.</p></div>
      <Link href="/membership">Explore Membership</Link>
    </section>}
    {memberState === "member" && offers.length > 0 && <PublicSection title="VISTRAH MEMBER OFFER" description="Your membership offer is currently active for this service.">
      <div className="memberOfferList">{offers.map((offer) => <article className="memberOfferCard" key={offer.id}>
        <p className="memberOfferTag">VISTRAH MEMBER OFFER</p><h3>{offer.name}</h3><p className="memberOfferBenefit">{offerBenefit(offer)}</p>
        {offer.description && <p>{offer.description}</p>}{offer.terms && <small>{offer.terms}</small>}
      </article>)}</div>
    </PublicSection>}
    {service.providerNavigation && <PublicSection title="Available providers" description="Provider information shown here comes from the current service directory.">
      <CatalogueCardGrid cards={service.providerNavigation} />
    </PublicSection>}
    <PublicSection title="Service overview">
      <p>{service.description}</p>
    </PublicSection>
  </PublicPageFrame>;
}
