import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Text, TextInput } from '../../components/typography';
import { UiElement, UiText } from '../../components/localized-ui';
import { Action, ErrorPanel, Field, Heading, Loading, Page } from '../../components/ui';
import { MobileMapFirstLocationPicker } from '../../components/map-first-location-picker';
import { api } from '../../lib/api';
import { pickEvidence } from '../../lib/evidence';
import { useSession } from '../../lib/session';
import { useTheme } from '../../lib/theme';
import type { ProviderApplication } from '../../lib/provider-requirements';
import { legalVersion, sellerLegalCopy } from '../../../../shared/legal';
import {
  DEFAULT_SELECTED_LOCATION,
  SELLER_COVERAGE_RADII,
  type SelectedLocation,
} from '../../../../shared/selected-location';
import {
  MAX_SELF_ONBOARDING_TYPES,
  SELF_ONBOARDING_CATEGORIES,
  SELF_ONBOARDING_REGULATIONS,
  findSelfOnboardingType,
  resolveSelfOnboardingInitialSelection,
  searchSelfOnboardingTypes,
  selfOnboardingUrl,
} from '../../../../shared/self-onboarding';

type RegulatedDraft = {
  registrationNumber: string;
  file?: { filename: string; media_type: string; content_base64: string };
};

export default function MobileSellerOnboardScreen() {
  const params = useLocalSearchParams<{ category?: string; type?: string; subcategory?: string; business?: string }>();
  const category = typeof params.category === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(params.category) ? params.category : undefined;
  const subcategory = typeof params.subcategory === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(params.subcategory) ? params.subcategory : undefined;
  const type = typeof params.type === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(params.type)
    ? params.type
    : subcategory;
  const business = typeof params.business === 'string' && /^[1-9]\d*$/.test(params.business) ? Number(params.business) : undefined;
  const session = useSession();

  if (!session.ready) {
    return (
      <UiElement as={Page} title="List your business">
        <Loading />
      </UiElement>
    );
  }
  if (!session.user) {
    return (
      <Redirect
        href={{
          pathname: '/auth',
          params: { next: selfOnboardingUrl({ category, subcategory, type, business }) },
        }}
      />
    );
  }

  return (
    <UiElement as={Page} title="List your business">
      <MobileSelfOnboardingForm
        initialCategory={category}
        initialSubcategory={subcategory}
        initialType={type}
        providerId={business}
      />
    </UiElement>
  );
}

function MobileSelfOnboardingForm({
  initialCategory,
  initialSubcategory,
  initialType,
  providerId,
}: {
  initialCategory?: string;
  initialSubcategory?: string;
  initialType?: string;
  providerId?: number;
}) {
  const session = useSession();
  const user = session.user!;
  const { colors, styles } = useTheme();
  const resolved = resolveSelfOnboardingInitialSelection({
    category: initialCategory,
    subcategory: initialSubcategory,
    type: initialType,
  });

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [activeCategory, setActiveCategory] = useState<string>(resolved.categorySlug);
  const [activeSubcategory, setActiveSubcategory] = useState<string>(
    resolved.subcategorySlug ?? 'all',
  );
  const [showAllTypes, setShowAllTypes] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(
    resolved.typeSlug ? [resolved.typeSlug] : [],
  );

  const [businessName, setBusinessName] = useState('');
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
  const [locality, setLocality] = useState(DEFAULT_SELECTED_LOCATION.locality);
  const [pincode, setPincode] = useState(DEFAULT_SELECTED_LOCATION.pincode);
  const [timings, setTimings] = useState('');
  const [description, setDescription] = useState('');
  const [regulatedDrafts, setRegulatedDrafts] = useState<Record<string, RegulatedDraft>>({});

  const [acceptTerms, setAcceptTerms] = useState(Boolean(user.seller_enabled));
  const [marketingConsent, setMarketingConsent] = useState(Boolean(user.marketing_consent));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
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
      ? visibleTypes.slice(0, 100)
      : visibleTypes.slice(0, 48);

  function toggleType(slug: string) {
    setError('');
    setSelectedSlugs((prev) => {
      if (prev.includes(slug)) return prev.filter((item) => item !== slug);
      if (prev.length >= MAX_SELF_ONBOARDING_TYPES) {
        setError(`Select up to ${MAX_SELF_ONBOARDING_TYPES} business types.`);
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

  async function pickRegulatedFile(slug: string) {
    setError('');
    try {
      const picked = await pickEvidence();
      if (!picked) return;
      setRegulatedDrafts((prev) => ({
        ...prev,
        [slug]: {
          registrationNumber: prev[slug]?.registrationNumber ?? '',
          file: picked,
        },
      }));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function proceedToReview() {
    setError('');
    if (businessName.trim().length < 2) {
      setError('Enter your business or shop name.');
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
      setError('Confirm your business address and locality.');
      return;
    }
    if (pincode.trim() && !/^[0-9]{6}$/.test(pincode.trim())) {
      setError('PIN code must be 6 digits (or leave it blank).');
      return;
    }
    setStep(3);
  }

  async function submit() {
    if (!acceptTerms) {
      setError(sellerLegalCopy.required);
      return;
    }
    setBusy(true);
    setError('');
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
      const response = await api<{ applications: ProviderApplication[] }>('/provider-onboarding/submit', {
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
        }),
      });
      await session.refresh();
      setSubmitted(response.applications);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <View style={{ gap: 14 }}>
        <UiElement as={Heading} title="Submitted for review!" />
        <Text style={styles.text}>
          <UiText value="Thank you! Our team will review your business details and map pin shortly. Once approved, your business will appear to nearby customers." />
        </Text>
        {submitted.map((app) => (
          <View key={app.id} style={styles.card}>
            <Text style={styles.label}>
              Reference #{app.id.slice(0, 8)} · {app.status}
            </Text>
            <Text style={styles.text}>{app.services.map((s) => s.title).join(' · ')}</Text>
          </View>
        ))}
        <UiElement as={Action} label="Go to Seller Dashboard" onPress={() => router.replace('/seller')} />
        <UiElement
          as={Action}
          label="View My Applications"
          secondary
          onPress={() => router.replace('/provider-applications')}
        />
      </View>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      <Text style={styles.muted}>
        <UiText value="Pick what your business does in two taps, pin your location, and submit in ~3 minutes. Licences are optional and only requested for regulated professions." />
      </Text>

      {/* 3-Step Pills */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(
          [
            [1, '1. What do you do?'],
            [2, '2. Basics & Pin'],
            [3, '3. Submit'],
          ] as const
        ).map(([num, label]) => {
          const active = step === num;
          const canJump = num === 1 || (num === 2 && selectedSlugs.length > 0);
          return (
            <Pressable
              key={num}
              accessibilityRole="button"
              disabled={!canJump && !active}
              onPress={() => {
                if (num === 1) setStep(1);
                else if (num === 2 && selectedSlugs.length > 0) setStep(2);
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: active ? colors.accent : colors.border,
                backgroundColor: active ? colors.accent : colors.surface,
              }}
            >
              <Text style={{ color: active ? '#ffffff' : colors.text, fontSize: 13, fontWeight: '600' }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {Boolean(error) && <ErrorPanel error={error} />}

      {selectedTypes.length > 0 && (
        <View style={[styles.card, { gap: 8 }]}>
          <Text style={styles.label}>
            Selected ({selectedTypes.length}/{MAX_SELF_ONBOARDING_TYPES})
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {selectedTypes.map((bt) => (
              <Pressable
                key={bt.slug}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${bt.title}`}
                onPress={() => toggleType(bt.slug)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: colors.accent,
                }}
              >
                <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '600' }}>{bt.title}</Text>
                <Feather name="x" size={14} color="#ffffff" />
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {step === 1 && (
        <View style={{ gap: 12 }}>
          <UiElement as={Heading} title="1. What does your business do?" />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 10,
              paddingHorizontal: 12,
              backgroundColor: colors.surface,
            }}
          >
            <Feather name="search" size={16} color={colors.muted} />
            <TextInput
              value={searchQuery}
              onChangeText={(val) => {
                setSearchQuery(val);
                setShowAllTypes(false);
              }}
              placeholder="Search 800+ services (e.g. Plumber, Dental, Tractor, GST)..."
              placeholderTextColor={colors.muted}
              style={[styles.text, { flex: 1, minHeight: 44 }]}
            />
            {Boolean(searchQuery) && (
              <Pressable
                onPress={() => {
                  setSearchQuery('');
                  setShowAllTypes(false);
                }}
                hitSlop={8}
              >
                <Feather name="x-circle" size={16} color={colors.muted} />
              </Pressable>
            )}
          </View>

          {!searchQuery.trim() && (
            <View style={{ gap: 8 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {SELF_ONBOARDING_CATEGORIES.map((cat) => {
                  const active = cat.slug === activeCategory;
                  return (
                    <Pressable
                      key={cat.slug}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: active }}
                      onPress={() => {
                        setActiveCategory(cat.slug);
                        setActiveSubcategory('all');
                        setShowAllTypes(false);
                      }}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 9,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: active ? colors.accent : colors.border,
                        backgroundColor: active ? colors.accent : colors.surface,
                      }}
                    >
                      <Text style={{ color: active ? '#ffffff' : colors.text, fontSize: 13, fontWeight: '600' }}>
                        {cat.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {Boolean(activeCatObj && activeCatObj.subcategories.length > 1) && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  <Pressable
                    onPress={() => {
                      setActiveSubcategory('all');
                      setShowAllTypes(false);
                    }}
                    style={{
                      paddingHorizontal: 11,
                      paddingVertical: 6,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: activeSubcategory === 'all' ? colors.accent : colors.border,
                      backgroundColor: activeSubcategory === 'all' ? colors.accent : colors.surface,
                    }}
                  >
                    <Text
                      style={{
                        color: activeSubcategory === 'all' ? '#ffffff' : colors.text,
                        fontSize: 12,
                        fontWeight: '600',
                      }}
                    >
                      All ({activeCatObj!.types.length})
                    </Text>
                  </Pressable>
                  {activeCatObj!.subcategories.map((sub) => {
                    const subActive = activeSubcategory === sub.slug;
                    return (
                      <Pressable
                        key={sub.slug}
                        onPress={() => {
                          setActiveSubcategory(sub.slug);
                          setShowAllTypes(false);
                        }}
                        style={{
                          paddingHorizontal: 11,
                          paddingVertical: 6,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: subActive ? colors.accent : colors.border,
                          backgroundColor: subActive ? colors.accent : colors.surface,
                        }}
                      >
                        <Text
                          style={{
                            color: subActive ? '#ffffff' : colors.text,
                            fontSize: 12,
                            fontWeight: '600',
                          }}
                        >
                          {sub.title} ({sub.count})
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          )}

          <View style={{ gap: 10 }}>
            {cappedTypes.map((bt) => {
              const chosen = selectedSlugs.includes(bt.slug);
              return (
                <Pressable
                  key={bt.slug}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: chosen }}
                  onPress={() => toggleType(bt.slug)}
                  style={[
                    styles.card,
                    {
                      borderColor: chosen ? colors.accent : colors.border,
                      borderWidth: chosen ? 2 : 1,
                      gap: 4,
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.text, { fontWeight: '700', flex: 1 }]}>{bt.title}</Text>
                    <Feather
                      name={chosen ? 'check-circle' : 'plus-circle'}
                      size={20}
                      color={chosen ? colors.accent : colors.muted}
                    />
                  </View>
                  <Text style={[styles.muted, { fontSize: 11 }]}>
                    {searchQuery.trim() ? `${bt.categoryTitle} › ${bt.subcategoryTitle}` : bt.subcategoryTitle}
                  </Text>
                  <Text style={styles.muted}>{bt.description}</Text>
                  {Boolean(bt.regulated) && (
                    <Text style={[styles.muted, { fontSize: 12 }]}>Optional licence for Verified badge</Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          {visibleTypes.length > cappedTypes.length && (
            <UiElement
              as={Action}
              secondary
              label={`Show all ${visibleTypes.length} services`}
              onPress={() => setShowAllTypes(true)}
            />
          )}

          <UiElement
            as={Action}
            label="Continue to Business Basics"
            disabled={!selectedSlugs.length}
            onPress={() => {
              setError('');
              setStep(2);
            }}
          />
        </View>
      )}

      {step === 2 && (
        <View style={{ gap: 12 }}>
          <UiElement as={Heading} title="2. Business basics & map pin" />
          <UiElement
            as={Field}
            label="Business or shop name *"
            value={businessName}
            maxLength={150}
            onChangeText={setBusinessName}
          />
          <UiElement
            as={Field}
            label="Contact person name *"
            value={contactName}
            maxLength={150}
            onChangeText={setContactName}
          />
          <UiElement
            as={Field}
            label="Phone number *"
            value={phone}
            keyboardType="phone-pad"
            maxLength={20}
            onChangeText={setPhone}
          />
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: sameWhatsapp }}
            onPress={() => setSameWhatsapp((v) => !v)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}
          >
            <Feather name={sameWhatsapp ? 'check-square' : 'square'} size={20} color={colors.accent} />
            <Text style={styles.text}>WhatsApp available on same phone number</Text>
          </Pressable>
          {!sameWhatsapp && (
            <UiElement
              as={Field}
              label="WhatsApp number (optional)"
              value={whatsapp}
              keyboardType="phone-pad"
              maxLength={20}
              onChangeText={setWhatsapp}
            />
          )}
          <UiElement
            as={Field}
            label="Business email *"
            value={email}
            keyboardType="email-address"
            maxLength={254}
            onChangeText={setEmail}
          />

          <UiElement as={Heading} title="Pin your business location" />
          <MobileMapFirstLocationPicker
            mode="seller"
            radiusOptions={SELLER_COVERAGE_RADII}
            value={loc}
            busy={busy}
            onChange={handleLocationUpdate}
            onConfirm={handleLocationUpdate}
            confirmLabel="Confirm Business Pin"
          />

          <UiElement
            as={Field}
            label="Street / shop address *"
            value={address}
            maxLength={1000}
            onChangeText={setAddress}
          />
          <UiElement
            as={Field}
            label="Area / locality / town *"
            value={locality}
            maxLength={150}
            onChangeText={setLocality}
          />
          <UiElement
            as={Field}
            label="PIN code (optional)"
            value={pincode}
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={(v) => setPincode(v.replace(/\D/g, '').slice(0, 6))}
          />
          <UiElement
            as={Field}
            label="Timings / working hours (optional)"
            value={timings}
            maxLength={200}
            onChangeText={setTimings}
          />
          <UiElement
            as={Field}
            label="Short description — What do you offer? (optional)"
            value={description}
            multiline
            maxLength={1000}
            onChangeText={setDescription}
          />

          {regulatedTypes.length > 0 ? (
            <View style={[styles.card, { gap: 10 }]}>
              <Text style={[styles.text, { fontWeight: '700' }]}>
                Optional Licence / Registration (for Verified badge)
              </Text>
              <Text style={styles.muted}>
                Optional right now — you can submit immediately and add licence details later if needed.
              </Text>
              {regulatedTypes.map((bt) => {
                const regMeta = bt.regulated ? SELF_ONBOARDING_REGULATIONS[bt.regulated] : undefined;
                if (!regMeta) return null;
                const draft = regulatedDrafts[bt.slug] ?? { registrationNumber: '' };
                return (
                  <View key={bt.slug} style={{ gap: 8 }}>
                    <Text style={styles.label}>{bt.title}</Text>
                    <UiElement
                      as={Field}
                      label={`${regMeta.label} (optional)`}
                      value={draft.registrationNumber}
                      maxLength={100}
                      onChangeText={(text) =>
                        setRegulatedDrafts((prev) => ({
                          ...prev,
                          [bt.slug]: { ...draft, registrationNumber: text },
                        }))
                      }
                    />
                    <UiElement
                      as={Action}
                      secondary
                      label={draft.file ? `Attached: ${draft.file.filename}` : `Attach ${regMeta.document} (optional)`}
                      onPress={() => void pickRegulatedFile(bt.slug)}
                    />
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.muted}>
              No licence or registration documents are required for your selected business type.
            </Text>
          )}

          <UiElement as={Action} label="Review & Submit" onPress={proceedToReview} />
          <UiElement as={Action} label="Back to Business Types" secondary onPress={() => setStep(1)} />
        </View>
      )}

      {step === 3 && (
        <View style={{ gap: 12 }}>
          <UiElement as={Heading} title="3. Review & Submit" />
          <View style={[styles.card, { gap: 6 }]}>
            <Text style={styles.label}>Business Types</Text>
            <Text style={styles.text}>{selectedTypes.map((bt) => bt.title).join(' · ')}</Text>
            <Text style={styles.label}>Business & Contact</Text>
            <Text style={styles.text}>
              {businessName} · {contactName} · {phone}
            </Text>
            <Text style={styles.label}>Location & Coverage</Text>
            <Text style={styles.text}>
              {address} ({locality}) · {loc.radiusKm} km radius
            </Text>
          </View>

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acceptTerms, disabled: busy }}
            disabled={busy}
            onPress={() => setAcceptTerms((v) => !v)}
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}
          >
            <Feather name={acceptTerms ? 'check-square' : 'square'} size={20} color={colors.accent} />
            <Text style={[styles.text, { flex: 1 }]}>
              I confirm these details are accurate and accept Vistrah India Pvt Limited’s Seller Terms, Privacy Policy & Grievance Policy.
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: marketingConsent, disabled: busy }}
            disabled={busy}
            onPress={() => setMarketingConsent((v) => !v)}
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}
          >
            <Feather name={marketingConsent ? 'check-square' : 'square'} size={20} color={colors.accent} />
            <Text style={[styles.muted, { flex: 1 }]}>{sellerLegalCopy.marketing}</Text>
          </Pressable>

          <UiElement
            as={Action}
            label={busy ? 'Submitting…' : 'Submit Business for Review'}
            disabled={busy || !acceptTerms}
            onPress={() => void submit()}
          />
          <UiElement as={Action} label="Edit Basics" secondary disabled={busy} onPress={() => setStep(2)} />
        </View>
      )}
    </View>
  );
}
