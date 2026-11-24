"use client";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Monitor,
  BarChart3,
  PenTool,
  Video,
  Users,
  Search,
  Star,
  MapPin,
  Truck,
  Airplay,
  Film,
  Check,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { useUser } from "./customer";
import { api } from "../lib/api";
import {
  pricingCatalogue,
  searchPricing,
  servicePrice,
  formatPricingMoney,
  baseEstimate,
  emptyQuote,
  quoteKey,
  quotePayload,
  marketingPricingClient,
  pricingHref,
  defaultHydratedPricing,
  hydrateLivePricing,
  computeTierBoostEstimate,
  serviceFeeClarity,
  PRICING_COMPARISON_ROWS,
  type PricingIntent,
  type QuoteDraft,
  type MarketingQuote,
  type PricingCapabilities,
} from "../../shared/marketing-pricing";
import styles from "./marketing-pricing.module.css";

const client = marketingPricingClient(api);
const icons = [
  Monitor,
  BarChart3,
  PenTool,
  Video,
  Users,
  Search,
  Star,
  MapPin,
  Truck,
  Airplay,
  Film,
];

const fields: [keyof QuoteDraft, string, string][] = [
  ["business_name", "Business name", "text"],
  ["contact_name", "Contact name", "text"],
  ["email", "Contact email", "email"],
  ["phone", "Contact phone", "tel"],
  ["city", "City", "text"],
  ["area", "Preferred area", "text"],
  ["media_format", "Media format", "text"],
  ["campaign_duration", "Campaign duration", "text"],
  ["quantity", "Quantity", "number"],
  ["budget", "Budget in INR (optional)", "text"],
];

const PILLAR_VISUALS: Record<string, { src: string; alt: string }> = {
  creative: {
    src: "/images/ads-marketing/branding-creative.webp",
    alt: "VISTRAH Ads & Marketing creative and video production studio",
  },
  digital: {
    src: "/images/ads-marketing/website-automation.jpg",
    alt: "Custom business website design and workflow automation setup",
  },
  outdoor: {
    src: "/images/ads-marketing/outdoor-signage.jpg",
    alt: "High-visibility outdoor hoardings, signage, and DOOH displays",
  },
  mobility: {
    src: "/images/ads-marketing/mobility-billboard.jpg",
    alt: "Mobility transit and fleet billboard advertising",
  },
};

function detailVisualForCategory(categoryId?: string): {
  src: string;
  alt: string;
} {
  if (categoryId === "websites") {
    return PILLAR_VISUALS.digital;
  }
  if (categoryId === "video") {
    return {
      src: "/images/ads-marketing/video-content-production.webp",
      alt: "Commercial video and 9:16 Reels production shoot",
    };
  }
  if (categoryId === "branding") {
    return PILLAR_VISUALS.creative;
  }
  if (categoryId === "social" || categoryId === "influencer") {
    return {
      src: "/images/ads-marketing/social-media-management.webp",
      alt: "Social media and creator marketing campaign planning",
    };
  }
  if (categoryId === "mobility") {
    return PILLAR_VISUALS.mobility;
  }
  if (
    categoryId === "outdoor" ||
    categoryId === "screens" ||
    categoryId === "cinema"
  ) {
    return PILLAR_VISUALS.outdoor;
  }
  return {
    src: "/images/ads-marketing/performance-marketing.webp",
    alt: "Performance marketing, search, and digital growth strategy",
  };
}

export function MarketingPricing({
  serviceId,
  initialPackage = "",
}: {
  serviceId?: string;
  initialPackage?: string;
}) {
  const [hydrated, setHydrated] = useState(defaultHydratedPricing);
  const catalogue = hydrated.catalogue;
  const { promo, vAdsTiers, pillars, faqs, serviceFeeLabels } = hydrated;
  const [live, setLive] = useState(false);
  const [notice, setNotice] = useState("");
  const [capabilities, setCapabilities] = useState<PricingCapabilities | null>(
    null,
  );

  // Buyer-intent state on the overview rate card
  const [intent, setIntent] = useState<PricingIntent>("boosts");
  const [selectedTierId, setSelectedTierId] = useState<string>("v-ads-5km");

  // Studio search / filter state
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [billing, setBilling] = useState("all");
  const [compare, setCompare] = useState(false);

  // Quotation form state (shared by detail page & overview "Request Custom Media Plan")
  const defaultPlanServiceId = serviceId ?? "digital-campaign";
  const [draft, setDraft] = useState<QuoteDraft>(() => ({
    ...emptyQuote(defaultPlanServiceId),
    package_id:
      pricingCatalogue.services.find((s) => s.id === defaultPlanServiceId)
        ?.starting_price_paise === null
        ? ""
        : initialPackage,
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<MarketingQuote | null>(null);
  const [history, setHistory] = useState<MarketingQuote[]>([]);
  const [historyError, setHistoryError] = useState("");

  const key = useRef("");
  const workspaceRef = useRef<HTMLDivElement>(null);
  const catalogueRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLElement>(null);
  const { user, loading } = useUser(false,'customer');

  useEffect(() => {
    if (!serviceId && typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash === "#catalogue" || hash === "#custom-media-plan") {
        setIntent("studio");
      }
    }
  }, [serviceId]);

  useEffect(() => {
    let active = true;
    void Promise.allSettled([client.livePricing(), client.capabilities()]).then(
      async ([liveRes, availability]) => {
        if (!active) return;
        if (liveRes.status === "fulfilled") {
          setHydrated(hydrateLivePricing(liveRes.value));
          setLive(true);
        } else {
          try {
            const cat = await client.catalogue();
            if (!active) return;
            setHydrated((prev) => ({ ...prev, catalogue: cat }));
            setLive(true);
          } catch {
            if (!active) return;
            setNotice(
              "Live pricing could not load. Showing indicative proposals only.",
            );
          }
        }
        if (availability.status === "fulfilled") {
          setCapabilities(availability.value);
        }
      },
    );
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (user) {
      void client
        .requests()
        .then((result) => {
          if (active) setHistory(result.items);
        })
        .catch(() => {
          if (active) {
            setHistoryError(
              "Quotation history is unavailable on this server.",
            );
          }
        });
    }
    return () => {
      active = false;
    };
  }, [user, confirmation]);

  const detailService = serviceId
    ? catalogue.services.find((item) => item.id === serviceId && item.enabled)
    : undefined;
  const activeQuoteService =
    detailService ??
    catalogue.services.find(
      (item) => item.id === draft.service_id && item.enabled,
    ) ??
    catalogue.services.find((item) => item.enabled);
  const selectedPackage =
    activeQuoteService?.starting_price_paise === null
      ? undefined
      : catalogue.packages.find((pack) => pack.id === draft.package_id);

  const items = searchPricing(catalogue, query, category, billing);
  const selectedTier =
    vAdsTiers.find((t) => t.id === selectedTierId) ?? vAdsTiers[0];
  const boostEstimate = computeTierBoostEstimate(selectedTier, 30);
  const feeLabel = (svc: (typeof catalogue.services)[number]) =>
    serviceFeeLabels[svc.id] ?? serviceFeeClarity(svc);
  const ServiceIcon =
    icons[
      catalogue.categories.findIndex(
        (c) => c.id === detailService?.category_ids[0],
      )
    ] ?? Monitor;

  function change(field: keyof QuoteDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function selectPlanService(nextServiceId: string, presetBrief?: string) {
    const nextSvc = catalogue.services.find((s) => s.id === nextServiceId);
    key.current = "";
    setConfirmation(null);
    setError("");
    setDraft((current) => ({
      ...current,
      service_id: nextServiceId,
      package_id:
        nextSvc?.starting_price_paise === null ? "" : current.package_id,
      requirements:
        presetBrief && !current.requirements.trim()
          ? presetBrief
          : current.requirements,
    }));
  }

  function openCustomMediaPlan(targetServiceId: string, presetBrief?: string) {
    setIntent("studio");
    selectPlanService(targetServiceId, presetBrief);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
  }

  function newRequest() {
    setConfirmation(null);
    setError("");
    key.current = "";
    setDraft({
      ...emptyQuote(serviceId ?? draft.service_id ?? "digital-campaign"),
      package_id: "",
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (
      !activeQuoteService ||
      !user ||
      !capabilities?.quote_requests_available
    ) {
      return;
    }
    setBusy(true);
    try {
      if (
        activeQuoteService.starting_price_paise === null &&
        (!draft.area.trim() ||
          !draft.media_format.trim() ||
          !draft.campaign_duration.trim())
      ) {
        throw new Error(
          "Enter the preferred area, media format and campaign duration.",
        );
      }
      if (!key.current) key.current = quoteKey();
      const result = await client.submit(
        quotePayload(
          { ...draft, service_id: activeQuoteService.id },
          key.current,
        ),
      );
      setConfirmation(result);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const packageComparison = (
    <section className={styles.section} id="compare">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>STANDALONE MONTHLY RETAINERS</p>
          <h2>Compare marketing packages</h2>
        </div>
      </div>
      <p>
        Standalone agency retainers are separate from seller membership Basic,
        Plus, and Premium. Third-party ad media spend and GST are extra.
      </p>
      <div className={styles.packages}>
        {catalogue.packages.map((pack) => (
          <article className={styles.package} key={pack.id}>
            <h3>{pack.name}</h3>
            <strong>
              {formatPricingMoney(pack.monthly_price_paise)}
              <small>/month</small>
            </strong>
            <ul>
              {pack.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <p>{pack.note}</p>
            {detailService && detailService.starting_price_paise !== null ? (
              <button
                type="button"
                className={styles.primary}
                onClick={() => {
                  change("package_id", pack.id);
                  formRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }}
              >
                Choose {pack.name}
              </button>
            ) : !detailService ? (
              <button
                type="button"
                className={styles.primary}
                onClick={() => {
                  setIntent("studio");
                  setDraft((current) => ({
                    ...current,
                    service_id:
                      activeQuoteService?.starting_price_paise === null
                        ? "social-management"
                        : current.service_id || "social-management",
                    package_id: pack.id,
                  }));
                  setTimeout(() => {
                    formRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }, 40);
                }}
              >
                Request {pack.name}
                <ChevronRight size={16} />
              </button>
            ) : (
              <Link
                className={styles.primary}
                href={pricingHref("social-management") + "?package=" + pack.id}
              >
                Request {pack.name}
                <ChevronRight size={16} />
              </Link>
            )}
          </article>
        ))}
      </div>
    </section>
  );

  const quoteFormSection = activeQuoteService ? (
    <section
      className={styles.section}
      id={detailService ? "request" : "custom-media-plan"}
      ref={formRef}
    >
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>
            {detailService
              ? "SCOPED SERVICE QUOTATION"
              : "CUSTOM MEDIA & AGENCY BRIEF"}
          </p>
          <h2>
            {detailService
              ? "Tell us about your project"
              : "Request Custom Media Plan"}
          </h2>
        </div>
      </div>
      <p>
        A quote request is not an order, payment, or confirmed media placement.
        We return an itemised INR scope (separating management/production fees,
        pass-through media spend, and 18% GST) for your approval.
      </p>
      {!capabilities?.quote_requests_available && (
        <p className={styles.notice} role="status">
          {capabilities?.message ??
            "Quotation submission is unavailable on this server. You can review the scope, but nothing has been submitted."}
        </p>
      )}
      <form onSubmit={(event) => void submit(event)}>
        <fieldset
          className={styles.form}
          disabled={busy || Boolean(confirmation)}
        >
          <legend>Project &amp; contact details</legend>
          {!detailService && (
            <label className={styles.full}>
              Primary service or media vertical
              <select
                aria-label="Primary service or media vertical"
                value={activeQuoteService.id}
                onChange={(event) => selectPlanService(event.target.value)}
              >
                {catalogue.services
                  .filter((item) => item.enabled)
                  .map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name} — {servicePrice(item)}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <label>
            Package
            <select
              aria-label="Package"
              value={draft.package_id}
              onChange={(event) => change("package_id", event.target.value)}
              disabled={activeQuoteService.starting_price_paise === null}
            >
              <option value="">Service scope only</option>
              {activeQuoteService.starting_price_paise !== null &&
                catalogue.packages.map((pack) => (
                  <option value={pack.id} key={pack.id}>
                    {pack.name} - {formatPricingMoney(pack.monthly_price_paise)}
                    /month
                  </option>
                ))}
            </select>
          </label>
          {(selectedPackage || activeQuoteService.billing === "month") && (
            <label>
              Number of months
              <input
                type="number"
                min={1}
                max={24}
                required
                value={draft.months}
                onChange={(event) => change("months", event.target.value)}
              />
            </label>
          )}
          {fields
            .filter(
              ([field]) =>
                activeQuoteService.starting_price_paise === null ||
                !["media_format", "campaign_duration", "quantity"].includes(
                  field,
                ),
            )
            .map(([field, label, type]) => (
              <label key={field}>
                {label}
                <input
                  type={type}
                  required={
                    [
                      "business_name",
                      "contact_name",
                      "email",
                      "phone",
                      "city",
                    ].includes(field) ||
                    (activeQuoteService.starting_price_paise === null &&
                      [
                        "area",
                        "media_format",
                        "campaign_duration",
                        "quantity",
                      ].includes(field))
                  }
                  maxLength={field === "requirements" ? 5000 : 200}
                  min={field === "quantity" ? 1 : undefined}
                  max={field === "quantity" ? 100000 : undefined}
                  value={draft[field] as string}
                  onChange={(event) => change(field, event.target.value)}
                />
              </label>
            ))}
          <label className={styles.full}>
            Requirements
            <textarea
              required
              minLength={20}
              maxLength={5000}
              rows={4}
              placeholder="Share target city/corridors, campaign dates, deliverables, and approximate ad budget..."
              value={draft.requirements}
              onChange={(event) => change("requirements", event.target.value)}
            />
          </label>
          <div className={styles.full}>
            <h3>Optional add-ons (quoted separately)</h3>
            <div className={styles.addons}>
              {activeQuoteService.addons.map((addon) => (
                <label key={addon}>
                  <input
                    type="checkbox"
                    checked={draft.addons.includes(addon)}
                    onChange={() =>
                      setDraft((current) => ({
                        ...current,
                        addons: current.addons.includes(addon)
                          ? current.addons.filter((value) => value !== addon)
                          : [...current.addons, addon],
                      }))
                    }
                  />
                  {addon}
                </label>
              ))}
            </div>
          </div>
        </fieldset>
        <div className={styles.estimate}>
          <span>Indicative base estimate</span>
          <strong>
            {Number.isInteger(Number(draft.months)) &&
            Number.isInteger(Number(draft.months)) &&
            Number(draft.months) >= 1 &&
            Number(draft.months) <= 24
              ? (() => {
                  const value = baseEstimate(
                    activeQuoteService,
                    selectedPackage,
                    Number(draft.months),
                  );
                  return value === null
                    ? "Quotation required"
                    : formatPricingMoney(value);
                })()
              : "Choose valid months"}
          </strong>
          <small>
            Excludes optional add-ons, paid Google/Meta media spend, 18% GST,
            and third-party fabrication/site charges. Selecting a monthly
            retainer package replaces the single-service base so you are never
            billed twice.
          </small>
        </div>
        {error && (
          <div role="alert" className={styles.error}>
            <p>{error}</p>
            <Link href="/membership">Membership details</Link>{" "}
            <button type="button" onClick={newRequest}>
              Start a new request
            </button>
          </div>
        )}
        {confirmation ? (
          <div className={styles.confirmation} role="status">
            <h3>Quote request received</h3>
            <p>
              Reference: {confirmation.id}. Status: {confirmation.status}. No
              payment or booking has been made.
            </p>
            <button
              type="button"
              className={styles.secondary}
              onClick={newRequest}
            >
              Start another request
            </button>
          </div>
        ) : user ? (
          <button
            className={styles.primary}
            type="submit"
            disabled={busy || !live || !capabilities?.quote_requests_available}
          >
            {busy ? "Submitting..." : "Submit quotation request"}
          </button>
        ) : (
          <Link
            className={styles.primary}
            href={
              "/login?next=" +
              encodeURIComponent(
                detailService
                  ? pricingHref(detailService.id)
                  : "/marketing-pricing#custom-media-plan",
              )
            }
          >
            {loading
              ? "Checking customer session..."
              : "Sign in as customer to request a quote"}
          </Link>
        )}
      </form>
    </section>
  ) : null;

  if (serviceId && !detailService) {
    return (
      <div className={`container ${styles.page}`}>
        <Link href={pricingHref()}>Back to pricing</Link>
        <h1>Service unavailable</h1>
        <p>This service is not in the current public catalogue.</p>
      </div>
    );
  }

  return (
    <article className={`container ${styles.page}`}>
      <nav className={styles.trail}>
        <Link href="/marketing-solutions">
          <ArrowLeft size={16} />
          Ads &amp; Marketing
        </Link>
        <ChevronRight size={14} />
        {detailService ? (
          <Link href={pricingHref()}>Pricing catalogue</Link>
        ) : (
          <span>Pricing &amp; services</span>
        )}
      </nav>

      {detailService ? (
        <section className={styles.hero}>
          <div>
            <ServiceIcon size={30} aria-hidden="true" />
            <p className={styles.eyebrow}>VISTRAH ADS &amp; MARKETING</p>
            <h1>{detailService.name}</h1>
            <p>{detailService.description}</p>
            <div className={styles.actions}>
              <a href="#request" className={styles.primary}>
                Get Quote / Request Service
                <ArrowUpRight size={17} />
              </a>
              <button
                type="button"
                className={styles.secondary}
                aria-expanded={compare}
                onClick={() => setCompare((current) => !current)}
              >
                Compare packages
              </button>
            </div>
          </div>
          <div className={styles.heroAside}>
            <div className={styles.heroVisualWrap}>
              <img
                src={detailVisualForCategory(detailService.category_ids[0]).src}
                alt={detailVisualForCategory(detailService.category_ids[0]).alt}
                className={styles.heroVisualImg}
              />
              <span className={styles.visualPillOverlay}>
                {detailService.category_ids[0]?.toUpperCase() ?? "STUDIO"}
              </span>
            </div>
            <span>INDICATIVE STARTING PRICE</span>
            <strong>{servicePrice(detailService)}</strong>
            <p>{feeLabel(detailService)}</p>
            <p>
              {detailService.pricing_state === "APPROVED"
                ? "Public starting-price fields approved. Your scope still needs a quotation."
                : "Proposed pricing, pending commercial approval."}
            </p>
            <span>No payment or booking is made here.</span>
          </div>
        </section>
      ) : (
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>
              VISTRAH PRICING · ₹0 / FREE FOREVER PLATFORM
            </p>
            <h1>{promo.headline}</h1>
            <p>{promo.subheadline}</p>
            <div className={styles.actions}>
              <Link href={promo.primaryHref} className={styles.primary}>
                {promo.primaryCta}
                <ArrowUpRight size={16} />
              </Link>
              <Link href={promo.secondaryCtaHref} className={styles.secondary}>
                {promo.secondaryCtaLabel}
              </Link>
              <button
                type="button"
                className={styles.secondary}
                onClick={() =>
                  openCustomMediaPlan(
                    pillars[0]?.defaultServiceId ?? "promotional-reel",
                    pillars[0]?.defaultBrief,
                  )
                }
              >
                Explore Paid Studio &amp; Website Quotes
              </button>
            </div>
            <p className={styles.heroMicrocopy}>{promo.microcopy}</p>
          </div>
          <aside
            className={styles.heroAside}
            aria-label="Free Forever Business Listing and Any-Radius V Ads"
          >
            <div className={styles.heroVisualWrap}>
              <img
                src="/images/ads-marketing/free-forever-hero.jpg"
                alt="Local business owner showcasing free map listing and any-radius V Ads reel on VISTRAH"
                className={styles.heroVisualImg}
              />
              <span className={styles.visualPillOverlay}>
                ₹0 / FREE FOREVER · ANY RADIUS
              </span>
            </div>
            <span>{promo.anchorBadge}</span>
            <div className={styles.freePriceRow}>
              <span className={styles.freeZero}>{promo.anchorPriceLabel}</span>
              <span className={styles.freeTitle}>{promo.anchorTitle}</span>
            </div>
            <p>{promo.anchorSummary}</p>
            <div className={styles.anchorActions}>
              <Link href={promo.primaryHref} className={styles.primary}>
                {promo.primaryCta}
                <ChevronRight size={16} />
              </Link>
              <Link href={promo.secondaryCtaHref} className={styles.secondary}>
                {promo.secondaryCtaLabel}
              </Link>
            </div>
          </aside>
        </header>
      )}

      {detailService && <p className={styles.notice}>{catalogue.notice}</p>}
      {notice && (
        <p role="status" className={styles.notice}>
          {notice}
        </p>
      )}

      {!detailService && (
        <>
          <div
            ref={workspaceRef}
            className={styles.intentBar}
            role="tablist"
            aria-label="Choose VISTRAH pricing track"
          >
            <button
              type="button"
              role="tab"
              id="tab-boosts"
              aria-selected={intent === "boosts"}
              aria-controls="panel-boosts"
              className={
                intent === "boosts" ? styles.intentTabActive : styles.intentTab
              }
              onClick={() => setIntent("boosts")}
            >
              <span className={styles.intentTitle}>
                1. Free Forever Platform — ₹0
              </span>
              <span className={styles.intentMeta}>
                Verified local business listings + Creating &amp; uploading V Ads for ANY
                radius inside VISTRAH
              </span>
            </button>
            <button
              type="button"
              role="tab"
              id="tab-studio"
              aria-selected={intent === "studio"}
              aria-controls="panel-studio"
              className={
                intent === "studio" ? styles.intentTabActive : styles.intentTab
              }
              onClick={() => setIntent("studio")}
            >
              <span className={styles.intentTitle}>
                2. VISTRAH Ads &amp; Marketing + Website &amp; Automation
              </span>
              <span className={styles.intentMeta}>
                Done-for-you ad shoots, Meta/Google campaigns, custom websites
                &amp; workflow automation ·{" "}
                {catalogue.services.filter((s) => s.enabled).length} paid
                options
              </span>
            </button>
          </div>

          {intent === "boosts" ? (
            <section
              id="panel-boosts"
              role="tabpanel"
              aria-labelledby="tab-boosts"
              className={styles.section}
            >
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.eyebrow}>
                    ₹0 / FREE FOREVER · ZERO PER-RADIUS FEES · ZERO COMMISSION
                  </p>
                  <h2>
                    Free Business Listing &amp; Free V Ads for Any Radius on
                    VISTRAH
                  </h2>
                </div>
                <span className={styles.countBadge}>
                  ₹0 / Free Forever · Any Radius
                </span>
              </div>
              <div className={styles.estimatorGrid}>
                <div className={styles.estimatorControls}>
                  <div className={styles.controlGroup}>
                    <span className={styles.controlLabel}>
                      Preview Target Radius — Free for Any Radius on VISTRAH
                      (₹0 Forever)
                    </span>
                    <div
                      className={styles.optionGrid}
                      role="group"
                      aria-label="Target radius in kilometres"
                    >
                      {vAdsTiers.map((tier) => {
                        const active = selectedTier.id === tier.id;
                        return (
                          <button
                            key={tier.id}
                            type="button"
                            aria-pressed={active}
                            className={
                              active ? styles.optionBtnActive : styles.optionBtn
                            }
                            onClick={() => setSelectedTierId(tier.id)}
                          >
                            <span className={styles.optionFreeBadge}>
                              {tier.promoBadge || "₹0 Free Forever"}
                            </span>
                            <span className={styles.optionValue}>
                              {tier.label}
                            </span>
                            <span className={styles.optionSub}>
                              ₹0 / Free Forever · {tier.zoneLabel}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <ul className={styles.boostHighlights}>
                    <li>
                      <Check size={16} />
                      <span>
                        <strong>
                          ₹0 / Free Forever — Verified Local Business Listing:
                        </strong>{" "}
                        List in ~3 minutes with shop map pin, direct Call,
                        Website, and Directions.
                      </span>
                    </li>
                    <li>
                      <Check size={16} />
                      <span>
                        <strong>
                          ₹0 / Free Forever — Creating &amp; Uploading V Ads
                          (Any Radius):
                        </strong>{" "}
                        Publish hyperlocal 9:16 Reels across{" "}
                        {selectedTier.label} ({selectedTier.zoneLabel.toLowerCase()}
                        ) or any custom radius inside VISTRAH at ₹0.
                      </span>
                    </li>
                    <li>
                      <Check size={16} />
                      <span>
                        <strong>Need Done-For-You Creative, Website, or Automation?</strong>{" "}
                        Explore paid VISTRAH Ads &amp; Marketing Studio and
                        Website / Workflow Automation packages anytime.
                      </span>
                    </li>
                  </ul>
                </div>

                <div className={styles.ledgerPanel}>
                  <div>
                    <p className={styles.eyebrow}>
                      SELF-SERVE PLATFORM SUMMARY
                    </p>
                    <div className={styles.ledgerFreeBanner}>
                      <div>
                        <strong>₹0 / Free Forever</strong>
                        <span>
                          Free for any radius on VISTRAH ({selectedTier.label} ·{" "}
                          {boostEstimate.reachFormatted} est. monthly local
                          views)
                        </span>
                      </div>
                      <strong>₹0</strong>
                    </div>

                    <div className={styles.ledgerSubhead}>
                      What You Pay Inside VISTRAH Self-Serve
                    </div>
                    <div className={styles.ledgerRows}>
                      <div className={styles.ledgerRow}>
                        <span>Verified business listing across India</span>
                        <strong>₹0 / Free Forever</strong>
                      </div>
                      <div className={styles.ledgerRow}>
                        <span>
                          Creating &amp; uploading V Ads ({selectedTier.label}{" "}
                          or any radius)
                        </span>
                        <strong>₹0 / Free Forever</strong>
                      </div>
                      <div className={styles.ledgerRow}>
                        <span>Customer call &amp; lead commission</span>
                        <strong>0% (Direct to you)</strong>
                      </div>
                      <div className={styles.ledgerTotalRow}>
                        <span>Due today &amp; every month</span>
                        <strong>₹0</strong>
                      </div>
                    </div>
                  </div>

                  <div className={styles.controlGroup}>
                    <Link href={promo.primaryHref} className={styles.primary}>
                      {promo.primaryCta}
                      <ArrowUpRight size={16} />
                    </Link>
                    <Link
                      href={promo.secondaryCtaHref}
                      className={styles.secondary}
                    >
                      {promo.secondaryCtaLabel}
                      <ChevronRight size={15} />
                    </Link>
                    <button
                      type="button"
                      className={styles.secondary}
                      onClick={() => setIntent("studio")}
                    >
                      Need Ad Production, Marketing, Website or Automation? View
                      Paid Plans
                      <ChevronRight size={15} />
                    </button>
                    <p className={styles.ledgerNote}>
                      {promo.microcopy}. V Ads uploads and geo-radius targeting
                      are 100% free on VISTRAH and go live after standard
                      quality moderation review.
                    </p>
                  </div>
                </div>
              </div>

              <div className={styles.showcaseGrid}>
                <article className={styles.showcaseCard}>
                  <div className={styles.showcaseVisual}>
                    <img
                      src="/images/ads-marketing/video-content-production.webp"
                      alt="VISTRAH Ads & Marketing commercial video shoot and brand studio"
                      loading="lazy"
                    />
                    <span className={styles.visualPillOverlay}>
                      CREATIVES ₹499+ · REELS ₹2,999
                    </span>
                  </div>
                  <div className={styles.showcaseBody}>
                    <div>
                      <p className={styles.eyebrow}>Brand &amp; Video Studio</p>
                      <h3>VISTRAH Ads &amp; Marketing Studio</h3>
                      <p>
                        Custom commercial video ad production (Reels, Shorts,
                        brand films), graphic &amp; brochure design, and managed
                        Meta/Google/social/outdoor marketing campaigns.
                      </p>
                    </div>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.primary}
                        onClick={() =>
                          openCustomMediaPlan(
                            "promotional-reel",
                            "Looking for custom commercial video ad production, graphic/brochure design, or managed Meta/Google marketing: ",
                          )
                        }
                      >
                        View Studio Rates &amp; Request Quote
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>
                </article>

                <article className={styles.showcaseCard}>
                  <div className={styles.showcaseVisual}>
                    <img
                      src="/images/ads-marketing/website-automation.jpg"
                      alt="Custom business website design and workflow automation on VISTRAH Tech"
                      loading="lazy"
                    />
                    <span className={styles.visualPillOverlay}>
                      WEBSITES ₹4,999+ · WORKFLOW AUTOMATION
                    </span>
                  </div>
                  <div className={styles.showcaseBody}>
                    <div>
                      <p className={styles.eyebrow}>Websites &amp; Workflow Setup</p>
                      <h3>
                        Website &amp; Digital Setup (VISTRAH Tech / Automation)
                      </h3>
                      <p>
                        Custom business website design &amp; launch
                        (mobile-first with Call &amp; WhatsApp capture) and
                        custom business workflow automation.
                      </p>
                    </div>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.primary}
                        onClick={() => {
                          setCategory("websites");
                          setIntent("studio");
                        }}
                      >
                        Explore Website &amp; Automation Plans
                        <ChevronRight size={15} />
                      </button>
                      <Link
                        href="/contact?intent=request-website"
                        className={styles.secondary}
                      >
                        Request Website
                      </Link>
                    </div>
                  </div>
                </article>
              </div>
            </section>
          ) : (
            <section
              id="panel-studio"
              role="tabpanel"
              aria-labelledby="tab-studio"
              className={styles.section}
              ref={catalogueRef}
            >
              <p className={styles.notice}>{promo.studioBoundary}</p>
              <div className={styles.sectionHeading} id="catalogue">
                <div>
                  <p className={styles.eyebrow}>
                    FULL-STACK AGENCY &amp; CITY MEDIA RATE CARD
                  </p>
                  <h2>
                    {catalogue.categories.find((c) => c.id === category)
                      ?.name ?? "VISTRAH Ads & Marketing Studio"}
                  </h2>
                </div>
                <div className={styles.sectionHeadingActions}>
                  <span role="status" className={styles.countBadge}>
                    {items.length} options
                  </span>
                  <button
                    type="button"
                    className={styles.secondary}
                    aria-expanded={compare}
                    onClick={() => setCompare((v) => !v)}
                  >
                    Compare packages
                  </button>
                </div>
              </div>

              <div className={styles.filters}>
                <label>
                  Search services
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Websites, reels, SEO, hoardings, auto branding..."
                  />
                </label>
                <label>
                  Category
                  <select
                    aria-label="Category"
                    value={category}
                    onChange={(event) => {
                      setCategory(event.target.value);
                      setBilling("all");
                      setQuery("");
                    }}
                  >
                    <option value="">All categories</option>
                    {catalogue.categories.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Billing
                  <select
                    aria-label="Billing"
                    value={billing}
                    onChange={(event) => setBilling(event.target.value)}
                  >
                    <option value="all">All pricing</option>
                    <option value="one-time">One-time</option>
                    <option value="month">Monthly</option>
                    <option value="quote">Quotation only</option>
                  </select>
                </label>
              </div>

              <div className={styles.pillars}>
                {pillars.map((pillar) => {
                  const pillarItems = items.filter((item) =>
                    item.category_ids.some((cid) =>
                      pillar.categoryIds.includes(cid),
                    ),
                  );
                  if (!pillarItems.length) return null;
                  return (
                    <div key={pillar.id} className={styles.pillarBlock}>
                      <div className={styles.pillarHeader}>
                        <div className={styles.pillarVisual}>
                          <img
                            src={
                              (PILLAR_VISUALS[pillar.id] ?? PILLAR_VISUALS.creative)
                                .src
                            }
                            alt={
                              (PILLAR_VISUALS[pillar.id] ?? PILLAR_VISUALS.creative)
                                .alt
                            }
                            loading="lazy"
                          />
                        </div>
                        <div className={styles.pillarHeaderContent}>
                          <div className={styles.pillarMeta}>
                            <span className={styles.pillarStep}>
                              Studio Category
                            </span>
                            <h3>{pillar.title}</h3>
                            <p>{pillar.subtitle}</p>
                            <span className={styles.feeRule}>
                              {pillar.feeNote}
                            </span>
                          </div>
                          <button
                            type="button"
                            className={styles.secondary}
                            onClick={() =>
                              openCustomMediaPlan(
                                pillar.defaultServiceId,
                                pillar.defaultBrief,
                              )
                            }
                          >
                            Request Custom Media Plan
                            <ChevronRight size={15} />
                          </button>
                        </div>
                      </div>

                      <div className={styles.services}>
                        {pillarItems.map((item) => (
                          <Link
                            className={styles.service}
                            key={item.id}
                            href={pricingHref(item.id)}
                          >
                            <div className={styles.cardTop}>
                              <span>
                                {item.pricing_state === "APPROVED"
                                  ? "Approved starting price"
                                  : "Indicative proposal"}{" "}
                                · {feeLabel(item)}
                              </span>
                              <ArrowUpRight size={18} />
                            </div>
                            <h4>{item.name}</h4>
                            <strong>{servicePrice(item)}</strong>
                            <span className={styles.deliverableInline}>
                              Key deliverables:{" "}
                              {item.deliverables.slice(0, 3).join(" · ")}
                            </span>
                            <span className={styles.cardAction}>
                              View scope &amp; request quote
                              <ChevronRight size={15} />
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {!items.length && (
                <p role="status">
                  No services match these filters. Try another category or
                  search.
                </p>
              )}
              <p className={styles.notice}>{catalogue.notice}</p>
            </section>
          )}
        </>
      )}

      {detailService && (
        <>
          <section className={styles.detailGrid}>
            <div className={styles.panel}>
              <h2>Proposed inclusions</h2>
              <ul>
                {detailService.deliverables.map((item) => (
                  <li key={item}>
                    <Check size={17} />
                    {item}
                  </li>
                ))}
              </ul>
              <h3>Delivery</h3>
              <p>
                {detailService.delivery_note ??
                  "Delivery duration will be confirmed after reviewing your brief."}
              </p>
            </div>
            <div className={styles.panel}>
              <h2>Exclusions &amp; terms</h2>
              <ul>
                {detailService.exclusions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <h3>Optional add-ons</h3>
              <p>Add-on prices will be confirmed in your quotation.</p>
              <ul>
                {detailService.addons.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </section>
          {detailService.studio_related && (
            <aside className={styles.notice}>
              Already creating your own ad?{" "}
              <Link href="/seller/v-ads">Open V Ads Studio</Link>.
              Creative-service requests do not bypass upload review or
              moderation.
            </aside>
          )}
        </>
      )}

      {compare && packageComparison}

      {(detailService || intent === "studio") && quoteFormSection}

      {!detailService && (
        <>
          <section className={styles.section} aria-labelledby="track-compare">
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>FREE PLATFORM VS. PAID SOLUTIONS</p>
                <h2 id="track-compare">
                  Compare ₹0 Business Listing, Free Any-Radius V Ads &amp; Paid
                  Studio / Tech Services
                </h2>
              </div>
              <button
                type="button"
                className={styles.secondary}
                aria-expanded={compare}
                onClick={() => setCompare((v) => !v)}
              >
                {compare
                  ? "Hide monthly retainers"
                  : "Compare monthly retainers"}
              </button>
            </div>
            <div className={styles.compareTableWrap}>
              <table className={styles.compareTable}>
                <thead>
                  <tr>
                    <th scope="col">Dimension</th>
                    <th scope="col">₹0 Business Listing (Free Forever)</th>
                    <th scope="col">
                      Self-Serve V Ads (₹0 · Free for Any Radius)
                    </th>
                    <th scope="col">
                      Paid Studio, Websites &amp; Automation (Quoted)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {PRICING_COMPARISON_ROWS.map((row) => (
                    <tr key={row.criteria}>
                      <th scope="row">{row.criteria}</th>
                      <td>{row.free}</td>
                      <td>{row.boosts}</td>
                      <td>{row.studio}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="merchant-faqs">
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>BILLING, GST &amp; CAMPAIGN RULES</p>
                <h2 id="merchant-faqs">Frequently asked questions</h2>
              </div>
            </div>
            <div className={styles.faqList}>
              {faqs.map((faq) => (
                <details
                  key={faq.id}
                  className={styles.faqItem}
                  open={faq.defaultOpen}
                >
                  <summary>
                    <span>{faq.question}</span>
                    <ChevronDown size={18} aria-hidden="true" />
                  </summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>
        </>
      )}

      {user && (
        <section className={styles.section}>
          <h2>Your recent marketing requests</h2>
          {historyError && <p role="status">{historyError}</p>}
          {history.map((quote) => (
            <article className={styles.request} key={quote.id}>
              <h3>{quote.service_name}</h3>
              <p>
                {quote.status} - {quote.id}
              </p>
              {quote.customer_note && <p>{quote.customer_note}</p>}
            </article>
          ))}
          {!history.length && !historyError && (
            <p>No marketing quotation requests yet.</p>
          )}
        </section>
      )}
    </article>
  );
}
