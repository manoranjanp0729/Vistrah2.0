"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import {
  formatPricingMoney,
  type AdminPricingResponse,
  type LivePricingItem,
  type LivePricingSection,
} from "../../shared/marketing-pricing";
import styles from "./pricing-editor.module.css";

type EditorTab = "v_ads" | "digital" | "creative" | "outdoor_mobility" | "faqs";

const TABS: { id: EditorTab; label: string; subtitle: string }[] = [
  {
    id: "v_ads",
    label: "1. V Ads Promo & Self-Serve Boosts",
    subtitle: "First-Month-Free banner & km tiers",
  },
  {
    id: "digital",
    label: "2. Digital & Performance Marketing",
    subtitle: "Websites, SEO, Ads & Retainers",
  },
  {
    id: "creative",
    label: "3. Branding & Video Production",
    subtitle: "Graphics, Reels, AI & Studio Video",
  },
  {
    id: "outdoor_mobility",
    label: "4. Outdoor & Mobility Advertising",
    subtitle: "Hoardings, DOOH, Signage & Transit",
  },
  {
    id: "faqs",
    label: "5. Pricing FAQs",
    subtitle: "Merchant GST & trial questions",
  },
];

function paiseToInrString(paise: number | null | undefined): string {
  if (paise === null || paise === undefined) return "";
  return String(paise / 100);
}

function inrStringToPaise(raw: string): number | null {
  const clean = raw.trim();
  if (!clean) return null;
  const num = Number(clean);
  if (!Number.isFinite(num) || num < 0) {
    throw new Error("Enter a valid non-negative INR amount.");
  }
  return Math.round(num * 100);
}

export function PricingEditor() {
  const [tab, setTab] = useState<EditorTab>("v_ads");
  const [sections, setSections] = useState<LivePricingSection[]>([]);
  const [items, setItems] = useState<LivePricingItem[]>([]);
  const [dirtySections, setDirtySections] = useState<Record<string, boolean>>(
    {},
  );
  const [dirtyItems, setDirtyItems] = useState<Record<string, boolean>>({});
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  const [monthlyInputs, setMonthlyInputs] = useState<Record<string, string>>(
    {},
  );
  const [deliverableInputs, setDeliverableInputs] = useState<
    Record<string, string>
  >({});

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // New FAQ inline creation state
  const [newFaqQuestion, setNewFaqQuestion] = useState("");
  const [newFaqAnswer, setNewFaqAnswer] = useState("");

  async function loadPricing() {
    setLoading(true);
    setError("");
    try {
      const res = await api<AdminPricingResponse>("/admin/pricing");
      setSections(res.sections);
      setItems(res.items);
      const pMap: Record<string, string> = {};
      const mMap: Record<string, string> = {};
      const dMap: Record<string, string> = {};
      for (const item of res.items) {
        pMap[item.id] = paiseToInrString(item.price_paise);
        mMap[item.id] = paiseToInrString(item.monthly_price_paise);
        dMap[item.id] = (item.deliverables ?? []).join("\n");
      }
      setPriceInputs(pMap);
      setMonthlyInputs(mMap);
      setDeliverableInputs(dMap);
      setDirtySections({});
      setDirtyItems({});
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPricing();
  }, []);

  function patchSection(id: string, patch: Partial<LivePricingSection>) {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
    setDirtySections((prev) => ({ ...prev, [id]: true }));
    setMessage("");
    setError("");
  }

  function patchSectionMeta(id: string, key: string, value: unknown) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, meta: { ...(s.meta ?? {}), [key]: value } } : s,
      ),
    );
    setDirtySections((prev) => ({ ...prev, [id]: true }));
    setMessage("");
    setError("");
  }

  function patchItem(id: string, patch: Partial<LivePricingItem>) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
    setDirtyItems((prev) => ({ ...prev, [id]: true }));
    setMessage("");
    setError("");
  }

  function patchItemMeta(id: string, key: string, value: unknown) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, meta: { ...(item.meta ?? {}), [key]: value } }
          : item,
      ),
    );
    setDirtyItems((prev) => ({ ...prev, [id]: true }));
    setMessage("");
    setError("");
  }

  async function saveSection(sec: LivePricingSection) {
    setSavingId(`sec:${sec.id}`);
    setError("");
    setMessage("");
    try {
      const updated = await api<LivePricingSection>(
        `/admin/pricing/sections/${encodeURIComponent(sec.id)}`,
        {
          method: "PUT",
          body: JSON.stringify({
            title: sec.title,
            subtitle: sec.subtitle,
            fee_note: sec.fee_note,
            promo_enabled: sec.promo_enabled,
            free_trial_days: Number(sec.free_trial_days) || 0,
            promo_badge: sec.promo_badge,
            cta_label: sec.cta_label,
            cta_href: sec.cta_href,
            meta: sec.meta,
            sort_order: sec.sort_order,
            active: sec.active,
            expected_revision: sec.revision,
          }),
        },
      );
      setSections((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s)),
      );
      setDirtySections((prev) => {
        const next = { ...prev };
        delete next[sec.id];
        return next;
      });
      setMessage(
        `Saved & published section "${updated.title}" (Revision ${updated.revision}). Live on /marketing-pricing.`,
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  async function saveItem(item: LivePricingItem) {
    setSavingId(`item:${item.id}`);
    setError("");
    setMessage("");
    try {
      const billing = item.billing_interval;
      const parsedPrice =
        billing === "quote" || billing === "none"
          ? null
          : inrStringToPaise(priceInputs[item.id] ?? "");
      if (
        item.item_type !== "faq" &&
        billing !== "quote" &&
        billing !== "none" &&
        parsedPrice === null
      ) {
        throw new Error(
          `Enter a starting INR price for "${item.title}" or switch billing to Quotation required.`,
        );
      }
      const parsedMonthly =
        billing === "quote" || billing === "none"
          ? null
          : inrStringToPaise(monthlyInputs[item.id] ?? "");
      const deliverables = (deliverableInputs[item.id] ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      const updated = await api<LivePricingItem>(
        `/admin/pricing/${encodeURIComponent(item.id)}`,
        {
          method: "PUT",
          body: JSON.stringify({
            title: item.title,
            subtitle: item.subtitle,
            description: item.description,
            price_paise: parsedPrice,
            monthly_price_paise: parsedMonthly,
            billing_interval: billing,
            gst_label: item.gst_label,
            free_trial_enabled: item.free_trial_enabled,
            free_trial_days: Number(item.free_trial_days) || 0,
            promo_badge: item.promo_badge,
            deliverables,
            meta: item.meta,
            sort_order: item.sort_order,
            active: item.active,
            expected_revision: item.revision,
          }),
        },
      );
      setItems((prev) =>
        prev.map((row) => (row.id === updated.id ? updated : row)),
      );
      setPriceInputs((prev) => ({
        ...prev,
        [updated.id]: paiseToInrString(updated.price_paise),
      }));
      setMonthlyInputs((prev) => ({
        ...prev,
        [updated.id]: paiseToInrString(updated.monthly_price_paise),
      }));
      setDeliverableInputs((prev) => ({
        ...prev,
        [updated.id]: (updated.deliverables ?? []).join("\n"),
      }));
      setDirtyItems((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      setMessage(
        `Saved & published "${updated.title}" (Revision ${updated.revision}). Storefront updated immediately.`,
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  async function saveAllModified() {
    setSavingId("all");
    setError("");
    setMessage("");
    let savedCount = 0;
    try {
      for (const sec of sections) {
        if (dirtySections[sec.id]) {
          await saveSection(sec);
          savedCount += 1;
        }
      }
      for (const item of items) {
        if (dirtyItems[item.id]) {
          await saveItem(item);
          savedCount += 1;
        }
      }
      setMessage(
        `Saved & published ${savedCount} pricing update${savedCount === 1 ? "" : "s"} to live storefront.`,
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  async function addFaqItem() {
    if (newFaqQuestion.trim().length < 5 || newFaqAnswer.trim().length < 15) {
      setError(
        "Enter a clear FAQ question (min 5 chars) and answer (min 15 chars).",
      );
      return;
    }
    setSavingId("new-faq");
    setError("");
    setMessage("");
    try {
      const slug =
        "faq-" +
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2, 6);
      const created = await api<LivePricingItem>("/admin/pricing/items", {
        method: "POST",
        body: JSON.stringify({
          id: slug,
          section_id: "faqs",
          item_type: "faq",
          title: newFaqQuestion.trim(),
          subtitle: "Merchant FAQ",
          description: newFaqAnswer.trim(),
          price_paise: null,
          monthly_price_paise: null,
          billing_interval: "none",
          gst_label: "",
          free_trial_enabled: false,
          free_trial_days: 0,
          promo_badge: "",
          deliverables: [],
          meta: { default_open: false },
          sort_order: items.filter((i) => i.section_id === "faqs").length + 1,
          active: true,
        }),
      });
      setItems((prev) => [...prev, created]);
      setNewFaqQuestion("");
      setNewFaqAnswer("");
      setMessage(`Added & published new FAQ "${created.title}".`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  const totalDirtyCount =
    Object.keys(dirtySections).length + Object.keys(dirtyItems).length;

  const promoSection = sections.find((s) => s.id === "v_ads_promo");
  const tabSections = useMemo(
    () => sections.filter((s) => s.tab_group === tab),
    [sections, tab],
  );

  const needle = search.trim().toLowerCase();

  if (loading) {
    return (
      <p role="status" className={styles.bannerNotice}>
        Loading live pricing database…
      </p>
    );
  }

  return (
    <div className={styles.workspace}>
      <div className={styles.topBar}>
        <div className={styles.topMeta}>
          <p className={styles.eyebrow}>LIVE STOREFRONT PRICING DATABASE</p>
          <p>
            {sections.length} sections · {items.length} rate-card &amp; FAQ
            records ·{" "}
            {totalDirtyCount > 0
              ? `${totalDirtyCount} unsaved change${totalDirtyCount === 1 ? "" : "s"}`
              : "All changes published"}
          </p>
        </div>
        <div className={styles.topActions}>
          {totalDirtyCount > 0 && (
            <button
              type="button"
              className="button"
              disabled={Boolean(savingId)}
              onClick={() => void saveAllModified()}
            >
              {savingId === "all"
                ? "Publishing all…"
                : `Save & Publish All (${totalDirtyCount})`}
            </button>
          )}
          <button
            type="button"
            className="button secondary"
            disabled={Boolean(savingId)}
            onClick={() => void loadPricing()}
          >
            Reload live values
          </button>
        </div>
      </div>

      {message && (
        <p role="status" className={styles.bannerSuccess}>
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className={styles.bannerError}>
          {error}
        </p>
      )}

      <div
        className={styles.tabs}
        role="tablist"
        aria-label="Pricing editor sections"
      >
        {TABS.map((t) => {
          const secIds = new Set(
            sections.filter((s) => s.tab_group === t.id).map((s) => s.id),
          );
          const count = items.filter((i) => secIds.has(i.section_id)).length;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={active ? styles.tabActive : styles.tab}
              onClick={() => {
                setTab(t.id);
                setSearch("");
              }}
            >
              <span className={styles.tabTitle}>{t.label}</span>
              <span className={styles.tabCount}>
                {count} items · {t.subtitle}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "v_ads" && promoSection && (
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>HERO &amp; V ADS PROMOTION</p>
              <h2>V Ads First-Month-Free Banner &amp; Trial Rules</h2>
              <p>
                Controls the primary hero value proposition, free-month trial
                badge, and Studio separation disclaimer on `/marketing-pricing`.
              </p>
            </div>
            <button
              type="button"
              className="button"
              disabled={Boolean(savingId)}
              onClick={() => void saveSection(promoSection)}
            >
              {savingId === `sec:${promoSection.id}`
                ? "Publishing…"
                : "Save & Publish Promo Banner"}
            </button>
          </div>

          <div className={styles.toggleRow}>
            <label className={styles.checkboxInline}>
              <input
                type="checkbox"
                checked={promoSection.promo_enabled}
                onChange={(e) =>
                  patchSection(promoSection.id, {
                    promo_enabled: e.target.checked,
                  })
                }
              />
              Enable Free Forever Banner (₹0 Listing &amp; Any-Radius V Ads)
            </label>
            <label className={styles.checkboxInline}>
              <input
                type="checkbox"
                checked={promoSection.active}
                onChange={(e) =>
                  patchSection(promoSection.id, { active: e.target.checked })
                }
              />
              Section visible on storefront
            </label>
          </div>

          <div className={styles.fieldGrid3}>
            <label>
              Hero Headline
              <input
                value={promoSection.title}
                maxLength={240}
                onChange={(e) =>
                  patchSection(promoSection.id, { title: e.target.value })
                }
              />
            </label>
            <label>
              Free Trial Days (tabular)
              <input
                type="number"
                min={0}
                max={365}
                className={styles.tabularInput}
                value={promoSection.free_trial_days}
                onChange={(e) =>
                  patchSection(promoSection.id, {
                    free_trial_days: Number(e.target.value) || 0,
                  })
                }
              />
            </label>
            <label>
              Promo Anchor Badge
              <input
                value={promoSection.promo_badge}
                maxLength={160}
                onChange={(e) =>
                  patchSection(promoSection.id, { promo_badge: e.target.value })
                }
              />
            </label>
            <label>
              Primary CTA Button Label
              <input
                value={promoSection.cta_label}
                maxLength={120}
                onChange={(e) =>
                  patchSection(promoSection.id, { cta_label: e.target.value })
                }
              />
            </label>
            <label>
              Primary CTA Destination Href
              <input
                value={promoSection.cta_href}
                maxLength={200}
                onChange={(e) =>
                  patchSection(promoSection.id, { cta_href: e.target.value })
                }
              />
            </label>
            <label>
              Immediate CTA Microcopy
              <input
                value={promoSection.fee_note}
                maxLength={320}
                onChange={(e) =>
                  patchSection(promoSection.id, { fee_note: e.target.value })
                }
              />
            </label>
            <label className={styles.fullSpan}>
              Hero Subheadline
              <textarea
                rows={2}
                value={promoSection.subtitle}
                onChange={(e) =>
                  patchSection(promoSection.id, { subtitle: e.target.value })
                }
              />
            </label>
            <label className={styles.fullSpan}>
              Anchor Card Summary (Right-hand ₹0 Offer Card)
              <textarea
                rows={2}
                value={String(promoSection.meta?.anchor_summary ?? "")}
                onChange={(e) =>
                  patchSectionMeta(
                    promoSection.id,
                    "anchor_summary",
                    e.target.value,
                  )
                }
              />
            </label>
            <label className={styles.fullSpan}>
              Studio Boundary Disclaimer (Separating Self-Serve V Ads from
              Quoted Studio Services)
              <textarea
                rows={2}
                value={String(promoSection.meta?.studio_boundary ?? "")}
                onChange={(e) =>
                  patchSectionMeta(
                    promoSection.id,
                    "studio_boundary",
                    e.target.value,
                  )
                }
              />
            </label>
          </div>
        </section>
      )}

      {tab !== "v_ads" && tab !== "faqs" && (
        <div className={styles.searchBar}>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter services or packages in this tab…"
            aria-label="Filter pricing items"
          />
        </div>
      )}

      {tabSections.map((sec) => {
        const secItems = items.filter(
          (item) =>
            item.section_id === sec.id &&
            (!needle ||
              `${item.title} ${item.subtitle} ${item.description} ${item.id}`
                .toLowerCase()
                .includes(needle)),
        );

        return (
          <section key={sec.id} className={styles.sectionCard}>
            {sec.id !== "v_ads_promo" && (
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.eyebrow}>
                    SECTION · {sec.step_label || sec.id.toUpperCase()}
                  </p>
                  <h2>{sec.title}</h2>
                  <p>{sec.subtitle}</p>
                </div>
                <button
                  type="button"
                  className="button secondary"
                  disabled={Boolean(savingId)}
                  onClick={() => void saveSection(sec)}
                >
                  {savingId === `sec:${sec.id}`
                    ? "Saving section…"
                    : "Save & Publish Section Header"}
                </button>
              </div>
            )}

            {sec.id !== "v_ads_promo" && sec.id !== "faqs" && (
              <div className={styles.fieldGrid3}>
                <label>
                  Section Title
                  <input
                    value={sec.title}
                    maxLength={240}
                    onChange={(e) =>
                      patchSection(sec.id, { title: e.target.value })
                    }
                  />
                </label>
                <label>
                  Fee / Spend Clarity Rule
                  <input
                    value={sec.fee_note}
                    maxLength={320}
                    onChange={(e) =>
                      patchSection(sec.id, { fee_note: e.target.value })
                    }
                  />
                </label>
                <label className={styles.checkboxInline}>
                  <input
                    type="checkbox"
                    checked={sec.active}
                    onChange={(e) =>
                      patchSection(sec.id, { active: e.target.checked })
                    }
                  />
                  Active on storefront
                </label>
                <label className={styles.fullSpan}>
                  Section Subtitle
                  <input
                    value={sec.subtitle}
                    maxLength={500}
                    onChange={(e) =>
                      patchSection(sec.id, { subtitle: e.target.value })
                    }
                  />
                </label>
              </div>
            )}

            {sec.id === "v_ads_promo" && (
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.eyebrow}>
                    SELF-SERVE SPATIAL &amp; REELS TIERS
                  </p>
                  <h2>V Ads Radius Coverage (₹0 / Free Forever)</h2>
                  <p>
                    Configure radius coverage previews (₹0 forever on VISTRAH),
                    badges, and estimated local reach.
                  </p>
                </div>
              </div>
            )}

            <div className={styles.itemList}>
              {secItems.map((item) => {
                const isDirty = Boolean(dirtyItems[item.id]);
                const isFaq = item.item_type === "faq";
                const isVAds = item.item_type === "v_ads_tier";
                const isQuote = item.billing_interval === "quote";
                const livePaise =
                  isQuote || isFaq
                    ? null
                    : (() => {
                        try {
                          return inrStringToPaise(priceInputs[item.id] ?? "");
                        } catch {
                          return item.price_paise;
                        }
                      })();

                return (
                  <article key={item.id} className={styles.itemRow}>
                    <div className={styles.itemTop}>
                      <div className={styles.itemIdentity}>
                        <h3>{item.title}</h3>
                        <span className={styles.slugBadge}>{item.id}</span>
                        <span
                          className={
                            item.active
                              ? styles.statusActive
                              : styles.statusHidden
                          }
                        >
                          {item.active ? "Active" : "Hidden"}
                        </span>
                        {isDirty && (
                          <span className={styles.dirtyBadge}>Unsaved</span>
                        )}
                      </div>
                      {!isFaq && (
                        <span className={styles.pricePreview}>
                          {isQuote || livePaise === null
                            ? "Quotation required"
                            : `${item.free_trial_enabled ? "₹0 Month 1 → " : "From "}${formatPricingMoney(livePaise)}/${item.billing_interval}`}
                        </span>
                      )}
                    </div>

                    {isFaq ? (
                      <div className={styles.fieldGrid}>
                        <label className={styles.fullSpan}>
                          FAQ Question
                          <input
                            value={item.title}
                            maxLength={240}
                            onChange={(e) =>
                              patchItem(item.id, { title: e.target.value })
                            }
                          />
                        </label>
                        <label className={styles.fullSpan}>
                          FAQ Answer
                          <textarea
                            rows={3}
                            value={item.description}
                            onChange={(e) =>
                              patchItem(item.id, {
                                description: e.target.value,
                              })
                            }
                          />
                        </label>
                        <div className={styles.toggleRow}>
                          <label className={styles.checkboxInline}>
                            <input
                              type="checkbox"
                              checked={item.active}
                              onChange={(e) =>
                                patchItem(item.id, { active: e.target.checked })
                              }
                            />
                            Visible on pricing page
                          </label>
                          <label className={styles.checkboxInline}>
                            <input
                              type="checkbox"
                              checked={Boolean(item.meta?.default_open)}
                              onChange={(e) =>
                                patchItemMeta(
                                  item.id,
                                  "default_open",
                                  e.target.checked,
                                )
                              }
                            />
                            Expanded by default
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.fieldGrid3}>
                        <label>
                          Plan / Service Title
                          <input
                            value={item.title}
                            maxLength={240}
                            onChange={(e) =>
                              patchItem(item.id, { title: e.target.value })
                            }
                          />
                        </label>
                        <label>
                          Billing Interval
                          <select
                            value={item.billing_interval}
                            onChange={(e) =>
                              patchItem(item.id, {
                                billing_interval: e.target
                                  .value as LivePricingItem["billing_interval"],
                              })
                            }
                          >
                            {isVAds && <option value="day">Per day</option>}
                            <option value="one-time">One-time</option>
                            <option value="month">Monthly</option>
                            <option value="quote">Quotation required</option>
                          </select>
                        </label>
                        <label>
                          {isVAds
                            ? "Platform Rate (INR · 0 = Free Forever)"
                            : "Starting Price (INR)"}
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            disabled={isQuote}
                            className={styles.tabularInput}
                            placeholder={
                              isQuote ? "Quotation required" : "e.g. 4999"
                            }
                            value={isQuote ? "" : (priceInputs[item.id] ?? "")}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPriceInputs((prev) => ({
                                ...prev,
                                [item.id]: val,
                              }));
                              if (isVAds && val.trim() !== "") {
                                const n = Number(val);
                                if (Number.isFinite(n) && n >= 0) {
                                  setMonthlyInputs((prev) => ({
                                    ...prev,
                                    [item.id]: String(Math.round(n * 30)),
                                  }));
                                }
                              }
                              setDirtyItems((prev) => ({
                                ...prev,
                                [item.id]: true,
                              }));
                            }}
                          />
                        </label>

                        {isVAds && (
                          <>
                            <label>
                              30-Day Rate (INR · 0 = Free Forever)
                              <input
                                type="number"
                                min={0}
                                step="1"
                                className={styles.tabularInput}
                                value={monthlyInputs[item.id] ?? ""}
                                onChange={(e) => {
                                  setMonthlyInputs((prev) => ({
                                    ...prev,
                                    [item.id]: e.target.value,
                                  }));
                                  setDirtyItems((prev) => ({
                                    ...prev,
                                    [item.id]: true,
                                  }));
                                }}
                              />
                            </label>
                            <label>
                              Promo Badge Text
                              <input
                                value={item.promo_badge}
                                maxLength={120}
                                onChange={(e) =>
                                  patchItem(item.id, {
                                    promo_badge: e.target.value,
                                  })
                                }
                              />
                            </label>
                            <label>
                              Free Trial Days
                              <input
                                type="number"
                                min={0}
                                max={365}
                                className={styles.tabularInput}
                                value={item.free_trial_days}
                                onChange={(e) =>
                                  patchItem(item.id, {
                                    free_trial_days:
                                      Number(e.target.value) || 0,
                                  })
                                }
                              />
                            </label>
                            <label>
                              Est. Min Views / Day
                              <input
                                type="number"
                                min={0}
                                className={styles.tabularInput}
                                value={Number(
                                  item.meta?.reach_min_per_day ?? 0,
                                )}
                                onChange={(e) =>
                                  patchItemMeta(
                                    item.id,
                                    "reach_min_per_day",
                                    Number(e.target.value) || 0,
                                  )
                                }
                              />
                            </label>
                            <label>
                              Est. Max Views / Day
                              <input
                                type="number"
                                min={0}
                                className={styles.tabularInput}
                                value={Number(
                                  item.meta?.reach_max_per_day ?? 0,
                                )}
                                onChange={(e) =>
                                  patchItemMeta(
                                    item.id,
                                    "reach_max_per_day",
                                    Number(e.target.value) || 0,
                                  )
                                }
                              />
                            </label>
                          </>
                        )}

                        <label>
                          Zone / Subtitle Label
                          <input
                            value={item.subtitle}
                            maxLength={240}
                            onChange={(e) =>
                              patchItem(item.id, { subtitle: e.target.value })
                            }
                          />
                        </label>
                        <label className={isVAds ? "" : styles.fullSpan}>
                          GST &amp; Fee Clarity Label
                          <input
                            value={item.gst_label}
                            maxLength={200}
                            onChange={(e) =>
                              patchItem(item.id, { gst_label: e.target.value })
                            }
                          />
                        </label>
                        <label className={styles.fullSpan}>
                          Scope Summary / Description
                          <textarea
                            rows={2}
                            value={item.description}
                            onChange={(e) =>
                              patchItem(item.id, {
                                description: e.target.value,
                              })
                            }
                          />
                        </label>
                        <label className={styles.fullSpan}>
                          Deliverables / Bullet Items (one item per line)
                          <textarea
                            rows={3}
                            value={deliverableInputs[item.id] ?? ""}
                            onChange={(e) => {
                              setDeliverableInputs((prev) => ({
                                ...prev,
                                [item.id]: e.target.value,
                              }));
                              setDirtyItems((prev) => ({
                                ...prev,
                                [item.id]: true,
                              }));
                            }}
                          />
                        </label>
                        <div
                          className={`${styles.toggleRow} ${styles.fullSpan}`}
                        >
                          <label className={styles.checkboxInline}>
                            <input
                              type="checkbox"
                              checked={item.active}
                              onChange={(e) =>
                                patchItem(item.id, { active: e.target.checked })
                              }
                            />
                            Active / Visible on storefront
                          </label>
                          {isVAds && (
                            <label className={styles.checkboxInline}>
                              <input
                                type="checkbox"
                                checked={item.free_trial_enabled}
                                onChange={(e) =>
                                  patchItem(item.id, {
                                    free_trial_enabled: e.target.checked,
                                  })
                                }
                              />
                              Mark as ₹0 Free Forever on VISTRAH
                            </label>
                          )}
                        </div>
                      </div>
                    )}

                    <div className={styles.rowFooter}>
                      <span className={styles.revisionMeta}>
                        Revision {item.revision}
                        {item.updated_at
                          ? ` · Last saved ${new Date(item.updated_at).toLocaleString("en-IN")}`
                          : ""}
                      </span>
                      <button
                        type="button"
                        className="button"
                        disabled={Boolean(savingId)}
                        onClick={() => void saveItem(item)}
                      >
                        {savingId === `item:${item.id}`
                          ? "Publishing…"
                          : "Save & Publish"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {sec.id === "faqs" && (
              <div
                style={{
                  borderTop: "1px solid var(--border)",
                  paddingTop: 16,
                  display: "grid",
                  gap: 12,
                }}
              >
                <p className={styles.eyebrow}>ADD NEW MERCHANT FAQ</p>
                <div className={styles.fieldGrid}>
                  <label className={styles.fullSpan}>
                    Question
                    <input
                      value={newFaqQuestion}
                      maxLength={240}
                      placeholder="e.g. Can we combine V Ads Reels with Outdoor Hoardings?"
                      onChange={(e) => setNewFaqQuestion(e.target.value)}
                    />
                  </label>
                  <label className={styles.fullSpan}>
                    Answer
                    <textarea
                      rows={3}
                      value={newFaqAnswer}
                      placeholder="Write a clear, concise answer for merchants…"
                      onChange={(e) => setNewFaqAnswer(e.target.value)}
                    />
                  </label>
                </div>
                <div>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={Boolean(savingId)}
                    onClick={() => void addFaqItem()}
                  >
                    {savingId === "new-faq"
                      ? "Adding FAQ…"
                      : "+ Add & Publish FAQ"}
                  </button>
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
