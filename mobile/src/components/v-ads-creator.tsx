import {Text} from './typography';
import { useState, useMemo, useRef, useEffect } from 'react';
import {View,Pressable,ScrollView,Image,ActivityIndicator,} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { useVideoPlayer, VideoView } from 'expo-video';

import {UiText,UiElement} from './localized-ui';
import { Action, Field, ErrorPanel } from './ui';
import { radii, tabularNums, useTheme } from '../lib/theme';
import { vAds, toPlayableUrl } from '../lib/v-ads';
import { pickImageForVideo } from '../lib/v-ads-image-picker';
import {
  MARKETING_TEMPLATES,
  MUSIC_MOODS,
  type MarketingTemplate,
  type MarketingTemplateId,
  type MusicMoodId,
  type CreatedVideoResult,
} from '../../../shared/v-ads-templates';
import type { AdvertiserAccount } from '../../../shared/v-ads';

interface VAdsCreatorProps {
  account: AdvertiserAccount | undefined;
  onSubmitted?: () => void;
}

function GeneratedVideoPreview({ videoUrl }: { videoUrl: string }) {
  const { colors } = useTheme();
  const url = useMemo(() => toPlayableUrl(videoUrl), [videoUrl]);
  const player = useVideoPlayer(url || null, instance => {
    instance.loop = true;
    instance.muted = true;
  });

  useEffect(() => {
    return () => {
      try {
        player.pause();
      } catch {}
    };
  }, [player]);

  if (!url) {
    return (
      <View
        style={{
          width: '100%',
          height: 260,
          borderRadius: radii.surface,
          backgroundColor: colors.background,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        <Feather name="video-off" size={24} color={colors.muted} />
        <Text style={{ fontSize: 12, color: colors.muted }}>
          <UiText value="Video preview unavailable" />
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        width: '100%',
        height: 320,
        borderRadius: radii.surface,
        overflow: 'hidden',
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
      }}
    >
      <VideoView
        player={player}
        style={{ width: '100%', height: '100%' }}
        contentFit="contain"
        nativeControls={true}
        fullscreenOptions={{ enable: true }}
      />
    </View>
  );
}

export function VAdsCreator({ account, onSubmitted }: VAdsCreatorProps) {
  const { styles, colors, mode } = useTheme();

  // Template state
  const [selectedTemplateId, setSelectedTemplateId] =
    useState<MarketingTemplateId>('offer-sale');
  const currentTemplate = useMemo(
    () =>
      MARKETING_TEMPLATES.find(t => t.id === selectedTemplateId) ||
      MARKETING_TEMPLATES[0],
    [selectedTemplateId]
  );

  // Form input fields
  const [title, setTitle] = useState(currentTemplate.defaultHeadline);
  const [headline, setHeadline] = useState(currentTemplate.defaultHeadline);
  const [offerBadge, setOfferBadge] = useState(currentTemplate.defaultBadge);
  const [subtitle, setSubtitle] = useState(currentTemplate.tagline);
  const [highlight1, setHighlight1] = useState(
    currentTemplate.defaultHighlights[0] || ''
  );
  const [highlight2, setHighlight2] = useState(
    currentTemplate.defaultHighlights[1] || ''
  );
  const [highlight3, setHighlight3] = useState(
    currentTemplate.defaultHighlights[2] || ''
  );
  const [cta, setCta] = useState(currentTemplate.defaultCta);
  const [contact, setContact] = useState(
    account?.handle ? `@${account.handle}` : 'Visit our shop or call us'
  );
  const [musicMood, setMusicMood] = useState<MusicMoodId>('upbeat');
  const [images, setImages] = useState<string[]>([]);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [createdResult, setCreatedResult] = useState<CreatedVideoResult | null>(
    null
  );

  // When template changes, update defaults
  const handleSelectTemplate = (template: MarketingTemplate) => {
    setSelectedTemplateId(template.id);
    setTitle(template.defaultHeadline);
    setHeadline(template.defaultHeadline);
    setOfferBadge(template.defaultBadge);
    setSubtitle(template.tagline);
    setHighlight1(template.defaultHighlights[0] || '');
    setHighlight2(template.defaultHighlights[1] || '');
    setHighlight3(template.defaultHighlights[2] || '');
    setCta(template.defaultCta);
  };

  // Add photo
  const handleAddPhoto = async () => {
    try {
      setError('');
      const dataUri = await pickImageForVideo();
      if (dataUri) {
        if (images.length >= 4) {
          setError('Maximum 4 photos per video ad.');
          return;
        }
        setImages(prev => [...prev, dataUri]);
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to select image.');
    }
  };

  const handleRemovePhoto = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Generate Video
  const handleGenerate = async () => {
    if (!account) {
      setError('An active seller advertiser profile is required.');
      return;
    }
    if (headline.trim().length < 3) {
      setError('Please provide an ad headline of at least 3 characters.');
      return;
    }

    setGenerating(true);
    setError('');
    setStatusMessage('Compiling vertical video with Ken Burns motion & text overlays…');

    try {
      const highlights = [highlight1, highlight2, highlight3].filter(
        h => h.trim().length > 0
      );
      const result = await vAds.createVideo(account.id, {
        template_id: selectedTemplateId,
        title: title.trim() || headline.trim(),
        headline: headline.trim(),
        subtitle: subtitle.trim(),
        offer_badge: offerBadge.trim(),
        highlights,
        call_to_action: cta.trim() || 'Call Now',
        contact_info: contact.trim(),
        music_mood: musicMood,
        images,
      });

      setCreatedResult(result);
      setStatusMessage('Video generated successfully! Preview below.');
    } catch (err) {
      setError((err as Error).message || 'Video compilation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  // Submit generated video to V Ads feed
  const handleSubmitReview = async () => {
    if (!account || !createdResult) return;
    setSubmitting(true);
    setError('');
    try {
      await vAds.submit(
        account.id,
        createdResult.upload_id,
        title.trim() || headline.trim(),
        `${subtitle.trim()}\n\n${[highlight1, highlight2, highlight3].filter(Boolean).map(h => `• ${h}`).join('\n')}\n\n${contact.trim()}`
      );
      setStatusMessage('V Ad submitted for administrator review!');
      if (onSubmitted) {
        onSubmitted();
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to submit video for review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ gap: 14 }}>
      {/* Introduction Card */}
      <View
        style={[
          styles.card,
          {
            borderRadius: radii.surface,
            padding: 16,
            gap: 8,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
          },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: radii.pill,
              backgroundColor: colors.elevated,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Feather name="film" size={20} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              accessibilityRole="header"
              style={[styles.heading, { fontSize: 17, lineHeight: 22 }]}
            >
              <UiText value="Marketing Ad Video Creator" />
            </Text>
            <Text style={[styles.muted, { fontSize: 12 }]}>
              <UiText value="Choose a template, add your photos & copy, and generate an MP4 video ad." />
            </Text>
          </View>
        </View>
      </View>

      {Boolean(error) && <ErrorPanel error={new Error(error)} />}
      {Boolean(statusMessage) && !error && (
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.elevated,
              borderColor: colors.borderSubtle,
              padding: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            },
          ]}
        >
          <Feather name="check-circle" size={16} color={colors.success} />
          <Text
            style={{
              color: colors.success,
              fontWeight: '600',
              fontSize: 13,
            }}
          >
            <UiText value={statusMessage} />
          </Text>
        </View>
      )}

      {/* Generated Result Banner (if already created) */}
      {createdResult && (
        <View
          style={[
            styles.card,
            {
              borderRadius: radii.surface,
              padding: 16,
              gap: 12,
              borderWidth: 1,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="check-circle" size={18} color={colors.success} />
              <Text style={[styles.heading, { fontSize: 16 }]}>
                <UiText value="Your Video Ad is Ready!" />
              </Text>
            </View>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: radii.pill,
                backgroundColor: colors.elevated,
                borderWidth: 1,
                borderColor: colors.borderSubtle,
              }}
            >
              <Text
                style={{ fontSize: 11, fontWeight: '700', color: colors.success }}
              >
                <UiText value="12s Vertical MP4" />
              </Text>
            </View>
          </View>

          {/* Video Preview */}
          <GeneratedVideoPreview videoUrl={createdResult.video_url} />

          <View style={{ gap: 8, paddingTop: 4 }}>
            <UiElement
              as={Action}
              label={
                submitting
                  ? 'Submitting…'
                  : '✓ Submit V Ad for Admin Review'
              }
              disabled={submitting}
              onPress={() => void handleSubmitReview()}
            />
            <UiElement
              as={Action}
              secondary
              label="Edit & Recreate Video"
              onPress={() => {
                setCreatedResult(null);
                setStatusMessage('');
              }}
            />
          </View>
        </View>
      )}

      {/* STEP 1: TEMPLATE SELECTOR */}
      <View style={[styles.card, { borderRadius: radii.surface, padding: 16, gap: 12 }]}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text
            accessibilityRole="header"
            style={[styles.heading, { fontSize: 15 }]}
          >
            <UiText value="1. Select Marketing Template" />
          </Text>
          <Text style={[styles.muted, { fontSize: 12 }, tabularNums]}>
            {MARKETING_TEMPLATES.length} <UiText value={"templates "}/></Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, paddingVertical: 2 }}
        >
          {MARKETING_TEMPLATES.map(template => {
            const isSelected = template.id === selectedTemplateId;
            return (
              <Pressable
                key={template.id}
                onPress={() => handleSelectTemplate(template)}
                style={({ pressed }) => ({
                  width: 200,
                  borderRadius: radii.surface,
                  padding: 14,
                  gap: 8,
                  backgroundColor: isSelected ? colors.elevated : colors.surface,
                  borderWidth: 1,
                  borderColor: isSelected ? colors.accent : colors.borderSubtle,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: radii.pill,
                      backgroundColor: colors.brandPrimarySoft,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '800',
                        color: colors.brandPrimary,
                      }}
                    >
                      {template.badge}
                    </Text>
                  </View>
                  {isSelected && (
                    <Feather
                      name="check-circle"
                      size={16}
                      color={colors.accent}
                    />
                  )}
                </View>
                <Text
                  numberOfLines={1}
                  style={[styles.heading, { fontSize: 14, lineHeight: 18 }]}
                >
                  {template.name}
                </Text>
                <Text
                  numberOfLines={2}
                  style={[styles.muted, { fontSize: 11.5, lineHeight: 16 }]}
                >
                  {template.tagline}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* STEP 2: PHOTOS / SLIDES */}
      <View style={[styles.card, { borderRadius: radii.surface, padding: 16, gap: 12 }]}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View>
            <Text
              accessibilityRole="header"
              style={[styles.heading, { fontSize: 15 }]}
            >
              <UiText value="2. Ad Photos (1 to 4)" />
            </Text>
            <Text style={[styles.muted, { fontSize: 11.5 }]}>
              <UiText value="Ken Burns zoom motion is applied automatically." />
            </Text>
          </View>
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: radii.pill,
              backgroundColor: colors.elevated,
            }}
          >
            <Text style={[{ fontSize: 11, fontWeight: '700', color: colors.text }, tabularNums]}>
              {images.length} / 4
            </Text>
          </View>
        </View>

        {/* Thumbnail gallery */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, alignItems: 'center' }}
        >
          {images.map((imgUri, idx) => (
            <View
              key={idx}
              style={{
                width: 72,
                height: 100,
                borderRadius: radii.surface,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: colors.borderSubtle,
                position: 'relative',
              }}
            >
              <Image
                source={{ uri: imgUri }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
              <Pressable
                onPress={() => handleRemovePhoto(idx)}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 22,
                  height: 22,
                  borderRadius: radii.pill,
                  backgroundColor: 'rgba(8,8,13,0.75)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Feather name="x" size={13} color={colors.brandPrimaryInk} />
              </Pressable>
            </View>
          ))}

          {images.length < 4 && (
            <Pressable
              onPress={() => void handleAddPhoto()}
              style={({ pressed }) => ({
                width: 80,
                height: 100,
                borderRadius: radii.surface,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: colors.accent,
                backgroundColor: colors.elevated,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Feather name="plus" size={20} color={colors.accent} />
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: colors.accent,
                }}
              >
                <UiText value="+ Photo" />
              </Text>
            </Pressable>
          )}
        </ScrollView>

        {images.length === 0 && (
          <Text style={[styles.muted, { fontSize: 11.5, fontStyle: 'italic' }]}>
            <UiText value="Tip: If no photos are added, elegant template gradient slides will be used." />
          </Text>
        )}
      </View>

      {/* STEP 3: AD COPY & CONTENT */}
      <View style={[styles.card, { borderRadius: radii.surface, padding: 16, gap: 12 }]}>
        <Text
          accessibilityRole="header"
          style={[styles.heading, { fontSize: 15 }]}
        >
          <UiText value="3. Headline & Offer Details" />
        </Text>

        <UiElement
          as={Field}
          label="Ad Headline (Main hook)"
          placeholder="E.g., Special Festive Discount Sale!"
          value={headline}
          onChangeText={setHeadline}
          maxLength={100}
        />

        <UiElement
          as={Field}
          label="Offer Badge (Top pill)"
          placeholder="E.g., FLAT 40% OFF or VERIFIED EXPERTS"
          value={offerBadge}
          onChangeText={setOfferBadge}
          maxLength={30}
        />

        <UiElement
          as={Field}
          label="Subtitle / Sub-headline"
          placeholder="E.g., High-energy discount & seasonal promo"
          value={subtitle}
          onChangeText={setSubtitle}
          maxLength={120}
        />

        <View style={{ gap: 6 }}>
          <Text style={[styles.label, { fontSize: 13, fontWeight: '600' }]}>
            <UiText value="Key Highlights (Bulleted points)" />
          </Text>
          <UiElement
            as={Field}
            label=""
            placeholder="Highlight 1 (e.g., Huge savings on all items)"
            value={highlight1}
            onChangeText={setHighlight1}
            maxLength={60}
          />
          <UiElement
            as={Field}
            label=""
            placeholder="Highlight 2 (e.g., Limited period festive deal)"
            value={highlight2}
            onChangeText={setHighlight2}
            maxLength={60}
          />
          <UiElement
            as={Field}
            label=""
            placeholder="Highlight 3 (e.g., Free local delivery available)"
            value={highlight3}
            onChangeText={setHighlight3}
            maxLength={60}
          />
        </View>

        {/* Call to action chips */}
        <View style={{ gap: 6 }}>
          <Text style={[styles.label, { fontSize: 13, fontWeight: '600' }]}>
            <UiText value="Call to Action (Button label)" />
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {currentTemplate.ctaOptions.map(opt => (
              <Pressable
                key={opt}
                onPress={() => setCta(opt)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: radii.pill,
                  backgroundColor: cta === opt ? colors.accent : colors.surface,
                  borderWidth: 1,
                  borderColor: cta === opt ? colors.accent : colors.borderSubtle,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: cta === opt ? colors.ink : colors.text,
                  }}
                >
                  {opt}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <UiElement
            as={Field}
            label=""
            placeholder="Custom CTA label (e.g., Call Now, Book Service)"
            value={cta}
            onChangeText={setCta}
            maxLength={30}
          />
        </View>

        <UiElement
          as={Field}
          label="Contact Info / Location"
          placeholder="E.g., Call: 98765-43210 or Shop #4 Gandhi Rd"
          value={contact}
          onChangeText={setContact}
          maxLength={80}
        />
      </View>

      {/* STEP 4: BACKGROUND MUSIC MOOD */}
      <View style={[styles.card, { borderRadius: radii.surface, padding: 16, gap: 12 }]}>
        <Text
          accessibilityRole="header"
          style={[styles.heading, { fontSize: 15 }]}
        >
          <UiText value="4. Background Music Atmosphere" />
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {MUSIC_MOODS.map(mood => {
            const isSelected = musicMood === mood.id;
            return (
              <Pressable
                key={mood.id}
                onPress={() => setMusicMood(mood.id)}
                style={({ pressed }) => ({
                  flex: 1,
                  minWidth: 140,
                  padding: 12,
                  borderRadius: radii.surface,
                  backgroundColor: isSelected ? colors.elevated : colors.surface,
                  borderWidth: 1,
                  borderColor: isSelected ? colors.accent : colors.borderSubtle,
                  gap: 4,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: isSelected ? colors.accent : colors.text,
                    }}
                  >
                    {mood.name}
                  </Text>
                  {isSelected && (
                    <Feather name="check" size={14} color={colors.accent} />
                  )}
                </View>
                <Text
                  numberOfLines={2}
                  style={[styles.muted, { fontSize: 11, lineHeight: 15 }]}
                >
                  {mood.description}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* STEP 5: LIVE AD VISUAL PREVIEW MOCKUP */}
      <View style={[styles.card, { borderRadius: radii.surface, padding: 16, gap: 10 }]}>
        <Text
          accessibilityRole="header"
          style={[styles.heading, { fontSize: 15 }]}
        >
          <UiText value="5. Live Vertical Ad Preview" />
        </Text>
        <Text style={[styles.muted, { fontSize: 12 }]}>
          <UiText value="Preview of the 9:16 layout as viewers will see it on V Ads." />
        </Text>

        <View
          style={{
            alignSelf: 'center',
            width: 250,
            height: 444, // 9:16 aspect ratio
            borderRadius: radii.surface,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.borderSubtle,
            position: 'relative',
            backgroundColor: colors.background,
          }}
        >
          {/* Background image or gradient */}
          {images[0] ? (
            <Image
              source={{ uri: images[0] }}
              style={{ width: '100%', height: '100%', position: 'absolute' }}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={currentTemplate.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: '100%', height: '100%', position: 'absolute' }}
            />
          )}

          {/* Scrim overlays for contrast */}
          <LinearGradient
            colors={['rgba(0,0,0,0.7)', 'transparent']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 80 }}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.88)']}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 240,
            }}
          />

          {/* Top Bar: Eyebrow badge + Channel name */}
          <View
            style={{
              position: 'absolute',
              top: 14,
              left: 12,
              right: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: radii.pill,
                backgroundColor: colors.brandPrimary,
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 9,
                  fontWeight: '800',
                  color: colors.brandPrimaryInk,
                  letterSpacing: 0.5,
                }}
              >
                {offerBadge.toUpperCase()}
              </Text>
            </View>
            <Text
              numberOfLines={1}
              style={{
                fontSize: 10,
                fontWeight: '700',
                color: colors.brandPrimaryInk,
                maxWidth: 110,
              }}
            >
              {account?.name || 'VISTRAH'}
            </Text>
          </View>

          {/* Lower Third Ad Content */}
          <View
            style={{
              position: 'absolute',
              bottom: 14,
              left: 12,
              right: 12,
              gap: 6,
            }}
          >
            <Text
              numberOfLines={2}
              style={{
                fontSize: 15,
                fontWeight: '800',
                color: colors.brandPrimaryInk,
                lineHeight: 18,
              }}
            >
              {headline}
            </Text>

            {Boolean(subtitle) && (
              <Text
                numberOfLines={1}
                style={{ fontSize: 11, color: colors.muted, fontWeight: '500' }}
              >
                <UiText value={subtitle}/>
              </Text>
            )}

            {/* Bullets */}
            <View style={{ gap: 2, paddingVertical: 2 }}>
              {Boolean(highlight1) && (
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 10, color: colors.success }}
                >
                  ✓ {highlight1}
                </Text>
              )}
              {Boolean(highlight2) && (
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 10, color: colors.success }}
                >
                  ✓ {highlight2}
                </Text>
              )}
            </View>

            {/* CTA Button */}
            <View
              style={{
                borderRadius: radii.action,
                backgroundColor: colors.brandPrimary,
                paddingVertical: 8,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 4,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brandPrimaryInk }}>
                {cta.toUpperCase()}
              </Text>
              <Feather name="arrow-right" size={12} color={colors.brandPrimaryInk} />
            </View>

            {/* Contact info */}
            {Boolean(contact) && (
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 9.5,
                  color: colors.muted,
                  textAlign: 'center',
                }}
              >
                {contact}
              </Text>
            )}

            {/* Small watermark */}
            <Text
              style={{
                fontSize: 7.5,
                fontWeight: '700',
                color: 'rgba(255,255,255,0.4)',
                textAlign: 'center',
                letterSpacing: 1,
              }}
            >
              VISTRAH
            </Text>
          </View>
        </View>
      </View>

      {/* GENERATE ACTION BUTTON */}
      <View style={{ gap: 8, paddingBottom: 16 }}>
        <UiElement
          as={Action}
          label={
            generating
              ? 'Compiling Video Ad…'
              : '⚡ Generate Video Ad (12s Vertical MP4)'
          }
          disabled={generating || !account || headline.trim().length < 3}
          onPress={() => void handleGenerate()}
        />

        {generating && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingTop: 4,
            }}
          >
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={[styles.muted, { fontSize: 12 }]}>
              <UiText value="Rendering 720x1280 MP4 with audio chord track…" />
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

