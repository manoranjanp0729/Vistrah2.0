import { useMemo, useState } from 'react';
import { Image, Linking, Platform, Pressable, Share, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getApiBase } from '../lib/api';
import { useTheme } from '../lib/theme';
import { Text, TextInput } from './typography';
import {
  LEAD_STATUS_OPTIONS,
  buildQrStandeeListingUrl,
  buildWhatsAppProposalHref,
  buildWhatsAppProposalMessage,
  formatInr,
  isFreeVAdPillarActiveOrTicked,
  recalculateLiveAuditState,
  renderPersonalizedWebsitePreview,
  type BusinessProfileResponse,
  type LeadStatus,
  type SavedAuditLead,
} from '../../../shared/business-audit';
import { buildQrStandeeSvgMarkup, encodeQrMatrix } from '../../../shared/qr-matrix';
import {
  googleMapsDirectionsHrefForPin,
  phoneCallHref,
  resolveListingPhotoUri,
  whatsappChatHref,
} from '../../../shared/nearby-services';

export type MobileSaveLeadPayload = {
  business_id: string;
  google_place_id?: string | null;
  provider_id?: number | null;
  business_name: string;
  sector_slug: string;
  service_type: string;
  city: string;
  phone: string;
  website_url?: string | null;
  photo_url?: string | null;
  is_vistrah_claimed: boolean;
  has_active_v_ad: boolean;
  baseline_score: number;
  ticked_pillar_ids: string[];
  gst_included: boolean;
  lead_status: LeadStatus;
  notes: string;
};

export type MobileRequestWebsitePayload = {
  business_id: string;
  business_name: string;
  sector_slug: string;
  pattern_id: string;
  phone: string;
  city: string;
  notes: string;
};

export function MobileBusinessGrowthAuditView({
  profile,
  viewerMode,
  onSaveLead,
  onRequestWebsite,
}: {
  profile: BusinessProfileResponse;
  viewerMode: 'admin' | 'owner';
  onSaveLead?: (payload: MobileSaveLeadPayload) => Promise<SavedAuditLead>;
  onRequestWebsite: (payload: MobileRequestWebsitePayload) => Promise<void>;
}) {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';
  const { business, flagship_sector, competitor_benchmark } = profile;

  const safeApiBase = useMemo(() => {
    try {
      return getApiBase();
    } catch {
      return '/api';
    }
  }, []);

  const initialActiveVAd = useMemo(
    () =>
      Boolean(
        profile.audit.pillar_breakdown.find(p => p.pillar_id === 'hyperlocal_v_ads')
          ?.active_in_baseline,
      ),
    [profile.audit.pillar_breakdown],
  );

  const [websiteInput, setWebsiteInput] = useState(business.website_url ?? '');
  const [instagramInput, setInstagramInput] = useState(business.instagram_url ?? '');
  const [facebookInput, setFacebookInput] = useState(business.facebook_url ?? '');
  const [tickedIds, setTickedIds] = useState<string[]>(() =>
    profile.saved_lead?.ticked_pillar_ids?.length
      ? [...profile.saved_lead.ticked_pillar_ids]
      : [...flagship_sector.vertical_strategy.recommended_pillar_ids],
  );
  const [gstIncluded, setGstIncluded] = useState<boolean>(
    profile.saved_lead?.gst_included ?? true,
  );
  const [leadStatus, setLeadStatus] = useState<LeadStatus>(
    profile.saved_lead?.lead_status ?? 'audit_shared',
  );
  const [leadNotes, setLeadNotes] = useState(profile.saved_lead?.notes ?? '');
  const [savingLead, setSavingLead] = useState(false);
  const [leadFeedback, setLeadFeedback] = useState('');

  const [viewport, setViewport] = useState<'mobile' | 'desktop'>('mobile');
  const [requestingWebsite, setRequestingWebsite] = useState(false);
  const [websiteFeedback, setWebsiteFeedback] = useState('');
  const [photoFailed, setPhotoFailed] = useState(false);

  const live = useMemo(
    () =>
      recalculateLiveAuditState({
        business,
        hasActiveVAd: initialActiveVAd,
        quickCheck: { websiteInput, instagramInput, facebookInput },
        tickedPillarIds: tickedIds,
        gstIncluded,
      }),
    [business, initialActiveVAd, websiteInput, instagramInput, facebookInput, tickedIds, gstIncluded],
  );

  const websitePreview = useMemo(
    () =>
      renderPersonalizedWebsitePreview({
        sectorSlug: flagship_sector.slug,
        businessName: business.company || business.name,
        city: business.city,
        phone: business.phone,
        serviceTitle: business.service_title,
      }),
    [flagship_sector.slug, business.company, business.name, business.city, business.phone, business.service_title],
  );

  function togglePillar(pid: string) {
    setLeadFeedback('');
    setTickedIds(prev => (prev.includes(pid) ? prev.filter(x => x !== pid) : [...prev, pid]));
  }

  const callUrl = phoneCallHref(business.phone);
  const waUrl = whatsappChatHref(
    business.whatsapp || business.phone,
    business.service_title,
    business.company || business.name,
  );
  const directionsUrl =
    business.latitude != null && business.longitude != null
      ? googleMapsDirectionsHrefForPin(business.latitude, business.longitude)
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${business.company || business.name} ${business.address || business.city}`,
        )}`;
  const photoUri = !photoFailed
    ? resolveListingPhotoUri(business.photo_url, safeApiBase)
    : null;

  const businessDisplayName = business.company || business.name;
  const freeVAdShortcutActive = useMemo(
    () => isFreeVAdPillarActiveOrTicked(live.audit, tickedIds),
    [live.audit, tickedIds],
  );
  const proposalMessage = useMemo(
    () =>
      buildWhatsAppProposalMessage({
        businessName: businessDisplayName,
        sectorTitle: flagship_sector.title,
        city: business.city,
        audit: live.audit,
        simulation: live.simulation,
        cart: live.cart,
        websitePatternTitle: websitePreview.pattern_title,
      }),
    [
      businessDisplayName,
      flagship_sector.title,
      business.city,
      live.audit,
      live.simulation,
      live.cart,
      websitePreview.pattern_title,
    ],
  );
  const proposalWhatsAppUrl = useMemo(
    () => buildWhatsAppProposalHref(business.whatsapp || business.phone, proposalMessage),
    [business.whatsapp, business.phone, proposalMessage],
  );
  const showQrStandee = business.is_claimed || viewerMode === 'admin';
  const qrStandeeUrl = useMemo(
    () =>
      buildQrStandeeListingUrl({
        businessName: businessDisplayName,
        sectorSlug: flagship_sector.slug,
        serviceType: business.service_type,
        city: business.city,
      }),
    [businessDisplayName, flagship_sector.slug, business.service_type, business.city],
  );
  const qrMatrix = useMemo(
    () => (showQrStandee ? encodeQrMatrix(qrStandeeUrl) : null),
    [showQrStandee, qrStandeeUrl],
  );

  function openPrefilledFreeVAdFlow() {
    router.push({
      pathname: '/seller/v-ads',
      params: {
        tab: 'upload',
        business: businessDisplayName,
        category: flagship_sector.slug,
        type: business.service_type,
        locality: business.city,
      },
    });
  }

  function handlePrintOrShareProposal() {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
      return;
    }
    void Share.share({
      title: `VISTRAH Growth Proposal — ${businessDisplayName}`,
      message: proposalMessage,
    });
  }

  function handleDownloadOrShareStandee() {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const svgText = buildQrStandeeSvgMarkup({
        businessName: businessDisplayName,
        sectorTitle: `${flagship_sector.shortTitle}${business.city ? ` · ${business.city}` : ''}`,
        targetUrl: qrStandeeUrl,
      });
      const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const slug =
        businessDisplayName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 48) || 'business';
      anchor.href = blobUrl;
      anchor.download = `vistrah-verified-qr-${slug}.svg`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(blobUrl);
      return;
    }
    void Share.share({
      title: `${businessDisplayName} — VISTRAH Verified Listing`,
      message: `Scan or visit ${businessDisplayName} (${flagship_sector.shortTitle}) on VISTRAH:\n${qrStandeeUrl}`,
    });
  }

  async function handleSaveProposal() {
    if (!onSaveLead) {
      if (waUrl) void Linking.openURL(waUrl);
      setLeadFeedback('Growth plan ready! Connect with VISTRAH Studio to activate paid items.');
      return;
    }
    setSavingLead(true);
    setLeadFeedback('');
    try {
      const saved = await onSaveLead({
        business_id: business.business_id,
        google_place_id: business.google_place_id,
        provider_id: business.provider_id,
        business_name: business.company || business.name,
        sector_slug: flagship_sector.slug,
        service_type: business.service_type,
        city: business.city,
        phone: business.phone,
        website_url: live.effectiveWebsiteUrl,
        photo_url: business.photo_url,
        is_vistrah_claimed: business.is_claimed,
        has_active_v_ad: initialActiveVAd,
        baseline_score: live.audit.baseline_score,
        ticked_pillar_ids: live.simulation.ticked_pillar_ids,
        gst_included: gstIncluded,
        lead_status: leadStatus,
        notes: leadNotes,
      });
      setLeadFeedback(`Saved Proposal & Lead #${saved.id} (${saved.lead_status}).`);
    } catch (err) {
      setLeadFeedback((err as Error).message || 'Could not save proposal.');
    } finally {
      setSavingLead(false);
    }
  }

  async function handleRequestWebsite() {
    setRequestingWebsite(true);
    setWebsiteFeedback('');
    try {
      await onRequestWebsite({
        business_id: business.business_id,
        business_name: business.company || business.name,
        sector_slug: flagship_sector.slug,
        pattern_id: websitePreview.pattern_id,
        phone: business.phone,
        city: business.city,
        notes: `Requested ${websitePreview.pattern_title} website blueprint (${formatInr(4999)} One-Time).`,
      });
      setWebsiteFeedback(
        `Website request logged for "${websitePreview.pattern_title}"! VISTRAH Tech will reach out shortly.`,
      );
    } catch (err) {
      setWebsiteFeedback((err as Error).message || 'Could not submit website request.');
    } finally {
      setRequestingWebsite(false);
    }
  }

  const cardSurface = {
    backgroundColor: isDark ? '#181426' : '#ffffff',
    borderColor: isDark ? '#32264b' : '#e2e8f0',
  };

  return (
    <View style={st.page}>
      {/* MODULE 1: Business Hero & Instant Actions */}
      <View style={st.heroCard}>
        <View style={st.heroTop}>
          <View style={st.heroPhotoWrap}>
            {photoUri ? (
              <Image
                source={{ uri: photoUri }}
                resizeMode="cover"
                onError={() => setPhotoFailed(true)}
                style={{ width: '100%', height: '100%' }}
              />
            ) : (
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Feather name="award" size={24} color="#fde68a" />
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#fde68a' }}>
                  {business.is_claimed ? 'VISTRAH' : 'LOCAL'}
                </Text>
              </View>
            )}
          </View>

          <View style={{ flex: 1, gap: 6 }}>
            <View style={st.badgeRow}>
              <View style={st.sectorPill}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#fde68a' }}>
                  {flagship_sector.shortTitle} · {business.service_title}
                </Text>
              </View>
              <View style={business.is_claimed ? st.verifiedPill : st.googlePill}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: business.is_claimed ? '#6ee7b7' : '#bae6fd',
                  }}
                >
                  {business.is_claimed ? 'VISTRAH Verified' : 'Google Listed'}
                </Text>
              </View>
              <View style={st.ratingPill}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#fde047' }}>
                  ★ {business.rating ? business.rating.toFixed(1) : '4.7'}
                </Text>
              </View>
            </View>

            <Text style={st.heroTitle}>{business.company || business.name}</Text>
            <Text style={{ fontSize: 12.5, color: '#cbd5e1' }}>
              {business.address || business.city}
            </Text>
          </View>
        </View>

        <View style={st.actionRow}>
          {Boolean(callUrl) && (
            <Pressable style={st.heroBtn} onPress={() => void Linking.openURL(callUrl!)}>
              <Feather name="phone" size={13} color="#ffffff" />
              <Text style={st.heroBtnText}>Call</Text>
            </Pressable>
          )}
          {Boolean(waUrl) && (
            <Pressable
              style={[st.heroBtn, { borderColor: 'rgba(34,197,94,0.55)' }]}
              onPress={() => void Linking.openURL(waUrl!)}
            >
              <Ionicons name="logo-whatsapp" size={14} color="#86efac" />
              <Text style={[st.heroBtnText, { color: '#86efac' }]}>WhatsApp</Text>
            </Pressable>
          )}
          <Pressable style={st.heroBtn} onPress={() => void Linking.openURL(directionsUrl)}>
            <Feather name="navigation" size={13} color="#ffffff" />
            <Text style={st.heroBtnText}>Directions</Text>
          </Pressable>
          {Boolean(live.effectiveWebsiteUrl) && (
            <Pressable
              style={st.heroBtn}
              onPress={() => void Linking.openURL(live.effectiveWebsiteUrl!)}
            >
              <Feather name="globe" size={13} color="#ffffff" />
              <Text style={st.heroBtnText}>Website</Text>
            </Pressable>
          )}
          <Pressable
            style={[st.heroBtn, st.goldBtn]}
            onPress={openPrefilledFreeVAdFlow}
          >
            <Feather name="video" size={13} color="#0f172a" />
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0f172a' }}>
              Create & Upload Free V Ad
            </Text>
          </Pressable>
        </View>
      </View>

      {/* MODULE 2: 7-Pillar Digital Presence Score & Competitor Benchmark */}
      <View style={[st.sectionCard, cardSurface]}>
        <Text style={st.eyebrow}>7-PILLAR DIGITAL PRESENCE DIAGNOSTIC</Text>
        <View style={st.scoreBanner}>
          <View>
            <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '600' }}>
              Baseline {live.audit.baseline_score}/100 → Projected
            </Text>
            <Text style={{ fontSize: 28, fontWeight: '800', color: '#fde68a' }}>
              {live.simulation.projected_score} / 100
            </Text>
          </View>
          {live.simulation.score_gain > 0 && (
            <View style={st.verifiedPill}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#6ee7b7' }}>
                +{live.simulation.score_gain} pts
              </Text>
            </View>
          )}
        </View>

        <View style={st.progressTrack}>
          <View
            style={[
              st.progressFill,
              { width: `${Math.min(100, live.simulation.projected_score)}%` },
            ]}
          />
        </View>

        <View style={st.benchmarkBox}>
          <Feather name="trending-up" size={16} color="#2563eb" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.text }}>
              Local Competitor Benchmark ({competitor_benchmark.locality})
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>
              Sector average: {competitor_benchmark.average_score}/100 · Top local:{' '}
              {competitor_benchmark.top_performer_score}/100
            </Text>
          </View>
        </View>

        <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.text }}>
          What This Business Is Lacking ({live.audit.identified_gaps.length}):
        </Text>
        <View style={st.badgeRow}>
          {live.audit.identified_gaps.map(gap => (
            <View key={gap.pillar_id} style={st.gapPill}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#dc2626' }}>
                {gap.product_title} (-{gap.missing_points})
              </Text>
            </View>
          ))}
        </View>

        <View style={{ gap: 8, paddingTop: 4 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted }}>
            Live Quick-Check Inputs (Recalculates Baseline Score Instantly)
          </Text>
          <TextInput
            value={websiteInput}
            onChangeText={setWebsiteInput}
            placeholder="Paste Website URL (e.g. www.yourshop.in)"
            placeholderTextColor={colors.muted}
            style={[st.input, { color: colors.text, borderColor: isDark ? '#32264b' : '#cbd5e1' }]}
          />
          <TextInput
            value={instagramInput}
            onChangeText={setInstagramInput}
            placeholder="Paste Instagram @handle or URL"
            placeholderTextColor={colors.muted}
            style={[st.input, { color: colors.text, borderColor: isDark ? '#32264b' : '#cbd5e1' }]}
          />
          <TextInput
            value={facebookInput}
            onChangeText={setFacebookInput}
            placeholder="Paste Facebook Page URL"
            placeholderTextColor={colors.muted}
            style={[st.input, { color: colors.text, borderColor: isDark ? '#32264b' : '#cbd5e1' }]}
          />
        </View>
      </View>

      {/* MODULE 3: 7-Pillar = 7-Product Configurator & Live Quote Cart */}
      <View style={[st.sectionCard, cardSurface]}>
        <Text style={st.eyebrow}>7-PILLAR = 7-PRODUCT CONFIGURATOR</Text>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
          Tick Pillars & Live Quote Cart
        </Text>

        {live.audit.pillar_breakdown.map(pillar => {
          const isTicked = !pillar.active_in_baseline && tickedIds.includes(pillar.pillar_id);
          return (
            <Pressable
              key={pillar.pillar_id}
              disabled={pillar.active_in_baseline}
              onPress={() => togglePillar(pillar.pillar_id)}
              style={[
                st.pillarCard,
                {
                  borderColor: pillar.active_in_baseline
                    ? 'rgba(16,185,129,0.5)'
                    : isTicked
                      ? '#d4af37'
                      : isDark
                        ? '#32264b'
                        : '#cbd5e1',
                },
              ]}
            >
              <View style={st.pillarHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Feather
                    name={
                      pillar.active_in_baseline
                        ? 'check-circle'
                        : isTicked
                          ? 'check-square'
                          : 'square'
                    }
                    size={17}
                    color={
                      pillar.active_in_baseline
                        ? '#10b981'
                        : isTicked
                          ? '#d4af37'
                          : colors.muted
                    }
                  />
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.text, flex: 1 }}>
                    {pillar.product_title}
                  </Text>
                </View>
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#b45309' }}>
                  +{pillar.max_points} pts
                </Text>
              </View>

              <View style={st.badgeRow}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: pillar.billing_type === 'free_forever' ? '#10b981' : colors.text,
                  }}
                >
                  {pillar.billing_label}
                </Text>
                {pillar.active_in_baseline && (
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#10b981' }}>
                    • Active in Baseline
                  </Text>
                )}
              </View>
              <Text style={{ fontSize: 12, color: colors.muted }}>{pillar.summary}</Text>
            </Pressable>
          );
        })}

        {freeVAdShortcutActive && (
          <View
            style={{
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: 'rgba(16,185,129,0.5)',
              backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : '#ecfdf5',
              gap: 8,
            }}
          >
            <View style={{ gap: 2 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#059669' }}>
                Any-Radius Hyperlocal V Ad (₹0 Free Forever) Ready
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>
                Pre-filled with {businessDisplayName}, {flagship_sector.shortTitle},{' '}
                {business.service_title}, and {business.city}.
              </Text>
            </View>
            <Pressable
              onPress={openPrefilledFreeVAdFlow}
              style={[
                st.heroBtn,
                {
                  backgroundColor: '#059669',
                  borderColor: '#059669',
                  justifyContent: 'center',
                  minHeight: 38,
                },
              ]}
            >
              <Feather name="video" size={14} color="#ffffff" />
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#ffffff' }}>
                Upload Your Free V Ad Now
              </Text>
            </Pressable>
          </View>
        )}

        {/* Selected Products & Pricing Cart */}
        <View style={st.cartCard}>
          <Text style={st.eyebrow}>SELECTED PRODUCTS & PRICING CART</Text>
          <View style={st.cartRow}>
            <Text style={{ fontSize: 13, color: colors.text }}>
              Free on VISTRAH ({live.cart.freeItemsCount} items)
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#10b981' }}>₹0</Text>
          </View>
          <View style={st.cartRow}>
            <Text style={{ fontSize: 13, color: colors.text }}>One-Time Setup Total</Text>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
              {formatInr(live.cart.oneTimeTotalInr)}
            </Text>
          </View>
          <View style={st.cartRow}>
            <Text style={{ fontSize: 13, color: colors.text }}>Monthly Retainer Total</Text>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
              {formatInr(live.cart.monthlyTotalInr)}/mo
            </Text>
          </View>

          <Pressable
            onPress={() => setGstIncluded(v => !v)}
            style={[st.cartRow, { paddingVertical: 4 }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather
                name={gstIncluded ? 'check-square' : 'square'}
                size={15}
                color={colors.accent}
              />
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                Include 18% GST
              </Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
              {formatInr(live.cart.gstAmountInr)}
            </Text>
          </Pressable>

          <View
            style={[
              st.cartRow,
              { paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(148,163,184,0.3)' },
            ]}
          >
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>
              Initial Payable Total
            </Text>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
              {formatInr(live.cart.grandTotalWithGstInr)}
            </Text>
          </View>

          {viewerMode === 'admin' && (
            <View style={{ gap: 8 }}>
              <View style={st.badgeRow}>
                {LEAD_STATUS_OPTIONS.map(opt => (
                  <Pressable
                    key={opt.value}
                    onPress={() => setLeadStatus(opt.value)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 999,
                      backgroundColor: leadStatus === opt.value ? '#0f172a' : 'transparent',
                      borderWidth: 1,
                      borderColor: '#94a3b8',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: leadStatus === opt.value ? '#fde68a' : colors.text,
                      }}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={leadNotes}
                onChangeText={setLeadNotes}
                placeholder="Field visit / follow-up notes…"
                placeholderTextColor={colors.muted}
                style={[
                  st.input,
                  { color: colors.text, borderColor: isDark ? '#32264b' : '#cbd5e1' },
                ]}
              />
            </View>
          )}

          <Pressable
            disabled={savingLead}
            onPress={() => void handleSaveProposal()}
            style={[st.heroBtn, st.goldBtn, { justifyContent: 'center', minHeight: 42 }]}
          >
            <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0f172a' }}>
              {savingLead
                ? 'Saving Proposal…'
                : viewerMode === 'admin'
                  ? 'Save Proposal & Lead'
                  : 'Save & Discuss Growth Plan'}
            </Text>
          </Pressable>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Pressable
              onPress={() => void Linking.openURL(proposalWhatsAppUrl)}
              style={[
                st.heroBtn,
                {
                  flex: 1,
                  minWidth: 160,
                  justifyContent: 'center',
                  minHeight: 40,
                  backgroundColor: '#16a34a',
                  borderColor: '#16a34a',
                },
              ]}
            >
              <Ionicons name="logo-whatsapp" size={15} color="#ffffff" />
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#ffffff' }}>
                Send Proposal on WhatsApp
              </Text>
            </Pressable>

            <Pressable
              onPress={handlePrintOrShareProposal}
              style={[
                st.heroBtn,
                {
                  flex: 1,
                  minWidth: 160,
                  justifyContent: 'center',
                  minHeight: 40,
                  backgroundColor: '#0f172a',
                  borderColor: '#0f172a',
                },
              ]}
            >
              <Feather name="printer" size={14} color="#fde68a" />
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#fde68a' }}>
                Print / Save PDF Proposal
              </Text>
            </Pressable>
          </View>

          {Boolean(leadFeedback) && (
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#10b981' }}>
              {leadFeedback}
            </Text>
          )}
        </View>
      </View>

      {/* MODULE 4 & 5: Live Vertical Website Pattern Preview & Strategy Playbook */}
      <View style={[st.sectionCard, cardSurface]}>
        <View style={st.pillarHeader}>
          <View style={{ flex: 1 }}>
            <Text style={st.eyebrow}>SECTOR WEBSITE BLUEPRINT</Text>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
              {websitePreview.pattern_title}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {(['mobile', 'desktop'] as const).map(vp => (
              <Pressable
                key={vp}
                onPress={() => setViewport(vp)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: viewport === vp ? '#0f172a' : 'transparent',
                  borderWidth: 1,
                  borderColor: '#94a3b8',
                }}
              >
                <Text
                  style={{
                    fontSize: 11.5,
                    fontWeight: '700',
                    color: viewport === vp ? '#fde68a' : colors.text,
                  }}
                >
                  {vp === 'mobile' ? 'Mobile' : 'Desktop'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View
          style={[
            st.websiteMockFrame,
            viewport === 'mobile' ? { maxWidth: 340, alignSelf: 'center', width: '100%' } : null,
          ]}
        >
          <View style={st.browserTop}>
            <Text style={{ fontSize: 11, color: '#cbd5e1' }}>
              https://{websitePreview.domain_preview}
            </Text>
            <Text style={{ fontSize: 11, color: '#fde68a', fontWeight: '700' }}>
              {websitePreview.contact_phone_display}
            </Text>
          </View>
          <View style={{ padding: 14, gap: 10, backgroundColor: '#f8fafc' }}>
            <View style={{ padding: 14, borderRadius: 12, backgroundColor: '#0f172a', gap: 6 }}>
              <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#ffffff' }}>
                {websitePreview.personalized_headline}
              </Text>
              <Text style={{ fontSize: 12, color: '#cbd5e1' }}>
                {websitePreview.personalized_subheadline}
              </Text>
              <View
                style={{
                  alignSelf: 'flex-start',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: '#d4af37',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a' }}>
                  {websitePreview.conversion_cta} →
                </Text>
              </View>
            </View>

            {websitePreview.key_sections.map((sec, idx) => (
              <View
                key={sec}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  backgroundColor: '#ffffff',
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#b45309' }}>
                  MODULE 0{idx + 1}
                </Text>
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#0f172a' }}>{sec}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
          Vertical Conversion Strategy:
        </Text>
        <Text style={{ fontSize: 12.5, color: colors.muted }}>
          {websitePreview.vertical_strategy.summary}
        </Text>
        {websitePreview.vertical_strategy.funnel_steps.map((stepText, idx) => (
          <Text key={stepText} style={{ fontSize: 12.5, color: colors.text }}>
            <Text style={{ fontWeight: '800', color: '#b45309' }}>0{idx + 1}. </Text>
            {stepText}
          </Text>
        ))}

        <Pressable
          disabled={requestingWebsite}
          onPress={() => void handleRequestWebsite()}
          style={[st.heroBtn, st.goldBtn, { justifyContent: 'center', minHeight: 42 }]}
        >
          <Feather name="globe" size={14} color="#0f172a" />
          <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0f172a' }}>
            {requestingWebsite ? 'Submitting Request…' : 'Request This Website (₹4,999)'}
          </Text>
        </Pressable>

        {Boolean(websiteFeedback) && (
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#10b981' }}>
            {websiteFeedback}
          </Text>
        )}
      </View>

      {/* Shopfront "VISTRAH Verified" QR Standee Card */}
      {showQrStandee && qrMatrix && (
        <View style={[st.sectionCard, cardSurface]}>
          <Text style={st.eyebrow}>SHOPFRONT COUNTERTOP STANDEE</Text>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
            VISTRAH Verified QR Card
          </Text>
          <Text style={{ fontSize: 12.5, color: colors.muted }}>
            Customers scan this QR code at the shopfront to view {businessDisplayName}&apos;s live
            verified listing, services, and offers on VISTRAH.
          </Text>

          <View
            style={{
              alignSelf: 'center',
              width: '100%',
              maxWidth: 300,
              padding: 16,
              borderRadius: 18,
              backgroundColor: '#0f172a',
              borderWidth: 1.5,
              borderColor: 'rgba(212,175,55,0.65)',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 1.4,
                color: '#d4af37',
              }}
            >
              VISTRAH VERIFIED PARTNER
            </Text>
            <Text
              numberOfLines={2}
              style={{
                fontSize: 16,
                fontWeight: '800',
                color: '#ffffff',
                textAlign: 'center',
              }}
            >
              {businessDisplayName}
            </Text>
            <View style={st.sectorPill}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#fde68a' }}>
                {flagship_sector.shortTitle}
                {business.city ? ` · ${business.city}` : ''}
              </Text>
            </View>

            {/* Scannable ISO/IEC 18004 QR Matrix */}
            <View
              accessibilityLabel={`VISTRAH Verified QR Code for ${businessDisplayName}`}
              style={{
                padding: 10,
                borderRadius: 12,
                backgroundColor: '#ffffff',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {qrMatrix.map((row: boolean[], rIdx: number) => (
                <View key={rIdx} style={{ flexDirection: 'row' }}>
                  {row.map((dark: boolean, cIdx: number) => (
                    <View
                      key={cIdx}
                      style={{
                        width: qrMatrix.length > 37 ? 3.5 : 4.2,
                        height: qrMatrix.length > 37 ? 3.5 : 4.2,
                        backgroundColor: dark ? '#0f172a' : '#ffffff',
                      }}
                    />
                  ))}
                </View>
              ))}
            </View>

            <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#fde68a' }}>
              SCAN FOR LIVE OFFERS & V ADS
            </Text>
            <Text
              numberOfLines={1}
              style={{ fontSize: 10.5, color: '#94a3b8', textAlign: 'center' }}
            >
              {qrStandeeUrl}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Pressable
              onPress={handleDownloadOrShareStandee}
              style={[
                st.heroBtn,
                st.goldBtn,
                { flex: 1, minWidth: 160, justifyContent: 'center', minHeight: 40 },
              ]}
            >
              <Feather name="download" size={14} color="#0f172a" />
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0f172a' }}>
                {Platform.OS === 'web'
                  ? 'Download Printable QR Standee (SVG)'
                  : 'Share QR Standee Card'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => void Linking.openURL(qrStandeeUrl)}
              style={[
                st.heroBtn,
                {
                  flex: 1,
                  minWidth: 140,
                  justifyContent: 'center',
                  minHeight: 40,
                  backgroundColor: '#0f172a',
                  borderColor: '#0f172a',
                },
              ]}
            >
              <Feather name="external-link" size={14} color="#ffffff" />
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#ffffff' }}>
                Preview Public Listing
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  page: { gap: 16, paddingBottom: 24 },
  heroCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.42)',
    gap: 14,
  },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  heroPhotoWrap: {
    width: 78,
    height: 78,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  sectorPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(212,175,55,0.2)',
  },
  verifiedPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(16,185,129,0.2)',
  },
  googlePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(56,189,248,0.2)',
  },
  ratingPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(250,204,21,0.18)',
  },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroBtnText: { fontSize: 12.5, fontWeight: '700', color: '#ffffff' },
  goldBtn: { backgroundColor: '#d4af37', borderColor: '#d4af37' },
  sectionCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: '#b45309',
  },
  scoreBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#0f172a',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(148,163,184,0.25)',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#d4af37' },
  benchmarkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(59,130,246,0.1)',
  },
  gapPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(239,68,68,0.12)',
  },
  input: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 13,
  },
  pillarCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  pillarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cartCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.55)',
    gap: 8,
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  websiteMockFrame: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#0f172a',
  },
  browserTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0f172a',
  },
});
