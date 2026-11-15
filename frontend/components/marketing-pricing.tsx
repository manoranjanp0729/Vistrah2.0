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
  FREE_LISTING_ANCHOR,
  VADS_RADIUS_OPTIONS,
  VADS_DURATION_OPTIONS,
  VADS_RADIUS_TIERS,
  estimateVAdsBoost,
  STUDIO_PILLARS,
  serviceFeeClarity,
  PRICING_COMPARISON_ROWS,
  MERCHANT_PRICING_FAQS,
  type PricingIntent,
  type VAdsRadiusKm,
  type VAdsDurationDays,
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

export function MarketingPricing({
  serviceId,
  initialPackage = "",
}: {
  serviceId?: string;
  initialPackage?: string;
}) {
  const [catalogue, setCatalogue] = useState(pricingCatalogue);
  const [live, setLive] = useState(false);
  const [notice, setNotice] = useState("");
  const [capabilities, setCapabilities] = useState<PricingCapabilities | null>(
    null,
  );

  // Buyer-intent state on the overview rate card
  const [intent, setIntent] = useState<PricingIntent>("boosts");
  const [radiusKm, setRadiusKm] = useState<VAdsRadiusKm>(5);
  const [durationDays, setDurationDays] = useState<VAdsDurationDays>(7);

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
    void Promise.allSettled([client.catalogue(), client.capabilities()]).then(
      ([prices, availability]) => {
        if (!active) return;
        if (prices.status === "fulfilled") {
          setCatalogue(prices.value);
          setLive(true);
        } else {
          setNotice(
            "Live pricing could not load. Showing indicative proposals only.",
          );
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
  const boostEstimate = estimateVAdsBoost(radiusKm, durationDays);
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
            <span>INDICATIVE STARTING PRICE</span>
            <strong>{servicePrice(detailService)}</strong>
            <p>{serviceFeeClarity(detailService)}</p>
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
            <p className={styles.eyebrow}>VISTRAH ADS &amp; MARKETING</p>
            <h1>Get discovered within 5 km—or scale across the city</h1>
            <p>
              Transparent INR pricing built for Indian neighbourhood businesses
              and multi-city brands. Start free on spatial search, boost 9:16 V
              Ads Reels by pin-code radius, or brief our full-stack Digital,
              Creative, Outdoor, and Mobility Studio.
            </p>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primary}
                onClick={() => {
                  setIntent("boosts");
                  workspaceRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }}
              >
                Estimate V Ads Boost
                <ArrowUpRight size={16} />
              </button>
              <button
                type="button"
                className={styles.secondary}
                onClick={() =>
                  openCustomMediaPlan(
                    "digital-campaign",
                    STUDIO_PILLARS[0].defaultBrief,
                  )
                }
              >
                Request Custom Media Plan
              </button>
            </div>
          </div>
          <aside
            className={styles.heroAside}
            aria-label="Free Verified Business Listing"
          >
            <span>{FREE_LISTING_ANCHOR.badge}</span>
            <div className={styles.freePriceRow}>
              <span className={styles.freeZero}>
                {FREE_LISTING_ANCHOR.priceLabel}
              </span>
              <span className={styles.freeTitle}>
                Verified Business Listing
              </span>
            </div>
            <p>{FREE_LISTING_ANCHOR.summary}</p>
            <div className={styles.anchorActions}>
              <Link
                href={FREE_LISTING_ANCHOR.primaryHref}
                className={styles.primary}
              >
                {FREE_LISTING_ANCHOR.primaryLabel}
                <ChevronRight size={16} />
              </Link>
              <Link
                href={FREE_LISTING_ANCHOR.secondaryHref}
                className={styles.secondary}
              >
                {FREE_LISTING_ANCHOR.secondaryLabel}
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
            aria-label="Choose advertising model"
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
                1. Self-Serve V Ads Boosts
              </span>
              <span className={styles.intentMeta}>
                Hyperlocal spatial feed &amp; 9:16 Reels · From ₹150/day · 2–25
                km
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
                2. VISTRAH Ads &amp; Marketing Studio
              </span>
              <span className={styles.intentMeta}>
                Digital, Creative/Video, Outdoor &amp; Mobility ·{" "}
                {catalogue.services.filter((s) => s.enabled).length} services
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
                    HYPERLOCAL SPATIAL &amp; REELS DISCOVERY
                  </p>
                  <h2>Self-Serve V Ads Boost Estimator</h2>
                </div>
                <span className={styles.countBadge}>
                  Pin-code radius targeting · 18% GST itemised
                </span>
              </div>
              <div className={styles.estimatorGrid}>
                <div className={styles.estimatorControls}>
                  <div className={styles.controlGroup}>
                    <span className={styles.controlLabel}>
                      Select Target Radius Around Your Business Pin
                    </span>
                    <div
                      className={styles.optionGrid}
                      role="group"
                      aria-label="Target radius in kilometres"
                    >
                      {VADS_RADIUS_OPTIONS.map((km) => {
                        const tier = VADS_RADIUS_TIERS[km];
                        const active = radiusKm === km;
                        return (
                          <button
                            key={km}
                            type="button"
                            aria-pressed={active}
                            className={
                              active ? styles.optionBtnActive : styles.optionBtn
                            }
                            onClick={() => setRadiusKm(km)}
                          >
                            <span className={styles.optionValue}>
                              {tier.label}
                            </span>
                            <span className={styles.optionSub}>
                              {formatPricingMoney(tier.dailyPaise)}/day
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className={styles.controlGroup}>
                    <span className={styles.controlLabel}>
                      Select Campaign Duration
                    </span>
                    <div
                      className={styles.optionGrid}
                      role="group"
                      aria-label="Campaign duration in days"
                    >
                      {VADS_DURATION_OPTIONS.map((days) => {
                        const active = durationDays === days;
                        return (
                          <button
                            key={days}
                            type="button"
                            aria-pressed={active}
                            className={
                              active ? styles.optionBtnActive : styles.optionBtn
                            }
                            onClick={() => setDurationDays(days)}
                          >
                            <span className={styles.optionValue}>
                              {days} days
                            </span>
                            <span className={styles.optionSub}>
                              {formatPricingMoney(
                                VADS_RADIUS_TIERS[radiusKm].dailyPaise * days,
                              )}{" "}
                              + GST
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
                        <strong>{boostEstimate.zoneLabel}:</strong> Reach high-intent
                        customers browsing within {radiusKm} km of your verified
                        coordinates.
                      </span>
                    </li>
                    <li>
                      <Check size={16} />
                      <span>
                        <strong>Spatial Feed + V Ads 9:16 Reels:</strong>{" "}
                        Promote video reels with transparent views, likes, and
                        comments reporting in Seller Studio.
                      </span>
                    </li>
                    <li>
                      <Check size={16} />
                      <span>
                        <strong>Flexible radius &amp; pause control:</strong>{" "}
                        Submit geo-radius revisions or withdraw active videos
                        anytime from Seller Studio.
                      </span>
                    </li>
                  </ul>
                </div>

                <div className={styles.ledgerPanel}>
                  <div>
                    <p className={styles.eyebrow}>INDICATIVE CAMPAIGN LEDGER</p>
                    <div className={styles.reachBox}>
                      <span>Estimated local views ({durationDays} days)</span>
                      <strong>{boostEstimate.reachFormatted} views</strong>
                    </div>
                    <div className={styles.ledgerRows}>
                      <div className={styles.ledgerRow}>
                        <span>Coverage zone</span>
                        <strong>
                          {radiusKm} km · {durationDays} days
                        </strong>
                      </div>
                      <div className={styles.ledgerRow}>
                        <span>Indicative daily rate</span>
                        <strong>
                          {formatPricingMoney(boostEstimate.dailyPaise)} / day
                        </strong>
                      </div>
                      <div className={styles.ledgerRow}>
                        <span>Campaign subtotal ({durationDays} days)</span>
                        <strong>
                          {formatPricingMoney(boostEstimate.subtotalPaise)}
                        </strong>
                      </div>
                      <div className={styles.ledgerRow}>
                        <span>GST (18% · B2B GSTIN ITC eligible)</span>
                        <strong>
                          {formatPricingMoney(boostEstimate.gstPaise)}
                        </strong>
                      </div>
                      <div className={styles.ledgerTotalRow}>
                        <span>Total indicative outlay</span>
                        <strong>
                          {formatPricingMoney(boostEstimate.totalWithGstPaise)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className={styles.controlGroup}>
                    <Link href="/seller/v-ads" className={styles.primary}>
                      Open V Ads Seller Studio
                      <ArrowUpRight size={16} />
                    </Link>
                    <Link
                      href={pricingHref("promotional-reel")}
                      className={styles.secondary}
                    >
                      Need a 9:16 Reel edited? From ₹2,999
                      <ChevronRight size={15} />
                    </Link>
                    <p className={styles.ledgerNote}>
                      Indicative self-serve planning calculator. Video uploads
                      and geo-radius targeting are configured in V Ads Seller
                      Studio and require moderation approval before going live;
                      reach is estimated and not guaranteed.
                    </p>
                  </div>
                </div>
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
                {STUDIO_PILLARS.map((pillar) => {
                  const pillarItems = items.filter((item) =>
                    item.category_ids.some((cid) =>
                      pillar.categoryIds.includes(cid),
                    ),
                  );
                  if (!pillarItems.length) return null;
                  return (
                    <div key={pillar.id} className={styles.pillarBlock}>
                      <div className={styles.pillarHeader}>
                        <div className={styles.pillarMeta}>
                          <span className={styles.pillarStep}>
                            PILLAR {pillar.step}
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
                                · {serviceFeeClarity(item)}
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
                <p className={styles.eyebrow}>CHOOSE THE RIGHT GROWTH STAGE</p>
                <h2 id="track-compare">
                  Compare Free Listing, V Ads Boosts &amp; Studio
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
                    <th scope="col">₹0 Verified Listing (90 Days Free)</th>
                    <th scope="col">Self-Serve V Ads Boosts</th>
                    <th scope="col">VISTRAH Ads &amp; Marketing Studio</th>
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
              {MERCHANT_PRICING_FAQS.map((faq) => (
                <details key={faq.question} className={styles.faqItem}>
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
