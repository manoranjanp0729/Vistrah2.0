import React, { useState, useEffect, useCallback } from 'react';
import {
  Pressable,
  Text,
  View,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { UiText } from './localized-ui';
import { Loading } from './ui';
import { api } from '../lib/api';
import { useTheme } from '../lib/theme';
import {
  editVistrahClient,
  calculateAspectRatio,
  SECTION_LIBRARY,
  type VistrahPage,
  type PageSection,
  type SectionVariation,
  type SectionFeatureInclusion,
  type ImageDetails,
  type SectionLibraryItem,
} from '../../../shared/edit-vistrah';

const evClient = editVistrahClient(api);

export type AdminTheme = {
  heroGradient: readonly [string, string, ...string[]];
  tabActiveGradient: readonly [string, string, ...string[]];
  badgeGradient: readonly [string, string, ...string[]];
  brandChipGradient: readonly [string, string, ...string[]];
  approveGradient: readonly [string, string, ...string[]];
  rejectGradient: readonly [string, string, ...string[]];
  accent: string;
  accentDark: string;
  accentLight: string;
  accentRose: string;
  accentEmerald: string;
  borderLight: string;
  borderDark: string;
  cardLight: string;
  cardDark: string;
  subtleLight: string;
  subtleDark: string;
  textLight: string;
  textDark: string;
  mutedLight: string;
  mutedDark: string;
};

// ============================================================================
// 1. EDIT VISTRAH TAB (Native Section Architecture, Variations & Running Photos)
// ============================================================================
export function AdminEditVistrahTab({ adminTheme }: { adminTheme: AdminTheme }) {
  const { styles, colors, mode } = useTheme();
  const [pages, setPages] = useState<VistrahPage[]>([]);
  const [activeSlug, setActiveSlug] = useState<string>('home');
  const [currentPage, setCurrentPage] = useState<VistrahPage | null>(null);
  const [library, setLibrary] = useState<SectionLibraryItem[]>(SECTION_LIBRARY);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  // Add Page Modal
  const [addPageOpen, setAddPageOpen] = useState(false);
  const [addPageName, setAddPageName] = useState('');
  const [addPageSlug, setAddPageSlug] = useState('');
  const [addPagePath, setAddPagePath] = useState('');

  // Photo Changer Modal
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoTarget, setPhotoTarget] = useState<{ sectionId: string; imageIndex: number; isNew: boolean }>({
    sectionId: '',
    imageIndex: -1,
    isNew: false,
  });
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoTitle, setPhotoTitle] = useState('');
  const [photoAlt, setPhotoAlt] = useState('');
  const [photoRes, setPhotoRes] = useState('');
  const [photoRatio, setPhotoRatio] = useState('');
  const [photoRecRes, setPhotoRecRes] = useState('');

  const loadPages = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pagesList, libList] = await Promise.all([evClient.listPages(), evClient.getLibrary()]);
      setPages(pagesList);
      if (libList && libList.length) setLibrary(libList);
      const target = pagesList.find((p) => p.slug === activeSlug) || pagesList[0];
      if (target) {
        setActiveSlug(target.slug);
        try {
          const full = await evClient.getPage(target.slug);
          setCurrentPage(JSON.parse(JSON.stringify(full)));
        } catch {
          setCurrentPage(JSON.parse(JSON.stringify(target)));
        }
      }
      setDirty(false);
    } catch (e: any) {
      setError(e.message || 'Failed to load Vistrah pages');
    } finally {
      setLoading(false);
    }
  }, [activeSlug]);

  useEffect(() => {
    void loadPages();
  }, [loadPages]);

  async function switchPage(slug: string) {
    if (dirty) {
      Alert.alert('Unsaved Changes', 'Discard unsaved edits and switch page?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            setActiveSlug(slug);
            setDirty(false);
            setNotice('');
            try {
              const full = await evClient.getPage(slug);
              setCurrentPage(JSON.parse(JSON.stringify(full)));
            } catch {
              const page = pages.find((p) => p.slug === slug);
              if (page) setCurrentPage(JSON.parse(JSON.stringify(page)));
            }
          },
        },
      ]);
      return;
    }
    setActiveSlug(slug);
    setDirty(false);
    setNotice('');
    try {
      const full = await evClient.getPage(slug);
      setCurrentPage(JSON.parse(JSON.stringify(full)));
    } catch {
      const page = pages.find((p) => p.slug === slug);
      if (page) setCurrentPage(JSON.parse(JSON.stringify(page)));
    }
  }

  function updateSection(sectionId: string, patch: Partial<PageSection>) {
    if (!currentPage) return;
    const nextSections = currentPage.sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s));
    setCurrentPage({ ...currentPage, sections: nextSections });
    setDirty(true);
  }

  function moveSection(index: number, direction: -1 | 1) {
    if (!currentPage) return;
    const to = index + direction;
    if (to < 0 || to >= currentPage.sections.length) return;
    const next = [...currentPage.sections];
    const temp = next[index];
    next[index] = next[to];
    next[to] = temp;
    next.forEach((s, idx) => {
      s.order = idx + 1;
    });
    setCurrentPage({ ...currentPage, sections: next });
    setDirty(true);
  }

  function addSection(libItem: SectionLibraryItem) {
    if (!currentPage) return;
    const newSection: PageSection = {
      id: 'sec-' + Math.random().toString(36).substring(2, 8),
      type: libItem.type,
      name: `${libItem.default_name} ${currentPage.sections.filter((s) => s.type === libItem.type).length + 1}`,
      variation: libItem.variations[0]?.key || 'standard',
      available_variations: JSON.parse(JSON.stringify(libItem.variations)),
      features: JSON.parse(JSON.stringify(libItem.default_features)),
      images: JSON.parse(JSON.stringify(libItem.default_images)),
      order: currentPage.sections.length + 1,
      enabled: true,
    };
    setCurrentPage({ ...currentPage, sections: [...currentPage.sections, newSection] });
    setDirty(true);
    setNotice(`Added section "${newSection.name}".`);
  }

  function deleteSection(sectionId: string) {
    if (!currentPage) return;
    const sec = currentPage.sections.find((s) => s.id === sectionId);
    Alert.alert('Remove Section', `Remove "${sec?.name || 'this section'}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          const next = currentPage.sections.filter((s) => s.id !== sectionId);
          setCurrentPage({ ...currentPage, sections: next });
          setDirty(true);
          setNotice(`Removed section "${sec?.name}".`);
        },
      },
    ]);
  }

  async function handleSaveDraft() {
    if (!currentPage || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const updated = await evClient.updatePage(currentPage.slug, {
        name: currentPage.name,
        path: currentPage.path,
        description: currentPage.description,
        target_platform: currentPage.target_platform,
        sections: currentPage.sections,
      });
      setCurrentPage(JSON.parse(JSON.stringify(updated)));
      setPages((prev) => prev.map((p) => (p.slug === updated.slug ? updated : p)));
      setDirty(false);
      setNotice(`Saved draft revision ${updated.revision} for "${updated.name}".`);
    } catch (e: any) {
      setError(e.message || 'Failed to save draft');
    } finally {
      setBusy(false);
    }
  }

  async function handlePublishPage() {
    if (!currentPage || busy) return;
    Alert.alert(
      'Publish Live',
      `Publish "${currentPage.name}" live to all customers across website and mobile app?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Make Live',
          onPress: async () => {
            setBusy(true);
            setError('');
            try {
              if (dirty) {
                await evClient.updatePage(currentPage.slug, {
                  name: currentPage.name,
                  path: currentPage.path,
                  description: currentPage.description,
                  target_platform: currentPage.target_platform,
                  sections: currentPage.sections,
                });
              }
              const published = await evClient.publishPage(currentPage.slug);
              setCurrentPage(JSON.parse(JSON.stringify(published)));
              setPages((prev) => prev.map((p) => (p.slug === published.slug ? published : p)));
              setDirty(false);
              setNotice(`🎉 "${published.name}" is now LIVE (v${published.published_version})!`);
            } catch (e: any) {
              setError(e.message || 'Failed to publish page');
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }

  function openPhotoDialog(sectionId: string, imageIndex: number, isNew: boolean) {
    if (!currentPage) return;
    const sec = currentPage.sections.find((s) => s.id === sectionId);
    if (!sec) return;
    const libMatch = library.find((l) => l.type === sec.type);
    const recRes = libMatch?.recommended_resolution || '1920 × 600 px';
    setPhotoRecRes(recRes);

    if (isNew) {
      setPhotoUrl('');
      setPhotoTitle('New Banner');
      setPhotoAlt('');
      setPhotoRes('1920 × 600 px');
      setPhotoRatio('16:5');
    } else {
      const existing = sec.images[imageIndex] || { url: '' };
      setPhotoUrl(existing.url);
      setPhotoTitle(existing.title || `Photo #${imageIndex + 1}`);
      setPhotoAlt(existing.alt_text || '');
      setPhotoRes(existing.resolution || 'Detected on change');
      setPhotoRatio(existing.aspect_ratio || 'Standard');
    }
    setPhotoTarget({ sectionId, imageIndex, isNew });
    setPhotoModalOpen(true);
  }

  function applyPhotoDialog() {
    if (!currentPage || !photoUrl.trim()) {
      Alert.alert('Required', 'Please provide an image URL or asset path.');
      return;
    }
    const { sectionId, imageIndex, isNew } = photoTarget;
    const sec = currentPage.sections.find((s) => s.id === sectionId);
    if (!sec) return;

    const newPhotoDetails: ImageDetails = {
      url: photoUrl.trim(),
      title: photoTitle.trim() || 'Banner Image',
      alt_text: photoAlt.trim(),
      resolution: photoRes || 'Measured',
      aspect_ratio: photoRatio || 'Standard',
      recommended_resolution: photoRecRes,
    };

    let nextImages = [...sec.images];
    if (isNew) {
      nextImages.push(newPhotoDetails);
    } else if (imageIndex >= 0 && imageIndex < nextImages.length) {
      nextImages[imageIndex] = newPhotoDetails;
    }

    updateSection(sectionId, { images: nextImages });
    setPhotoModalOpen(false);
    setNotice('Photo updated with resolution.');
  }

  function removePhoto(sectionId: string, imageIndex: number) {
    if (!currentPage) return;
    const sec = currentPage.sections.find((s) => s.id === sectionId);
    if (!sec) return;
    const nextImages = sec.images.filter((_, idx) => idx !== imageIndex);
    updateSection(sectionId, { images: nextImages });
  }

  async function handleCreatePage() {
    if (!addPageName.trim() || !addPageSlug.trim()) {
      Alert.alert('Required', 'Please enter Page Name and URL slug.');
      return;
    }
    setBusy(true);
    try {
      const created = await evClient.createPage({
        name: addPageName.trim(),
        slug: addPageSlug.trim().toLowerCase(),
        path: addPagePath.trim() || `/${addPageSlug.trim().toLowerCase()}`,
        target_platform: 'all',
      });
      setPages((prev) => [...prev, created]);
      setActiveSlug(created.slug);
      setCurrentPage(created);
      setAddPageOpen(false);
      setAddPageName('');
      setAddPageSlug('');
      setAddPagePath('');
      setNotice(`Page "${created.name}" created.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create page');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading />;

  return (
    <View style={{ gap: 14 }}>
      {/* Top Header & Refresh */}
      <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heading, { fontSize: 18, color: mode === 'dark' ? adminTheme.textDark : adminTheme.textLight }]}>
            <UiText value={'Edit Vistrah (CMS & Architecture)'} />
          </Text>
          <Text style={[styles.muted, { fontSize: 12, color: mode === 'dark' ? adminTheme.mutedDark : adminTheme.mutedLight }]}>
            <UiText value={'Define sections, variations, features, and running photos.'} />
          </Text>
        </View>
        <Pressable onPress={() => void loadPages()} style={{ padding: 6 }}>
          <Text style={{ color: adminTheme.accentLight, fontWeight: '700' }}>Refresh ↺</Text>
        </Pressable>
      </View>

      {/* Notices */}
      {Boolean(error) && (
        <View style={{ backgroundColor: '#be123c20', borderColor: '#be123c', borderWidth: 1, padding: 10, borderRadius: 10 }}>
          <Text style={{ color: '#f43f5e', fontSize: 12 }}>{error}</Text>
        </View>
      )}
      {Boolean(notice) && (
        <View style={{ backgroundColor: '#05966920', borderColor: '#059669', borderWidth: 1, padding: 10, borderRadius: 10 }}>
          <Text style={{ color: '#10b981', fontSize: 12 }}>{notice}</Text>
        </View>
      )}

      {/* Page Tabs Bar */}
      <View style={{ gap: 8 }}>
        <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
          <Text style={[styles.muted, { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }]}>Pages</Text>
          <Pressable onPress={() => setAddPageOpen(true)} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: adminTheme.accent + '25' }}>
            <Text style={{ color: adminTheme.accentLight, fontWeight: '700', fontSize: 12 }}>+ Add Page</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
          {pages.map((p) => {
            const isSelected = p.slug === activeSlug;
            const isLive = p.status === 'LIVE';
            return (
              <Pressable
                key={p.slug}
                onPress={() => switchPage(p.slug)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 14,
                  borderWidth: isSelected ? 2 : 1,
                  borderColor: isSelected ? '#e5a93c' : mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight,
                  backgroundColor: isSelected ? (mode === 'dark' ? '#2d2215' : '#fef9ee') : mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Text style={{ fontWeight: isSelected ? '700' : '600', color: mode === 'dark' ? adminTheme.textDark : adminTheme.textLight, fontSize: 13 }}>
                  {p.name}
                </Text>
                <View style={{ backgroundColor: isLive ? '#15803d' : '#854d0e', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>
                    {isLive ? `Live v${p.published_version || 1}` : 'Draft'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Active Page Working Shell */}
      {currentPage && (
        <View style={{ gap: 14 }}>
          {/* Active Page Card & Actions */}
          <View style={[styles.card, { borderColor: mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight, backgroundColor: mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight, borderRadius: 16, padding: 14, gap: 10 }]}>
            <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.heading, { fontSize: 17, color: mode === 'dark' ? adminTheme.textDark : adminTheme.textLight }]}>
                  {currentPage.name}
                </Text>
                <Text style={[styles.muted, { fontSize: 11 }]}>
                  Path: <Text style={{ color: '#e5a93c', fontWeight: '700' }}>{currentPage.path || '/' + currentPage.slug}</Text> · {currentPage.sections.length} sections
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() => void handleSaveDraft()}
                  disabled={busy || !dirty}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 10,
                    backgroundColor: dirty ? '#3b82f6' : '#64748b',
                    opacity: dirty ? 1 : 0.6,
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Save</Text>
                </Pressable>

                <Pressable
                  onPress={() => void handlePublishPage()}
                  disabled={busy}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 10,
                    backgroundColor: '#16a34a',
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>⚡ Make Live</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Quick Add Section Bar */}
          <View style={{ gap: 6 }}>
            <Text style={[styles.muted, { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }]}>
              Add Section to Page
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
              {library.map((lib) => (
                <Pressable
                  key={lib.type}
                  onPress={() => addSection(lib)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#e5a93c',
                    backgroundColor: mode === 'dark' ? '#211810' : '#fffbeb',
                    gap: 2,
                  }}
                >
                  <Text style={{ color: '#e5a93c', fontWeight: '700', fontSize: 12 }}>+ {lib.default_name}</Text>
                  <Text style={[styles.muted, { fontSize: 10 }]}>{lib.recommended_resolution}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Sections List */}
          <View style={{ gap: 14 }}>
            {currentPage.sections.map((sec, idx) => {
              const libMatch = library.find((l) => l.type === sec.type);
              const recRes = libMatch?.recommended_resolution || '1920 × 600 px';

              return (
                <View
                  key={sec.id}
                  style={[
                    styles.card,
                    {
                      borderColor: sec.enabled ? (mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight) : '#475569',
                      backgroundColor: mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight,
                      borderRadius: 16,
                      padding: 14,
                      gap: 12,
                      opacity: sec.enabled ? 1 : 0.6,
                    },
                  ]}
                >
                  {/* Section Title & Reordering */}
                  <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <View style={{ backgroundColor: '#e5a93c', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ color: '#000', fontWeight: '800', fontSize: 11 }}>#{idx + 1}</Text>
                      </View>
                      <TextInput
                        value={sec.name}
                        onChangeText={(text) => updateSection(sec.id, { name: text })}
                        style={{
                          flex: 1,
                          fontSize: 15,
                          fontWeight: '700',
                          color: mode === 'dark' ? adminTheme.textDark : adminTheme.textLight,
                          paddingVertical: 2,
                        }}
                        placeholder="Unique Section Name"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>

                    {/* Order Controls */}
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      <Pressable
                        onPress={() => moveSection(idx, -1)}
                        disabled={idx === 0}
                        style={{ padding: 6, opacity: idx === 0 ? 0.3 : 1 }}
                      >
                        <Text style={{ fontSize: 14, color: adminTheme.accentLight }}>▲</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => moveSection(idx, 1)}
                        disabled={idx === currentPage.sections.length - 1}
                        style={{ padding: 6, opacity: idx === currentPage.sections.length - 1 ? 0.3 : 1 }}
                      >
                        <Text style={{ fontSize: 14, color: adminTheme.accentLight }}>▼</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => updateSection(sec.id, { enabled: !sec.enabled })}
                        style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: sec.enabled ? '#16a34a20' : '#64748b20' }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: sec.enabled ? '#16a34a' : '#94a3b8' }}>
                          {sec.enabled ? 'Active' : 'Off'}
                        </Text>
                      </Pressable>
                      <Pressable onPress={() => deleteSection(sec.id)} style={{ padding: 6 }}>
                        <Text style={{ fontSize: 13, color: '#ef4444' }}>✕</Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* 1. Variations Selector */}
                  <View style={{ gap: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#e5a93c' }}>
                      Variation ({sec.available_variations.length} available)
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {sec.available_variations.map((v) => {
                        const isVarSelected = sec.variation === v.key;
                        return (
                          <Pressable
                            key={v.key}
                            onPress={() => updateSection(sec.id, { variation: v.key })}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 8,
                              borderWidth: isVarSelected ? 2 : 1,
                              borderColor: isVarSelected ? '#e5a93c' : mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight,
                              backgroundColor: isVarSelected ? '#e5a93c20' : 'transparent',
                            }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: isVarSelected ? '700' : '500', color: isVarSelected ? '#e5a93c' : mode === 'dark' ? adminTheme.textDark : adminTheme.textLight }}>
                              {v.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* 2. Feature Inclusions */}
                  <View style={{ gap: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#e5a93c' }}>
                      Feature Inclusions
                    </Text>
                    <View style={{ gap: 6 }}>
                      {sec.features.map((feat) => (
                        <Pressable
                          key={feat.key}
                          onPress={() => {
                            const updated = sec.features.map((f) => (f.key === feat.key ? { ...f, enabled: !f.enabled } : f));
                            updateSection(sec.id, { features: updated });
                          }}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                            paddingVertical: 4,
                          }}
                        >
                          <Text style={{ fontSize: 14, color: feat.enabled ? '#22c55e' : '#94a3b8' }}>
                            {feat.enabled ? '☑' : '☐'}
                          </Text>
                          <Text style={{ fontSize: 12, color: feat.enabled ? (mode === 'dark' ? '#fff' : '#000') : '#94a3b8' }}>
                            {feat.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* 3. Running Photos & Resolution */}
                  <View style={{ gap: 8, borderTopWidth: 1, borderColor: mode === 'dark' ? '#334155' : '#e2e8f0', paddingTop: 8 }}>
                    <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#e5a93c' }}>
                          Running Photos ({sec.images.length})
                        </Text>
                        <Text style={{ fontSize: 10, color: '#38bdf8' }}>Rec: {recRes}</Text>
                      </View>
                      <Pressable
                        onPress={() => openPhotoDialog(sec.id, -1, true)}
                        style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: adminTheme.accent + '25' }}
                      >
                        <Text style={{ color: adminTheme.accentLight, fontWeight: '700', fontSize: 11 }}>+ Add Photo</Text>
                      </Pressable>
                    </View>

                    {/* Photos list */}
                    {sec.images.map((img, imgIdx) => (
                      <View
                        key={imgIdx}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                          backgroundColor: mode === 'dark' ? '#0f172a' : '#f8fafc',
                          padding: 8,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: mode === 'dark' ? '#1e293b' : '#cbd5e1',
                        }}
                      >
                        <View style={{ width: 60, height: 45, borderRadius: 6, overflow: 'hidden', backgroundColor: '#334155' }}>
                          <Image
                            source={{ uri: img.url }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: mode === 'dark' ? adminTheme.textDark : adminTheme.textLight }}>
                            {img.title || `Photo #${imgIdx + 1}`}
                          </Text>
                          <Text style={{ fontSize: 11, color: '#e5a93c', fontWeight: '600' }}>
                            Res: {img.resolution || 'Detected'} · Ratio: {img.aspect_ratio || '16:9'}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <Pressable
                            onPress={() => openPhotoDialog(sec.id, imgIdx, false)}
                            style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#3b82f6' }}
                          >
                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>Change</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => removePhoto(sec.id, imgIdx)}
                            style={{ padding: 4 }}
                          >
                            <Text style={{ color: '#ef4444', fontSize: 12 }}>✕</Text>
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* ================= MODAL: CHANGE PHOTO ================= */}
      <Modal visible={photoModalOpen} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: mode === 'dark' ? '#1e2433' : '#fff', borderRadius: 16, padding: 20, gap: 14 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: mode === 'dark' ? '#fff' : '#000' }}>
              {photoTarget.isNew ? 'Add Running Photo' : 'Change Section Photo'}
            </Text>
            <Text style={{ fontSize: 11, color: '#38bdf8' }}>
              Recommended: {photoRecRes}
            </Text>

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: mode === 'dark' ? '#ccc' : '#333' }}>Image URL / Asset Path</Text>
              <TextInput
                value={photoUrl}
                onChangeText={setPhotoUrl}
                placeholder="e.g. /brand/hero-banner.jpg or https://..."
                placeholderTextColor="#94a3b8"
                style={{
                  borderWidth: 1,
                  borderColor: mode === 'dark' ? '#334155' : '#cbd5e1',
                  borderRadius: 8,
                  padding: 10,
                  color: mode === 'dark' ? '#fff' : '#000',
                  fontSize: 13,
                }}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: mode === 'dark' ? '#ccc' : '#333' }}>Photo Title</Text>
              <TextInput
                value={photoTitle}
                onChangeText={setPhotoTitle}
                placeholder="e.g. Festive Sale Gold Banner"
                placeholderTextColor="#94a3b8"
                style={{
                  borderWidth: 1,
                  borderColor: mode === 'dark' ? '#334155' : '#cbd5e1',
                  borderRadius: 8,
                  padding: 10,
                  color: mode === 'dark' ? '#fff' : '#000',
                  fontSize: 13,
                }}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: mode === 'dark' ? '#ccc' : '#333' }}>Resolution (Width × Height)</Text>
              <TextInput
                value={photoRes}
                onChangeText={setPhotoRes}
                placeholder="e.g. 1920 × 600 px"
                placeholderTextColor="#94a3b8"
                style={{
                  borderWidth: 1,
                  borderColor: mode === 'dark' ? '#334155' : '#cbd5e1',
                  borderRadius: 8,
                  padding: 10,
                  color: mode === 'dark' ? '#fff' : '#000',
                  fontSize: 13,
                }}
              />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <Pressable onPress={() => setPhotoModalOpen(false)} style={{ padding: 10 }}>
                <Text style={{ color: '#94a3b8', fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={applyPhotoDialog}
                style={{ backgroundColor: '#e5a93c', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }}
              >
                <Text style={{ color: '#000', fontWeight: '700' }}>Apply Photo</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL: ADD PAGE ================= */}
      <Modal visible={addPageOpen} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: mode === 'dark' ? '#1e2433' : '#fff', borderRadius: 16, padding: 20, gap: 14 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: mode === 'dark' ? '#fff' : '#000' }}>
              Add New Vistrah Page
            </Text>

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: mode === 'dark' ? '#ccc' : '#333' }}>Page Name</Text>
              <TextInput
                value={addPageName}
                onChangeText={(name) => {
                  setAddPageName(name);
                  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                  if (!addPageSlug) setAddPageSlug(slug);
                  if (!addPagePath) setAddPagePath(`/${slug}`);
                }}
                placeholder="e.g. Festive Deals"
                placeholderTextColor="#94a3b8"
                style={{
                  borderWidth: 1,
                  borderColor: mode === 'dark' ? '#334155' : '#cbd5e1',
                  borderRadius: 8,
                  padding: 10,
                  color: mode === 'dark' ? '#fff' : '#000',
                  fontSize: 13,
                }}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: mode === 'dark' ? '#ccc' : '#333' }}>URL Slug</Text>
              <TextInput
                value={addPageSlug}
                onChangeText={setAddPageSlug}
                placeholder="e.g. festive-deals"
                placeholderTextColor="#94a3b8"
                style={{
                  borderWidth: 1,
                  borderColor: mode === 'dark' ? '#334155' : '#cbd5e1',
                  borderRadius: 8,
                  padding: 10,
                  color: mode === 'dark' ? '#fff' : '#000',
                  fontSize: 13,
                }}
              />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <Pressable onPress={() => setAddPageOpen(false)} style={{ padding: 10 }}>
                <Text style={{ color: '#94a3b8', fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleCreatePage}
                style={{ backgroundColor: adminTheme.accent, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Create Page</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============================================================================
// 2. HOMEPAGE EDITOR TAB (Native Layout, Reordering & Publishing)
// ============================================================================
export function AdminHomepageTab({ adminTheme }: { adminTheme: AdminTheme }) {
  const { styles, colors, mode } = useTheme();
  const [draft, setDraft] = useState<any>(null);
  const [templates, setTemplates] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const loadHomepage = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [d, t] = await Promise.all([
        api<any>('/admin/homepage/draft'),
        api<{ templates: Record<string, any> }>('/admin/homepage/templates'),
      ]);
      setDraft(d);
      setTemplates(t.templates || {});
      setDirty(false);
    } catch (e: any) {
      setError(e.message || 'Failed to load homepage draft');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHomepage();
  }, [loadHomepage]);

  function moveSection(index: number, direction: -1 | 1) {
    if (!draft?.layout?.sections) return;
    const to = index + direction;
    if (to < 0 || to >= draft.layout.sections.length) return;
    const next = [...draft.layout.sections];
    const temp = next[index];
    next[index] = next[to];
    next[to] = temp;
    setDraft({ ...draft, layout: { ...draft.layout, sections: next } });
    setDirty(true);
  }

  async function handleSaveDraft() {
    if (!draft || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const saved = await api<any>('/admin/homepage/draft', {
        method: 'PUT',
        body: JSON.stringify({ revision: draft.revision, layout: draft.layout }),
      });
      setDraft(saved);
      setDirty(false);
      setNotice('Homepage draft saved.');
    } catch (e: any) {
      setError(e.message || 'Failed to save draft');
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish() {
    if (!draft || busy) return;
    Alert.alert('Publish Homepage', 'Publish this saved homepage to all website and mobile users?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Publish',
        onPress: async () => {
          setBusy(true);
          setError('');
          try {
            if (dirty) {
              await api('/admin/homepage/draft', {
                method: 'PUT',
                body: JSON.stringify({ revision: draft.revision, layout: draft.layout }),
              });
            }
            const pub = await api<any>('/admin/homepage/publish', {
              method: 'POST',
              body: JSON.stringify({ revision: draft.revision }),
            });
            setDraft(pub);
            setDirty(false);
            setNotice('🎉 Homepage published successfully!');
          } catch (e: any) {
            setError(e.message || 'Failed to publish homepage');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  if (loading) return <Loading />;

  return (
    <View style={{ gap: 14 }}>
      <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heading, { fontSize: 18, color: mode === 'dark' ? adminTheme.textDark : adminTheme.textLight }]}>
            <UiText value={'Homepage Editor'} />
          </Text>
          <Text style={[styles.muted, { fontSize: 12, color: mode === 'dark' ? adminTheme.mutedDark : adminTheme.mutedLight }]}>
            Revision {draft?.revision || 1} · Published v{draft?.published_version || 'None'}
          </Text>
        </View>
        <Pressable onPress={() => void loadHomepage()} style={{ padding: 6 }}>
          <Text style={{ color: adminTheme.accentLight, fontWeight: '700' }}>Refresh ↺</Text>
        </Pressable>
      </View>

      {Boolean(error) && (
        <View style={{ backgroundColor: '#be123c20', borderColor: '#be123c', borderWidth: 1, padding: 10, borderRadius: 10 }}>
          <Text style={{ color: '#f43f5e', fontSize: 12 }}>{error}</Text>
        </View>
      )}
      {Boolean(notice) && (
        <View style={{ backgroundColor: '#05966920', borderColor: '#059669', borderWidth: 1, padding: 10, borderRadius: 10 }}>
          <Text style={{ color: '#10b981', fontSize: 12 }}>{notice}</Text>
        </View>
      )}

      {/* Action Row */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable
          onPress={() => void handleSaveDraft()}
          disabled={busy || !dirty}
          style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: dirty ? '#3b82f6' : '#64748b', alignItems: 'center' }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Save Draft</Text>
        </Pressable>
        <Pressable
          onPress={() => void handlePublish()}
          disabled={busy}
          style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#16a34a', alignItems: 'center' }}
        >
          <Text style={{ color: '#fff', fontWeight: '800' }}>⚡ Publish Live</Text>
        </Pressable>
      </View>

      {/* Sections List */}
      <View style={{ gap: 10 }}>
        {draft?.layout?.sections?.map((sec: any, idx: number) => (
          <View
            key={sec.id || idx}
            style={[
              styles.card,
              {
                borderColor: mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight,
                backgroundColor: mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight,
                padding: 14,
                gap: 8,
              },
            ]}
          >
            <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.heading, { fontSize: 15, color: mode === 'dark' ? adminTheme.textDark : adminTheme.textLight }]}>
                  {idx + 1}. {sec.title || 'Untitled Section'}
                </Text>
                <Text style={[styles.muted, { fontSize: 11 }]}>
                  Type: {sec.template} · Size: {sec.size} · {sec.service_ids?.length || 0} services
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Pressable onPress={() => moveSection(idx, -1)} disabled={idx === 0} style={{ padding: 6, opacity: idx === 0 ? 0.3 : 1 }}>
                  <Text style={{ color: adminTheme.accentLight, fontWeight: '700' }}>▲</Text>
                </Pressable>
                <Pressable onPress={() => moveSection(idx, 1)} disabled={idx === draft.layout.sections.length - 1} style={{ padding: 6, opacity: idx === draft.layout.sections.length - 1 ? 0.3 : 1 }}>
                  <Text style={{ color: adminTheme.accentLight, fontWeight: '700' }}>▼</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ============================================================================
// 3. MEMBERSHIPS & BENEFITS TAB (Native Business Subscribers & Quotas)
// ============================================================================
export function AdminMembershipsTab({ adminTheme }: { adminTheme: AdminTheme }) {
  const { styles, colors, mode } = useTheme();
  const [memberships, setMemberships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMemberships = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api<any[]>('/admin/business-memberships');
      setMemberships(data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load memberships');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMemberships();
  }, [loadMemberships]);

  if (loading) return <Loading />;

  return (
    <View style={{ gap: 14 }}>
      <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heading, { fontSize: 18, color: mode === 'dark' ? adminTheme.textDark : adminTheme.textLight }]}>
            <UiText value={'Memberships & Benefits'} />
          </Text>
          <Text style={[styles.muted, { fontSize: 12, color: mode === 'dark' ? adminTheme.mutedDark : adminTheme.mutedLight }]}>
            {memberships.length} businesses subscribed
          </Text>
        </View>
        <Pressable onPress={() => void loadMemberships()} style={{ padding: 6 }}>
          <Text style={{ color: adminTheme.accentLight, fontWeight: '700' }}>Refresh ↺</Text>
        </Pressable>
      </View>

      {Boolean(error) && (
        <View style={{ backgroundColor: '#be123c20', borderColor: '#be123c', borderWidth: 1, padding: 10, borderRadius: 10 }}>
          <Text style={{ color: '#f43f5e', fontSize: 12 }}>{error}</Text>
        </View>
      )}

      {!memberships.length ? (
        <View style={[styles.card, { borderColor: mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight, backgroundColor: mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight }]}>
          <Text style={[styles.muted, { color: mode === 'dark' ? adminTheme.mutedDark : adminTheme.mutedLight }]}>
            No business memberships recorded.
          </Text>
        </View>
      ) : (
        memberships.map((m) => (
          <View
            key={m.id || m.user_id}
            style={[
              styles.card,
              {
                borderColor: mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight,
                backgroundColor: mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight,
                padding: 14,
                gap: 8,
              },
            ]}
          >
            <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
              <Text style={[styles.heading, { fontSize: 15, color: mode === 'dark' ? adminTheme.textDark : adminTheme.textLight }]}>
                {m.business_name || `Business #${m.user_id}`}
              </Text>
              <View style={{ backgroundColor: '#e5a93c25', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                <Text style={{ color: '#e5a93c', fontWeight: '800', fontSize: 11 }}>{m.tier || 'MEMBER'}</Text>
              </View>
            </View>

            <Text style={[styles.muted, { fontSize: 12 }]}>
              Status: <Text style={{ color: '#22c55e', fontWeight: '700' }}>{m.status || 'ACTIVE'}</Text> · Quota: {m.job_posts_remaining ?? 'Unlimited'} jobs
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

// ============================================================================
// 4. VISTRAH PACKAGES TAB (Official Platform Service Packages)
// ============================================================================
export function AdminVistrahServicesTab({ adminTheme }: { adminTheme: AdminTheme }) {
  const { styles, colors, mode } = useTheme();
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPackages = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api<{ items: any[] }>('/admin/commerce-listings?operator=VISTRAH');
      setPackages(res.items || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load Vistrah packages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPackages();
  }, [loadPackages]);

  if (loading) return <Loading />;

  return (
    <View style={{ gap: 14 }}>
      <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heading, { fontSize: 18, color: mode === 'dark' ? adminTheme.textDark : adminTheme.textLight }]}>
            <UiText value={'VISTRAH Platform Packages'} />
          </Text>
          <Text style={[styles.muted, { fontSize: 12, color: mode === 'dark' ? adminTheme.mutedDark : adminTheme.mutedLight }]}>
            {packages.length} curated service packages
          </Text>
        </View>
        <Pressable onPress={() => void loadPackages()} style={{ padding: 6 }}>
          <Text style={{ color: adminTheme.accentLight, fontWeight: '700' }}>Refresh ↺</Text>
        </Pressable>
      </View>

      {Boolean(error) && (
        <View style={{ backgroundColor: '#be123c20', borderColor: '#be123c', borderWidth: 1, padding: 10, borderRadius: 10 }}>
          <Text style={{ color: '#f43f5e', fontSize: 12 }}>{error}</Text>
        </View>
      )}

      {!packages.length ? (
        <View style={[styles.card, { borderColor: mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight, backgroundColor: mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight }]}>
          <Text style={[styles.muted, { color: mode === 'dark' ? adminTheme.mutedDark : adminTheme.mutedLight }]}>
            No platform packages created yet.
          </Text>
        </View>
      ) : (
        packages.map((pkg) => (
          <View
            key={pkg.id}
            style={[
              styles.card,
              {
                borderColor: mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight,
                backgroundColor: mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight,
                padding: 14,
                gap: 8,
              },
            ]}
          >
            <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
              <Text style={[styles.heading, { fontSize: 15, color: mode === 'dark' ? adminTheme.textDark : adminTheme.textLight }]}>
                {pkg.title}
              </Text>
              <View style={{ backgroundColor: '#15803d25', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                <Text style={{ color: '#22c55e', fontWeight: '800', fontSize: 11 }}>{pkg.status}</Text>
              </View>
            </View>

            <Text style={[styles.muted, { fontSize: 12 }]}>
              Price: <Text style={{ color: '#e5a93c', fontWeight: '700' }}>₹{(pkg.unit_price_paise / 100).toFixed(2)}</Text> · Business: {pkg.business}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

