'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Check, MapPin, Search, ShieldCheck, X } from 'lucide-react';
import { AuthGate, notifyUserSession } from './customer';
import { UiText } from './localized-ui';
import { Notice, Status, ButtonLink } from './ui';
import { MapFirstLocationPicker } from './vistrah-google-maps';
import { api, ApiError } from '@/lib/api';
import type { ProviderApplication, FieldError } from '@/lib/provider-requirements';
import type { User } from '@/lib/types';
import { legalVersion, sellerLegalCopy } from '../../shared/legal';
import {
  DEFAULT_SELECTED_LOCATION,
  SELLER_COVERAGE_RADII,
  type SelectedLocation,
} from '../../shared/selected-location';
import {
  MAX_SELF_ONBOARDING_TYPES,
  SELF_ONBOARDING_CATEGORIES,
  SELF_ONBOARDING_REGULATIONS,
  findSelfOnboardingType,
  resolveSelfOnboardingInitialSelection,
  searchSelfOnboardingTypes,
  selfOnboardingUrl,
} from '../../shared/self-onboarding';

type RegulatedDraft = {
  registrationNumber: string;
  file?: { filename: string; media_type: string; content_base64: string };
};

type SubmitResponse = {
  applications: ProviderApplication[];
  user: User;
};

export function SelfOnboardingWizard({
  initialPlaceId,
  initialCategory,
  initialSubcategory,
  initialType,
  providerId,
  initialBusinessName,
  initialLocality,
}: {
  initialPlaceId?: string;
  initialCategory?: string;
  initialSubcategory?: string;
  initialType?: string;
  providerId?: number;
  initialBusinessName?: string;
  initialLocality?: string;
}) {
  const nextHref = selfOnboardingUrl({
    place_id: initialPlaceId,
    category: initialCategory,
    subcategory: initialSubcategory,
    type: initialType,
    business: providerId ?? initialBusinessName,
    locality: initialLocality,
  });
  return (
    <AuthGate next={nextHref}>
      {(user) => (
        <div className="container page">
          <WizardInner
            user={user}
            initialPlaceId={initialPlaceId}
            initialCategory={initialCategory}
            initialSubcategory={initialSubcategory}
            initialType={initialType}
            providerId={providerId}
            initialBusinessName={initialBusinessName}
            initialLocality={initialLocality}
          />
        </div>
      )}
    </AuthGate>
  );
}

function WizardInner({
  user,
  initialPlaceId,
  initialCategory,
  initialSubcategory,
  initialType,
  providerId,
  initialBusinessName,
  initialLocality,
}: {
  user: User;
  initialPlaceId?: string;
  initialCategory?: string;
  initialSubcategory?: string;
  initialType?: string;
  providerId?: number;
  initialBusinessName?: string;
  initialLocality?: string;
}) {
  const resolvedInitial = resolveSelfOnboardingInitialSelection({
    category: initialCategory,
    subcategory: initialSubcategory,
    type: initialType,
  });
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [activeCategory, setActiveCategory] = useState<string>(resolvedInitial.categorySlug);
  const [activeSubcategory, setActiveSubcategory] = useState<string>(
    resolvedInitial.subcategorySlug ?? 'all',
  );
  const [showAllTypes, setShowAllTypes] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(
    resolvedInitial.typeSlug ? [resolvedInitial.typeSlug] : [],
  );

  const [businessName, setBusinessName] = useState(initialBusinessName || '');
  const [contactName, setContactName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [sameWhatsapp, setSameWhatsapp] = useState(true);
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState(user.email || '');
  const [loc, setLoc] = useState<SelectedLocation>({
    ...DEFAULT_SELECTED_LOCATION,
    radiusKm: 10,
  });
  const [address, setAddress] = useState(DEFAULT_SELECTED_LOCATION.formattedAddress);
  const [locality, setLocality] = useState(initialLocality || DEFAULT_SELECTED_LOCATION.locality);
  const [pincode, setPincode] = useState(DEFAULT_SELECTED_LOCATION.pincode);
  const [timings, setTimings] = useState('');
  const [description, setDescription] = useState('');
  const [regulatedDrafts, setRegulatedDrafts] = useState<Record<string, RegulatedDraft>>({});

  const [acceptTerms, setAcceptTerms] = useState(Boolean(user.seller_enabled));
  const [marketingConsent, setMarketingConsent] = useState(Boolean(user.marketing_consent));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([]);
  const [submitted, setSubmitted] = useState<ProviderApplication[] | null>(null);

  const selectedTypes = selectedSlugs
    .map((slug) => findSelfOnboardingType(slug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const regulatedTypes = selectedTypes.filter((bt) => Boolean(bt.regulated));
  const activeCatObj = SELF_ONBOARDING_CATEGORIES.find((c) => c.slug === activeCategory);
  const visibleTypes = searchSelfOnboardingTypes(
    searchQuery,
    activeCategory,
    !searchQuery.trim() && activeSubcategory !== 'all' ? activeSubcategory : undefined,
  );
  const cappedTypes =
    showAllTypes || Boolean(searchQuery.trim())
      ? visibleTypes.slice(0, 120)
      : visibleTypes.slice(0, 48);

  function toggleType(slug: string) {
    setError('');
    setSelectedSlugs((prev) => {
      if (prev.includes(slug)) return prev.filter((item) => item !== slug);
      if (prev.length >= MAX_SELF_ONBOARDING_TYPES) {
        setError(`You can select up to ${MAX_SELF_ONBOARDING_TYPES} business types at once.`);
        return prev;
      }
      return [...prev, slug];
    });
  }

  function handleLocationUpdate(next: SelectedLocation) {
    setLoc(next);
    if (next.formattedAddress) setAddress(next.formattedAddress);
    if (next.locality || next.city) setLocality(next.locality || next.city);
    if (next.pincode) setPincode(next.pincode);
  }

  async function attachRegulatedFile(slug: string, file: File | null) {
    if (!file) {
      setRegulatedDrafts((prev) => ({
        ...prev,
        [slug]: { registrationNumber: prev[slug]?.registrationNumber ?? '' },
      }));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Upload a PDF, JPEG or PNG of at most 2 MB.');
      return;
    }
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
      setError('Use a valid PDF, JPEG or PNG file.');
      return;
    }
    setError('');
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
        reader.onerror = () => reject(new Error('The file could not be read.'));
        reader.readAsDataURL(file);
      });
      setRegulatedDrafts((prev) => ({
        ...prev,
        [slug]: {
          registrationNumber: prev[slug]?.registrationNumber ?? '',
          file: { filename: file.name, media_type: file.type, content_base64: base64 },
        },
      }));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function proceedToReview() {
    setError('');
    setFieldErrors([]);
    if (businessName.trim().length < 2) {
      setError('Enter your business or shop name (at least 2 characters).');
      return;
    }
    if (contactName.trim().length < 2) {
      setError('Enter the contact person name.');
      return;
    }
    if (!/^\+?[0-9 ()-]{10,20}$/.test(phone.trim())) {
      setError('Enter a valid 10-digit phone number.');
      return;
    }
    const effectiveWhatsapp = sameWhatsapp ? phone.trim() : whatsapp.trim();
    if (effectiveWhatsapp && !/^\+?[0-9 ()-]{10,20}$/.test(effectiveWhatsapp)) {
      setError('Enter a valid WhatsApp number or leave it blank.');
      return;
    }
    if (address.trim().length < 5 || locality.trim().length < 2) {
      setError('Confirm your business address and locality on the map or form.');
      return;
    }
    if (pincode.trim() && !/^[0-9]{6}$/.test(pincode.trim())) {
      setError('PIN code must be 6 digits (or leave it blank).');
      return;
    }
    setStep(3);
  }

  async function handleSubmit() {
    if (!acceptTerms) {
      setError(sellerLegalCopy.required);
      return;
    }
    setBusy(true);
    setError('');
    setFieldErrors([]);
    try {
      const regulationsPayload: Record<
        string,
        { registration_number?: string; document?: { filename: string; media_type: string; content_base64: string } }
      > = {};
      for (const bt of regulatedTypes) {
        const draft = regulatedDrafts[bt.slug];
        if (draft && (draft.registrationNumber.trim() || draft.file)) {
          regulationsPayload[bt.slug] = {
            ...(draft.registrationNumber.trim() ? { registration_number: draft.registrationNumber.trim() } : {}),
            ...(draft.file ? { document: draft.file } : {}),
          };
        }
      }
      const effectiveWhatsapp = sameWhatsapp ? phone.trim() : whatsapp.trim();
      const response = await api<SubmitResponse>('/provider-onboarding/submit', {
        method: 'POST',
        body: JSON.stringify({
          business_types: selectedSlugs,
          business_name: businessName.trim(),
          contact_name: contactName.trim(),
          phone: phone.trim(),
          whatsapp: effectiveWhatsapp,
          email: email.trim() || user.email,
          address: address.trim(),
          location: locality.trim(),
          pincode: pincode.trim(),
          latitude: loc.latitude,
          longitude: loc.longitude,
          coverage_radius_km: loc.radiusKm,
          timings: timings.trim(),
          description: description.trim(),
          regulations: regulationsPayload,
          accept_terms: true,
          privacy_policy_version: legalVersion,
          marketing_consent: marketingConsent,
          ...(providerId ? { provider_id: providerId } : {}),
          ...(initialPlaceId ? { place_id: initialPlaceId } : {}),
        }),
      });
      notifyUserSession?.(response.user);
      setSubmitted(response.applications);
    } catch (e) {
      setError((e as Error).message);
      setFieldErrors(e instanceof ApiError ? e.errors : []);
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <section className="provider-onboarding" style={{ maxWidth: 760, margin: '0 auto', display: 'grid', gap: 16 }}>
        <p className="eyebrow">
          <UiText value="SUBMITTED FOR REVIEW" />
        </p>
        <h1>
          <UiText value="Your business onboarding is submitted!" />
        </h1>
        <Notice message="Thank you! Our team will review your business details and map pin shortly. Once approved, your business will appear to nearby customers." />
        <div style={{ display: 'grid', gap: 12 }}>
          {submitted.map((app) => (
            <article key={app.id} className="request-card" style={{ display: 'grid', gap: 6 }}>
              <div className="row-between">
                <strong>
                  <UiText value="Reference #" />
                  {app.id.slice(0, 8)}
                </strong>
                <Status context="application" value={app.status} />
              </div>
              <p style={{ margin: 0 }}>{app.services.map((s) => s.title).join(' · ')}</p>
            </article>
          ))}
        </div>
        <div className="replica-actions">
          <ButtonLink href="/seller">
            <UiText value="Go to Seller Dashboard" />
          </ButtonLink>
          <ButtonLink href="/account/provider-applications" secondary>
            <UiText value="View My Applications" />
          </ButtonLink>
        </div>
      </section>
    );
  }

  return (
    <div className="provider-onboarding" style={{ display: 'grid', gap: 20 }}>
      <div>
        <p className="eyebrow">
          <UiText value="₹0 / FREE FOREVER · SELF-ONBOARD IN ~3 MINUTES" />
        </p>
        <h1>
          <UiText value="List your business free on VISTRAH" />
        </h1>
        <p style={{ color: 'var(--muted, #475569)', maxWidth: 680 }}>
          <UiText value="Listing your business across VISTRAH's 10 unified sectors (800+ service types) and uploading V Ads (free for any radius on VISTRAH) cost ₹0 forever. Pick your sector & service types, pin your location, and submit — optional licences are only shown for regulated professions." />
        </p>
      </div>

      {/* 3-Step Indicator */}
      <nav aria-label="Onboarding progress" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {(
          [
            [1, '1. What do you do?'],
            [2, '2. Business basics'],
            [3, '3. Review & Submit'],
          ] as const
        ).map(([num, label]) => {
          const active = step === num;
          const canJump = num === 1 || (num === 2 && selectedSlugs.length > 0);
          return (
            <button
              key={num}
              type="button"
              className={`button ${active ? '' : 'secondary'}`}
              aria-current={active ? 'step' : undefined}
              disabled={!canJump && !active}
              onClick={() => {
                if (num === 1) setStep(1);
                else if (num === 2 && selectedSlugs.length > 0) setStep(2);
              }}
            >
              <UiText value={label} />
            </button>
          );
        })}
      </nav>

      {error && <Notice error message={error} />}
      {!!fieldErrors.length && (
        <ul className="provider-error-list" role="alert">
          {fieldErrors.map((err, idx) => (
            <li key={idx}>{err.message}</li>
          ))}
        </ul>
      )}

      {/* Selected Business Types Summary Bar */}
      {selectedTypes.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 8,
            padding: '12px 14px',
            borderRadius: 10,
            border: '1px solid rgba(15, 23, 42, 0.12)',
            background: '#f8fafc',
          }}
        >
          <strong style={{ fontSize: 13 }}>
            Selected ({selectedTypes.length}/{MAX_SELF_ONBOARDING_TYPES}):
          </strong>
          {selectedTypes.map((bt) => (
            <span
              key={bt.slug}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 999,
                background: '#0f172a',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {bt.title}
              <button
                type="button"
                aria-label={`Remove ${bt.title}`}
                onClick={() => toggleType(bt.slug)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'inline-flex',
                }}
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* STEP 1: WHAT DO YOU DO? */}
      {step === 1 && (
        <section className="provider-section" style={{ display: 'grid', gap: 18 }}>
          <div>
            <h2 style={{ marginBottom: 4 }}>
              <UiText value="1. What does your business do?" />
            </h2>
            <p style={{ margin: 0, color: 'var(--muted, #475569)' }}>
              <UiText value="Type 1–2 letters below to search 800+ services instantly (e.g. Plumber, Dental Clinic, Tractor, Tiffin, GST) or browse the 15 categories. Pick up to 3 services." />
            </p>
          </div>

          <label style={{ display: 'grid', gap: 6 }}>
            <span className="sr-only">Search 800+ business types</span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search
                size={18}
                aria-hidden="true"
                style={{ position: 'absolute', left: 12, color: '#64748b', pointerEvents: 'none' }}
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowAllTypes(false);
                }}
                placeholder="Search 800+ services (e.g. Plumber, Dental Clinic, Tractor, South Indian Restaurant, GST)..."
                style={{ paddingLeft: 38, width: '100%' }}
              />
            </div>
          </label>

          {!searchQuery.trim() && (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="tablist" aria-label="15 Business Categories">
                {SELF_ONBOARDING_CATEGORIES.map((cat) => {
                  const isActive = cat.slug === activeCategory;
                  return (
                    <button
                      key={cat.slug}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => {
                        setActiveCategory(cat.slug);
                        setActiveSubcategory('all');
                        setShowAllTypes(false);
                      }}
                      className={`catalogue-choice${isActive ? ' selected' : ''}`}
                      style={{ padding: '8px 14px', width: 'auto' }}
                    >
                      <span>{cat.title}</span>
                    </button>
                  );
                })}
              </div>

              {activeCatObj && activeCatObj.subcategories.length > 1 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }} aria-label="Subcategory filter">
                  <button
                    type="button"
                    aria-pressed={activeSubcategory === 'all'}
                    onClick={() => {
                      setActiveSubcategory('all');
                      setShowAllTypes(false);
                    }}
                    style={{
                      padding: '5px 11px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                      border: activeSubcategory === 'all' ? '1.5px solid #0f172a' : '1px solid rgba(15, 23, 42, 0.16)',
                      background: activeSubcategory === 'all' ? '#0f172a' : '#f8fafc',
                      color: activeSubcategory === 'all' ? '#ffffff' : '#334155',
                      cursor: 'pointer',
                    }}
                  >
                    All ({activeCatObj.types.length})
                  </button>
                  {activeCatObj.subcategories.map((sub) => {
                    const subActive = activeSubcategory === sub.slug;
                    return (
                      <button
                        key={sub.slug}
                        type="button"
                        aria-pressed={subActive}
                        onClick={() => {
                          setActiveSubcategory(sub.slug);
                          setShowAllTypes(false);
                        }}
                        style={{
                          padding: '5px 11px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 600,
                          border: subActive ? '1.5px solid #0f172a' : '1px solid rgba(15, 23, 42, 0.16)',
                          background: subActive ? '#0f172a' : '#f8fafc',
                          color: subActive ? '#ffffff' : '#334155',
                          cursor: 'pointer',
                        }}
                      >
                        {sub.title} ({sub.count})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: 12,
            }}
          >
            {cappedTypes.map((bt) => {
              const chosen = selectedSlugs.includes(bt.slug);
              return (
                <button
                  key={bt.slug}
                  type="button"
                  aria-pressed={chosen}
                  onClick={() => toggleType(bt.slug)}
                  style={{
                    textAlign: 'left',
                    padding: 14,
                    borderRadius: 12,
                    border: chosen ? '2px solid #0f172a' : '1px solid rgba(15, 23, 42, 0.14)',
                    background: chosen ? '#f1f5f9' : '#ffffff',
                    cursor: 'pointer',
                    display: 'grid',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <strong style={{ fontSize: 15, color: '#0f172a' }}>{bt.title}</strong>
                    <span
                      aria-hidden="true"
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 999,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: chosen ? '#0f172a' : 'rgba(15, 23, 42, 0.06)',
                        color: chosen ? '#ffffff' : '#0f172a',
                        flexShrink: 0,
                      }}
                    >
                      {chosen ? <Check size={14} /> : '+'}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                    {searchQuery.trim() ? `${bt.categoryTitle} › ${bt.subcategoryTitle}` : bt.subcategoryTitle}
                  </span>
                  <span style={{ fontSize: 13, color: '#475569', lineHeight: 1.4 }}>{bt.description}</span>
                  {bt.regulated && (
                    <span style={{ fontSize: 11, color: '#0369a1' }}>
                      Optional licence for Verified badge
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {visibleTypes.length > cappedTypes.length && (
            <div>
              <button
                type="button"
                className="button secondary"
                onClick={() => setShowAllTypes(true)}
              >
                Show all {visibleTypes.length} services
              </button>
            </div>
          )}

          {!visibleTypes.length && (
            <p style={{ color: '#64748b' }}>
              No matching business type found for &ldquo;{searchQuery}&rdquo;. Clear search to browse all 15 categories.
            </p>
          )}

          <div className="replica-actions" style={{ justifyContent: 'space-between' }}>
            <Link className="text-link" href="/seller">
              <UiText value="Back to Seller Dashboard" />
            </Link>
            <button
              type="button"
              className="button"
              disabled={!selectedSlugs.length}
              onClick={() => {
                setError('');
                setStep(2);
              }}
            >
              <UiText value="Continue to Business Basics →" />
            </button>
          </div>
        </section>
      )}

      {/* STEP 2: BUSINESS BASICS */}
      {step === 2 && (
        <section className="provider-section form" style={{ display: 'grid', gap: 18 }}>
          <div>
            <h2 style={{ marginBottom: 4 }}>
              <UiText value="2. Business basics & map pin" />
            </h2>
            <p style={{ margin: 0, color: 'var(--muted, #475569)' }}>
              <UiText value="Tell customers who you are, how to reach you, and where you serve." />
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            <label>
              <UiText value="Business or shop name *" />
              <input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Annapoorna Tiffin Centre"
                minLength={2}
                maxLength={150}
                required
              />
            </label>
            <label>
              <UiText value="Contact person name *" />
              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Your full name"
                minLength={2}
                maxLength={150}
                required
              />
            </label>
            <label>
              <UiText value="Phone number *" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                maxLength={20}
                required
              />
            </label>
            <label>
              <UiText value="Business email *" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={254}
                required
              />
            </label>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={sameWhatsapp}
                onChange={(e) => setSameWhatsapp(e.target.checked)}
              />
              <span>
                <UiText value="Customers can WhatsApp me on the same phone number" />
              </span>
            </label>
            {!sameWhatsapp && (
              <label style={{ maxWidth: 340 }}>
                <UiText value="WhatsApp number (optional)" />
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+91 98765 43210"
                  maxLength={20}
                />
              </label>
            )}
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            <h3 style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <MapPin size={18} />
              <UiText value="Pin your business location & service radius" />
            </h3>
            <MapFirstLocationPicker
              mode="seller"
              radiusOptions={SELLER_COVERAGE_RADII}
              value={loc}
              busy={busy}
              preferBackendDetails
              onChange={handleLocationUpdate}
              onConfirm={handleLocationUpdate}
              confirmLabel="Confirm Business Pin"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <label style={{ gridColumn: '1 / -1' }}>
              <UiText value="Street / shop address *" />
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Shop number, street, landmark"
                minLength={5}
                maxLength={1000}
                required
              />
            </label>
            <label>
              <UiText value="Area / locality / town *" />
              <input
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                placeholder="e.g. Tarikere, Indiranagar"
                minLength={2}
                maxLength={150}
                required
              />
            </label>
            <label>
              <UiText value="PIN code (optional)" />
              <input
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="577228"
                inputMode="numeric"
                maxLength={6}
              />
            </label>
            <label>
              <UiText value="Timings / working hours (optional)" />
              <input
                value={timings}
                onChange={(e) => setTimings(e.target.value)}
                placeholder="e.g. Mon–Sat, 9:00 AM – 8:00 PM"
                maxLength={200}
              />
            </label>
          </div>

          <label>
            <UiText value="Short description — What do you offer? (optional)" />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="One or two lines customers will see, e.g. Fresh South Indian meals, tiffin & family dining."
              rows={3}
              maxLength={1000}
            />
          </label>

          {regulatedTypes.length > 0 ? (
            <div
              style={{
                padding: 16,
                borderRadius: 12,
                border: '1px solid rgba(3, 105, 161, 0.28)',
                background: '#f0f9ff',
                display: 'grid',
                gap: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={20} color="#0369a1" />
                <strong>
                  <UiText value="Optional Licence / Registration (for Verified badge)" />
                </strong>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: '#334155' }}>
                <UiText value="Optional right now — you can submit without uploading documents and add them later when you want the Verified badge on regulated services." />
              </p>
              {regulatedTypes.map((bt) => {
                const regMeta = bt.regulated ? SELF_ONBOARDING_REGULATIONS[bt.regulated] : undefined;
                if (!regMeta) return null;
                const draft = regulatedDrafts[bt.slug] ?? { registrationNumber: '' };
                return (
                  <div
                    key={bt.slug}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      background: '#ffffff',
                      border: '1px solid rgba(15, 23, 42, 0.1)',
                      display: 'grid',
                      gap: 10,
                    }}
                  >
                    <strong>{bt.title}</strong>
                    <label>
                      {regMeta.label} (optional)
                      <input
                        value={draft.registrationNumber}
                        onChange={(e) =>
                          setRegulatedDrafts((prev) => ({
                            ...prev,
                            [bt.slug]: { ...draft, registrationNumber: e.target.value },
                          }))
                        }
                        maxLength={100}
                        placeholder="Optional registration or licence number"
                      />
                    </label>
                    <label>
                      {regMeta.document} — PDF, JPEG or PNG up to 2 MB (optional, stored privately)
                      <input
                        type="file"
                        accept="application/pdf,image/jpeg,image/png"
                        onChange={(e) => void attachRegulatedFile(bt.slug, e.target.files?.[0] ?? null)}
                      />
                    </label>
                    {draft.file && (
                      <small style={{ color: '#0369a1' }}>Attached privately: {draft.file.filename}</small>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p
              style={{
                margin: 0,
                padding: '10px 14px',
                borderRadius: 10,
                background: '#f0fdf4',
                border: '1px solid rgba(22, 163, 74, 0.25)',
                color: '#166534',
                fontSize: 13,
              }}
            >
              <UiText value="No licence or registration documents are needed for your selected business type." />
            </p>
          )}

          <div className="replica-actions" style={{ justifyContent: 'space-between' }}>
            <button type="button" className="button secondary" onClick={() => setStep(1)}>
              <UiText value="← Back to Business Types" />
            </button>
            <button type="button" className="button" onClick={proceedToReview}>
              <UiText value="Review & Submit →" />
            </button>
          </div>
        </section>
      )}

      {/* STEP 3: REVIEW & SUBMIT */}
      {step === 3 && (
        <section className="provider-section" style={{ display: 'grid', gap: 18 }}>
          <div>
            <h2 style={{ marginBottom: 4 }}>
              <UiText value="3. Review & Submit" />
            </h2>
            <p style={{ margin: 0, color: 'var(--muted, #475569)' }}>
              <UiText value="Confirm your details below and submit in one click. An administrator will review your business before it goes live." />
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gap: 12,
              padding: 16,
              borderRadius: 12,
              border: '1px solid rgba(15, 23, 42, 0.14)',
              background: '#ffffff',
            }}
          >
            <div>
              <small style={{ color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Business Types</small>
              <p style={{ margin: '4px 0 0', fontWeight: 600 }}>
                {selectedTypes.map((bt) => `${bt.categoryTitle} → ${bt.title}`).join(' · ')}
              </p>
            </div>
            <div>
              <small style={{ color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Business & Contact</small>
              <p style={{ margin: '4px 0 0' }}>
                <strong>{businessName}</strong> · {contactName} · {phone}
                {sameWhatsapp ? ' (WhatsApp enabled)' : whatsapp ? ` · WhatsApp: ${whatsapp}` : ''} · {email}
              </p>
              {timings && <p style={{ margin: '4px 0 0', fontSize: 13, color: '#475569' }}>Timings: {timings}</p>}
              {description && <p style={{ margin: '4px 0 0', fontSize: 13, color: '#475569' }}>{description}</p>}
            </div>
            <div>
              <small style={{ color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Location & Coverage</small>
              <p style={{ margin: '4px 0 0' }}>
                {address} ({locality}
                {pincode ? ` - ${pincode}` : ''}) · <strong>{loc.radiusKm} km</strong> service radius
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            <label className="checkbox-label" style={{ alignItems: 'flex-start' }}>
              <input
                type="checkbox"
                checked={acceptTerms}
                disabled={busy}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                style={{ flexShrink: 0, padding: 0, marginTop: 4 }}
              />
              <span>
                <UiText value="I confirm these business details are accurate and I accept the VISTRAH Seller " />
                <Link href="/terms" target="_blank" rel="noopener noreferrer">
                  <UiText value="Terms & Conditions" />
                </Link>
                {', '}
                <Link href="/privacy" target="_blank" rel="noopener noreferrer">
                  <UiText value="Privacy Policy" />
                </Link>
                {', '}
                <UiText value="and " />
                <Link href="/grievance-officer" target="_blank" rel="noopener noreferrer">
                  <UiText value="Grievance Redressal Policy" />
                </Link>
                <UiText value=" of Vistrah India Pvt Limited." />
              </span>
            </label>
            <label className="checkbox-label" style={{ alignItems: 'flex-start' }}>
              <input
                type="checkbox"
                checked={marketingConsent}
                disabled={busy}
                onChange={(e) => setMarketingConsent(e.target.checked)}
                style={{ flexShrink: 0, padding: 0, marginTop: 4 }}
              />
              <span>{sellerLegalCopy.marketing}</span>
            </label>
          </div>

          <div className="replica-actions" style={{ justifyContent: 'space-between' }}>
            <button type="button" className="button secondary" disabled={busy} onClick={() => setStep(2)}>
              <UiText value="← Edit Basics" />
            </button>
            <button type="button" className="button" disabled={busy || !acceptTerms} onClick={() => void handleSubmit()}>
              <UiText value={busy ? 'Submitting for review…' : 'Submit Business for Review'} />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
