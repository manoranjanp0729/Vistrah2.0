'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Image as ImageIcon,
  Layers,
  Eye,
  Globe,
  Smartphone,
  Sparkles,
  AlertCircle,
  Copy,
  Save,
} from 'lucide-react';
import { api } from '@/lib/api';
import { AuthGate } from './customer';
import {
  editVistrahClient,
  loadVistrahEditor,
  editorPageStatus,
  calculateAspectRatio,
  SECTION_LIBRARY,
  type VistrahPage,
  type PageSection,
  type SectionVariation,
  type SectionFeatureInclusion,
  type ImageDetails,
  type SectionLibraryItem,
} from '../../shared/edit-vistrah';

const client = editVistrahClient(api);

export function EditVistrah() {
  return (
    <AuthGate>
      {(user) => <EditVistrahDashboard actorId={user.id} />}
    </AuthGate>
  );
}

function EditVistrahDashboard({ actorId }: { actorId: number }) {
  const [pages, setPages] = useState<VistrahPage[]>([]);
  const [activeSlug, setActiveSlug] = useState<string>('home');
  const [currentPage, setCurrentPage] = useState<VistrahPage | null>(null);
  const [library, setLibrary] = useState<SectionLibraryItem[]>(SECTION_LIBRARY);

  const [busy, setBusy] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [dirty, setDirty] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [notice, setNotice] = useState<string>('');

  // Preview Mode
  const [previewMode, setPreviewMode] = useState<'none' | 'phone' | 'desktop'>('none');

  // Add Page Modal
  const [showAddPageModal, setShowAddPageModal] = useState<boolean>(false);
  const [newPageForm, setNewPageForm] = useState<{
    name: string;
    slug: string;
    path: string;
    description: string;
    target_platform: 'all' | 'web' | 'mobile';
    template: 'starter' | 'empty';
  }>({
    name: '',
    slug: '',
    path: '',
    description: '',
    target_platform: 'all',
    template: 'starter',
  });

  // Photo Changer Modal
  const [photoModal, setPhotoModal] = useState<{
    open: boolean;
    sectionId: string;
    imageIndex: number;
    isNew: boolean;
  }>({ open: false, sectionId: '', imageIndex: -1, isNew: false });

  const [photoForm, setPhotoForm] = useState<ImageDetails>({
    url: '',
    title: '',
    alt_text: '',
    width: 0,
    height: 0,
    resolution: '',
    aspect_ratio: '',
    recommended_resolution: '',
  });

  // Custom Variation & Feature Modal/Inputs
  const [addingVariationSectionId, setAddingVariationSectionId] = useState<string | null>(null);
  const [customVarForm, setCustomVarForm] = useState({ key: '', name: '', description: '' });

  const [addingFeatureSectionId, setAddingFeatureSectionId] = useState<string | null>(null);
  const [customFeatForm, setCustomFeatForm] = useState({ key: '', label: '', description: '' });

  const [loadVersion,retryLoad]=useState(0);
  // Initial Load
  useEffect(() => {
    let active = true;
    setLoading(true);
    loadVistrahEditor(client,activeSlug)
      .then(({pages:pagesList,page,library:libList,warning})=>{
        if(!active)return;
        setPages(pagesList);
        if(libList.length)setLibrary(libList);
        setCurrentPage(page?JSON.parse(JSON.stringify(page)):null);
        if(page)setActiveSlug(page.slug);
        setError(warning);setDirty(false);
      })
      .catch((e) => {
        if (active) setError(e.message || 'Failed to load pages');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadVersion]);

  // Switch Page
  async function switchPage(slug: string) {
    if (dirty && !window.confirm('You have unsaved changes on this page. Discard changes and switch?')) {
      return;
    }
    setActiveSlug(slug);
    setDirty(false);
    setError('');
    setNotice('');
    try {
      const full = await client.getPage(slug);
      setCurrentPage(JSON.parse(JSON.stringify(full)));
    } catch {
      const page = pages.find((p) => p.slug === slug);
      if (page) setCurrentPage(JSON.parse(JSON.stringify(page)));
    }
  }

  // Reload current page from server
  async function reloadCurrentPage() {
    if (dirty && !window.confirm('Discard all unsaved edits and reload from server?')) return;
    setBusy(true);
    setError('');
    try {
      const refreshed = await client.getPage(activeSlug);
      setCurrentPage(JSON.parse(JSON.stringify(refreshed)));
      setPages((prev) => prev.map((p) => (p.slug === activeSlug ? refreshed : p)));
      setDirty(false);
      setNotice('Page reloaded from server.');
    } catch (e: any) {
      setError(e.message || 'Failed to reload page');
    } finally {
      setBusy(false);
    }
  }

  // Update Section in Current Page
  function updateSection(sectionId: string, patch: Partial<PageSection>) {
    if (!currentPage) return;
    const nextSections = currentPage.sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s));
    setCurrentPage({ ...currentPage, sections: nextSections });
    setDirty(true);
    setNotice('');
  }

  // Reorder Sections
  function moveSection(index: number, direction: -1 | 1) {
    if (!currentPage) return;
    const toIndex = index + direction;
    if (toIndex < 0 || toIndex >= currentPage.sections.length) return;
    const sections = [...currentPage.sections];
    const temp = sections[index];
    sections[index] = sections[toIndex];
    sections[toIndex] = temp;
    sections.forEach((s, idx) => {
      s.order = idx + 1;
    });
    setCurrentPage({ ...currentPage, sections });
    setDirty(true);
  }

  // Duplicate Section
  function duplicateSection(sectionId: string) {
    if (!currentPage) return;
    const idx = currentPage.sections.findIndex((s) => s.id === sectionId);
    if (idx === -1) return;
    const original = currentPage.sections[idx];
    const cloned: PageSection = {
      ...JSON.parse(JSON.stringify(original)),
      id: 'sec-' + Math.random().toString(36).substring(2, 9),
      name: `${original.name} (Copy)`,
      order: original.order + 1,
    };
    const nextSections = [...currentPage.sections];
    nextSections.splice(idx + 1, 0, cloned);
    nextSections.forEach((s, i) => {
      s.order = i + 1;
    });
    setCurrentPage({ ...currentPage, sections: nextSections });
    setDirty(true);
    setNotice(`Duplicated section "${original.name}"`);
  }

  // Delete Section
  function deleteSection(sectionId: string) {
    if (!currentPage) return;
    const section = currentPage.sections.find((s) => s.id === sectionId);
    if (!window.confirm(`Remove section "${section?.name || 'this section'}" from this page?`)) return;
    const nextSections = currentPage.sections
      .filter((s) => s.id !== sectionId)
      .map((s, idx) => ({ ...s, order: idx + 1 }));
    setCurrentPage({ ...currentPage, sections: nextSections });
    setDirty(true);
    setNotice(`Removed section "${section?.name}"`);
  }

  // Add Section from Library
  function addSectionFromLibrary(libItem: SectionLibraryItem) {
    if (!currentPage) return;
    const newSection: PageSection = {
      id: 'sec-' + Math.random().toString(36).substring(2, 9),
      type: libItem.type,
      name: `${libItem.default_name} ${currentPage.sections.filter((s) => s.type === libItem.type).length + 1}`,
      variation: libItem.variations[0]?.key || 'standard',
      available_variations: JSON.parse(JSON.stringify(libItem.variations)),
      features: JSON.parse(JSON.stringify(libItem.default_features)),
      images: JSON.parse(JSON.stringify(libItem.default_images)),
      order: currentPage.sections.length + 1,
      enabled: true,
    };
    setCurrentPage({
      ...currentPage,
      sections: [...currentPage.sections, newSection],
    });
    setDirty(true);
    setNotice(`Added "${newSection.name}" to page`);
  }

  // Save Page Draft
  async function handleSaveDraft() {
    if (!currentPage || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const updated = await client.updatePage(currentPage.slug, {
        revision: currentPage.revision,
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

  // Make Page Live (Publish)
  async function handlePublishPage() {
    if (!currentPage || busy) return;
    if (dirty) {
      if (!window.confirm('You have unsaved changes. These will be saved and published live immediately. Proceed?')) {
        return;
      }
    } else {
      if (!window.confirm(`Publish "${currentPage.name}" live to website and mobile app users?`)) {
        return;
      }
    }

    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (dirty) {
        await client.updatePage(currentPage.slug, {
          revision: currentPage.revision,
        name: currentPage.name,
          path: currentPage.path,
          description: currentPage.description,
          target_platform: currentPage.target_platform,
          sections: currentPage.sections,
        });
      }
      const published = await client.publishPage(currentPage.slug);
      setCurrentPage(JSON.parse(JSON.stringify(published)));
      setPages((prev) => prev.map((p) => (p.slug === published.slug ? published : p)));
      setDirty(false);
      setNotice(`"${published.name}" is now LIVE (v${published.published_version})! Active across website and mobile.`);
    } catch (e: any) {
      setError(e.message || 'Failed to publish page');
    } finally {
      setBusy(false);
    }
  }

  // Create New Page
  async function handleCreatePage(e: React.FormEvent) {
    e.preventDefault();
    if (!newPageForm.name.trim() || !newPageForm.slug.trim()) {
      setError('Page Name and Slug are required');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const created = await client.createPage({
        name: newPageForm.name.trim(),
        slug: newPageForm.slug.trim().toLowerCase(),
        path: newPageForm.path.trim() || `/${newPageForm.slug.trim().toLowerCase()}`,
        description: newPageForm.description.trim(),
        target_platform: newPageForm.target_platform,
      });

      if (newPageForm.template === 'starter') {
        const starterSections: PageSection[] = [
          {
            id: 'sec-hdr-' + Math.random().toString(36).substring(2, 7),
            type: library[0].type,
            name: `${created.name} Header`,
            variation: library[0].variations[0].key,
            available_variations: library[0].variations,
            features: library[0].default_features,
            images: library[0].default_images,
            order: 1,
            enabled: true,
          },
          {
            id: 'sec-src-' + Math.random().toString(36).substring(2, 7),
            type: library[1].type,
            name: 'Smart Search',
            variation: library[1].variations[0].key,
            available_variations: library[1].variations,
            features: library[1].default_features,
            images: library[1].default_images,
            order: 2,
            enabled: true,
          },
          {
            id: 'sec-hro-' + Math.random().toString(36).substring(2, 7),
            type: library[2].type,
            name: `${created.name} Hero Showcase`,
            variation: library[2].variations[0].key,
            available_variations: library[2].variations,
            features: library[2].default_features,
            images: library[2].default_images,
            order: 3,
            enabled: true,
          },
          {
            id: 'sec-srv-' + Math.random().toString(36).substring(2, 7),
            type: library[3].type,
            name: 'Curated Offerings',
            variation: library[3].variations[0].key,
            available_variations: library[3].variations,
            features: library[3].default_features,
            images: library[3].default_images,
            order: 4,
            enabled: true,
          },
        ];
        const withSections = await client.updatePage(created.slug, { sections: starterSections });
        setPages((prev) => [...prev, withSections]);
        setActiveSlug(withSections.slug);
        setCurrentPage(withSections);
      } else {
        setPages((prev) => [...prev, created]);
        setActiveSlug(created.slug);
        setCurrentPage(created);
      }

      setShowAddPageModal(false);
      setNewPageForm({
        name: '',
        slug: '',
        path: '',
        description: '',
        target_platform: 'all',
        template: 'starter',
      });
      setNotice(`Page "${created.name}" created successfully.`);
    } catch (e: any) {
      setError(e.message || 'Failed to create page');
    } finally {
      setBusy(false);
    }
  }

  // Delete Page
  async function handleDeletePage() {
    if (!currentPage || busy) return;
    if (['home', 'services', 'v-ads', 'v-essentials'].includes(currentPage.slug)) {
      alert('Core Vistrah pages cannot be deleted.');
      return;
    }
    if (!window.confirm(`Permanently delete custom page "${currentPage.name}" (${currentPage.slug})?`)) return;
    setBusy(true);
    try {
      await client.deletePage(currentPage.slug);
      const remaining = pages.filter((p) => p.slug !== currentPage.slug);
      setPages(remaining);
      const next = remaining[0];
      setActiveSlug(next.slug);
      setCurrentPage(JSON.parse(JSON.stringify(next)));
      setNotice(`Page "${currentPage.name}" deleted.`);
    } catch (e: any) {
      setError(e.message || 'Failed to delete page');
    } finally {
      setBusy(false);
    }
  }

  // Open Photo Changer Modal
  function openPhotoModal(sectionId: string, imageIndex: number, isNew: boolean = false) {
    if (!currentPage) return;
    const section = currentPage.sections.find((s) => s.id === sectionId);
    if (!section) return;

    const libMatch = library.find((l) => l.type === section.type);
    const recRes = libMatch?.recommended_resolution || '1920 × 600 px';

    if (isNew) {
      setPhotoForm({
        url: '',
        title: 'New Slide',
        alt_text: '',
        width: 0,
        height: 0,
        resolution: '',
        aspect_ratio: '',
        recommended_resolution: recRes,
      });
    } else {
      const existing = section.images[imageIndex] || { url: '' };
      setPhotoForm({
        ...existing,
        recommended_resolution: existing.recommended_resolution || recRes,
      });
    }

    setPhotoModal({ open: true, sectionId, imageIndex, isNew });
  }

  // Handle Local File Selection & Dimension Detection
  function handleLocalImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const ar = calculateAspectRatio(w, h);
        setPhotoForm((prev) => ({
          ...prev,
          url: dataUrl,
          width: w,
          height: h,
          resolution: `${w} × ${h} px`,
          aspect_ratio: ar,
          title: prev.title || file.name.replace(/\.[^/.]+$/, ''),
        }));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  // Measure Remote or Custom Image URL
  function inspectImageUrl(url: string) {
    if (!url.trim()) return;
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const ar = calculateAspectRatio(w, h);
      setPhotoForm((prev) => ({
        ...prev,
        width: w,
        height: h,
        resolution: `${w} × ${h} px`,
        aspect_ratio: ar,
      }));
    };
    img.src = url;
  }

  // Apply Photo Changes
  function applyPhotoModal() {
    if (!currentPage || !photoModal.open) return;
    if (!photoForm.url.trim()) {
      alert('Please provide an image URL or upload a photo.');
      return;
    }

    const { sectionId, imageIndex, isNew } = photoModal;
    const section = currentPage.sections.find((s) => s.id === sectionId);
    if (!section) return;

    let updatedImages = [...section.images];
    if (isNew) {
      updatedImages.push(photoForm);
    } else if (imageIndex >= 0 && imageIndex < updatedImages.length) {
      updatedImages[imageIndex] = photoForm;
    }

    updateSection(sectionId, { images: updatedImages });
    setPhotoModal({ open: false, sectionId: '', imageIndex: -1, isNew: false });
    setNotice('Photo updated with detected resolution.');
  }

  // Remove Photo from Section
  function removePhoto(sectionId: string, imageIndex: number) {
    if (!currentPage) return;
    const section = currentPage.sections.find((s) => s.id === sectionId);
    if (!section) return;
    if (section.images.length <= 1) {
      if (!window.confirm('This is the only photo in this section. Remove it anyway?')) return;
    }
    const updatedImages = section.images.filter((_, idx) => idx !== imageIndex);
    updateSection(sectionId, { images: updatedImages });
  }

  // Add Custom Variation
  function handleAddCustomVariation(sectionId: string) {
    if (!customVarForm.key.trim() || !customVarForm.name.trim()) return;
    const section = currentPage?.sections.find((s) => s.id === sectionId);
    if (!section) return;

    const newVar: SectionVariation = {
      key: customVarForm.key.trim().toLowerCase().replace(/\s+/g, '_'),
      name: customVarForm.name.trim(),
      description: customVarForm.description.trim() || 'Custom variation',
      badge: 'Custom',
    };

    updateSection(sectionId, {
      available_variations: [...section.available_variations, newVar],
      variation: newVar.key,
    });
    setAddingVariationSectionId(null);
    setCustomVarForm({ key: '', name: '', description: '' });
  }

  // Add Custom Feature Inclusion
  function handleAddCustomFeature(sectionId: string) {
    if (!customFeatForm.key.trim() || !customFeatForm.label.trim()) return;
    const section = currentPage?.sections.find((s) => s.id === sectionId);
    if (!section) return;

    const newFeat: SectionFeatureInclusion = {
      key: customFeatForm.key.trim().toLowerCase().replace(/\s+/g, '_'),
      label: customFeatForm.label.trim(),
      description: customFeatForm.description.trim() || 'Custom inclusion',
      enabled: true,
    };

    updateSection(sectionId, {
      features: [...section.features, newFeat],
    });
    setAddingFeatureSectionId(null);
    setCustomFeatForm({ key: '', label: '', description: '' });
  }

  if (loading) {
    return <p role="status">Loading Vistrah page architecture and section libraries…</p>;
  }

  return (
    <div className="edit-vistrah-container" style={{ maxWidth: 1240, margin: '0 auto', paddingBottom: 60 }}>
      {/* Top Banner Notice */}
      {error && <div role="alert"><p className="notice error" style={{marginBottom:14}}>{error}</p><button className="button secondary" onClick={()=>{if(!dirty||window.confirm('Discard unsaved changes and reload?')){setError('');retryLoad(value=>value+1);}}}>Retry loading existing pages</button></div>}
      {notice && <p className="notice" role="status" style={{ marginBottom: 14 }}>{notice}</p>}

      {/* Pages Selector Bar */}
      <div
        style={{
          background: 'var(--surface, #1e2433)',
          border: '1px solid var(--border, #333d52)',
          borderRadius: 10,
          padding: '16px 20px',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={20} style={{ color: '#e5a93c' }} />
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Vistrah Pages & Section Architecture</h2>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted, #94a3b8)' }}>
              Select a page to configure sections, select layout variations, toggle feature inclusions, and manage running photos.
            </p>
          </div>

          <button
            className="button"
            disabled={!pages.length} onClick={() => setShowAddPageModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={16} /> Add Page
          </button>
        </div>

        {/* Page Tabs */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, overflowX: 'auto', paddingBottom: 4 }}>
          {pages.map((p) => {
            const isActive = p.slug === activeSlug;
            const isLive = Boolean(p.published_version);
            return (
              <button
                key={p.slug}
                onClick={() => switchPage(p.slug)}
                className={`button ${isActive ? '' : 'secondary'}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: isActive ? '2px solid #e5a93c' : '1px solid var(--border, #333d52)',
                  background: isActive ? 'rgba(229,169,60,0.12)' : 'transparent',
                  fontWeight: isActive ? 700 : 500,
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{p.name}</span>
                <span
                  style={{
                    fontSize: 10,
                    textTransform: 'uppercase',
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: isLive ? '#166534' : '#854d0e',
                    color: '#fff',
                    fontWeight: 700,
                  }}
                >
                  {editorPageStatus(p)}
                </span>
                <span style={{ fontSize: 11, opacity: 0.65 }}>({p.sections?.length || 0} sections)</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Page Working Area */}
      {currentPage && (
        <div>
          {/* Page Details & Publishing Header */}
          <div
            style={{
              background: 'var(--surface, #1e2433)',
              border: '1px solid var(--border, #333d52)',
              borderRadius: 10,
              padding: 20,
              marginBottom: 24,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{currentPage.name}</h1>
                  <span
                    style={{
                      background: currentPage.status === 'LIVE' ? '#15803d' : '#a16207',
                      color: '#fff',
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {currentPage.status === 'LIVE' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    {currentPage.status === 'LIVE'
                      ? `LIVE · Published Version ${currentPage.published_version || 1}`
                      : 'DRAFT · Unpublished Edits'}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      padding: '4px 8px',
                      borderRadius: 4,
                      background: 'rgba(255,255,255,0.06)',
                      color: 'var(--muted, #94a3b8)',
                    }}
                  >
                    Path: <code style={{ color: '#e5a93c' }}>{currentPage.path || '/' + currentPage.slug}</code>
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      padding: '4px 8px',
                      borderRadius: 4,
                      background: 'rgba(255,255,255,0.06)',
                      color: 'var(--muted, #94a3b8)',
                    }}
                  >
                    Platform: <strong style={{ color: '#fff' }}>{currentPage.target_platform.toUpperCase()}</strong>
                  </span>
                </div>
                <p style={{ margin: '8px 0 0', color: 'var(--muted, #94a3b8)', fontSize: 14 }}>
                  {currentPage.description || 'No description provided.'}
                  {currentPage.published_at && (
                    <span style={{ marginLeft: 12, fontSize: 12, opacity: 0.8 }}>
                      Last published: {new Date(currentPage.published_at).toLocaleString()}
                    </span>
                  )}
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => setPreviewMode(previewMode === 'none' ? 'desktop' : 'none')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Eye size={16} />
                  {previewMode !== 'none' ? 'Hide Preview' : 'Preview Draft'}
                </button>

                <button
                  className="button secondary"
                  disabled={busy || !dirty}
                  onClick={() => reloadCurrentPage()}
                >
                  Discard Edits
                </button>

                <button
                  className="button secondary"
                  disabled={busy || !dirty}
                  onClick={() => void handleSaveDraft()}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Save size={16} /> Save Draft
                </button>

                <button
                  className="button"
                  disabled={busy}
                  onClick={() => void handlePublishPage()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#16a34a',
                    borderColor: '#16a34a',
                    color: '#fff',
                    fontWeight: 700,
                  }}
                >
                  <Sparkles size={16} /> Make It Live
                </button>

                {!['home', 'services', 'v-ads', 'v-essentials'].includes(currentPage.slug) && (
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => void handleDeletePage()}
                    style={{ color: '#ef4444', borderColor: '#ef4444', marginLeft: 8 }}
                    title="Delete Custom Page"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            {currentPage.content_source==='APP'&&<p className="notice">Existing app page baseline: no CMS override is published. Saving a draft keeps the app page unchanged; publishing enables the edited layout.</p>}
            {/* Quick Page Meta Editor */}
            <details style={{ marginTop: 14 }}>
              <summary style={{ cursor: 'pointer', fontSize: 13, color: '#e5a93c' }}>
                Edit Page Details (Route Path, Description, Platform)
              </summary>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 10 }}>
                <label style={{ fontSize: 13 }}>
                  Page Display Name
                  <input
                    type="text"
                    value={currentPage.name}
                    onChange={(e) => {
                      setCurrentPage({ ...currentPage, name: e.target.value });
                      setDirty(true);
                    }}
                    style={{ width: '100%', marginTop: 4 }}
                  />
                </label>
                <label style={{ fontSize: 13 }}>
                  Route Path
                  <input
                    type="text"
                    value={currentPage.path}
                    onChange={(e) => {
                      setCurrentPage({ ...currentPage, path: e.target.value });
                      setDirty(true);
                    }}
                    style={{ width: '100%', marginTop: 4 }}
                  />
                </label>
                <label style={{ fontSize: 13 }}>
                  Target Platform
                  <select
                    value={currentPage.target_platform}
                    onChange={(e: any) => {
                      setCurrentPage({ ...currentPage, target_platform: e.target.value });
                      setDirty(true);
                    }}
                    style={{ width: '100%', marginTop: 4 }}
                  >
                    <option value="all">All Platforms (Web + Mobile)</option>
                    <option value="web">Web Only</option>
                    <option value="mobile">Mobile App Only</option>
                  </select>
                </label>
                <label style={{ fontSize: 13, gridColumn: '1 / -1' }}>
                  Description
                  <input
                    type="text"
                    value={currentPage.description}
                    onChange={(e) => {
                      setCurrentPage({ ...currentPage, description: e.target.value });
                      setDirty(true);
                    }}
                    style={{ width: '100%', marginTop: 4 }}
                  />
                </label>
              </div>
            </details>
          </div>

          {/* Interactive Draft Preview Panel */}
          {previewMode !== 'none' && (
            <div
              style={{
                background: '#0f172a',
                border: '2px dashed #e5a93c',
                borderRadius: 12,
                padding: 20,
                marginBottom: 28,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Eye size={18} style={{ color: '#e5a93c' }} />
                  <strong style={{ fontSize: 15 }}>Draft Layout Simulator ({currentPage.name})</strong>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className={`button ${previewMode === 'desktop' ? '' : 'secondary'}`}
                    onClick={() => setPreviewMode('desktop')}
                    style={{ padding: '4px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <Globe size={14} /> Desktop (960px)
                  </button>
                  <button
                    className={`button ${previewMode === 'phone' ? '' : 'secondary'}`}
                    onClick={() => setPreviewMode('phone')}
                    style={{ padding: '4px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <Smartphone size={14} /> Mobile Phone (390px)
                  </button>
                </div>
              </div>

              <div
                style={{
                  maxWidth: previewMode === 'phone' ? 390 : 960,
                  margin: '0 auto',
                  background: '#090d16',
                  border: '1px solid #334155',
                  borderRadius: 10,
                  padding: 16,
                  overflow: 'hidden',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                }}
              >
                {currentPage.sections.filter((s) => s.enabled).map((sec, idx) => (
                  <div
                    key={sec.id}
                    style={{
                      borderBottom: idx < currentPage.sections.length - 1 ? '1px solid #1e293b' : 'none',
                      padding: '14px 0',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, textTransform: 'uppercase', color: '#e5a93c', fontWeight: 700 }}>
                        {idx + 1}. {sec.name} ({sec.variation})
                      </span>
                      <span style={{ fontSize: 10, background: '#1e293b', padding: '2px 6px', borderRadius: 4 }}>
                        {sec.type.toUpperCase()}
                      </span>
                    </div>

                    {sec.content?.en?.title&&<h2>{sec.content.en.title}</h2>}
                    {sec.content?.en?.description&&<p style={{whiteSpace:'pre-wrap'}}>{sec.content.en.description}</p>}
                    {sec.content?.en?.action&&sec.action_href&&<span className="button">{sec.content.en.action} <small>({sec.action_href})</small></span>}
                    {/* Section Mock Visuals */}
                    {sec.images.length > 0 && (
                      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
                        {sec.images.map((img, imgIdx) => (
                          <div
                            key={imgIdx}
                            style={{
                              position: 'relative',
                              background: '#1e293b',
                              borderRadius: 6,
                              overflow: 'hidden',
                              border: '1px solid #334155',
                              flexShrink: 0,
                              width: previewMode === 'phone' ? '100%' : '48%',
                              height: previewMode === 'phone' ? 140 : 180,
                            }}
                          >
                            <img
                              src={img.url}
                              alt={img.alt_text || img.title || 'preview'}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => {
                                (e.currentTarget as any).src = '/brand/lockup-dark.png';
                              }}
                            />
                            <div
                              style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                background: 'rgba(0,0,0,0.75)',
                                padding: '4px 8px',
                                fontSize: 10,
                                color: '#fff',
                                display: 'flex',
                                justifyContent: 'space-between',
                              }}
                            >
                              <span>{img.title || 'Image ' + (imgIdx + 1)}</span>
                              <span style={{ color: '#e5a93c' }}>{img.resolution || 'Measured'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Features Badges Preview */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                      {sec.features.filter((f) => f.enabled).map((f) => (
                        <span
                          key={f.key}
                          style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            background: 'rgba(229,169,60,0.15)',
                            color: '#e5a93c',
                            borderRadius: 4,
                          }}
                        >
                          ✓ {f.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section Library Quick Adder Bar */}
          <div
            style={{
              background: 'var(--surface, #1e2433)',
              border: '1px solid var(--border, #333d52)',
              borderRadius: 10,
              padding: 18,
              marginBottom: 24,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <strong style={{ fontSize: 15 }}>Add Sections to &quot;{currentPage.name}&quot;</strong>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted, #94a3b8)' }}>
                  Choose from standardized Vistrah sections with pre-configured variations, recommended resolutions, and features:
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginTop: 14 }}>
              {library.map((libItem, idx) => (
                <button
                  key={libItem.type}
                  onClick={() => addSectionFromLibrary(libItem)}
                  className="button secondary"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: 12,
                    borderRadius: 8,
                    textAlign: 'left',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border, #333d52)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <strong style={{ fontSize: 13, color: '#e5a93c' }}>
                      {idx + 1}. {libItem.default_name}
                    </strong>
                    <Plus size={14} />
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--muted, #94a3b8)', marginTop: 4 }}>
                    {libItem.description.substring(0, 60)}…
                  </span>
                  <span style={{ fontSize: 10, background: '#1e293b', padding: '2px 6px', borderRadius: 4, marginTop: 6, color: '#38bdf8' }}>
                    Rec: {libItem.recommended_resolution}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Sections List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {currentPage.sections.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, border: '1px dashed #475569', borderRadius: 10 }}>
                <p style={{ color: 'var(--muted, #94a3b8)' }}>This page currently has no sections configured.</p>
                <p style={{ fontSize: 13 }}>Click any section above to add it to this page.</p>
              </div>
            ) : (
              currentPage.sections.map((section, index) => {
                const libMatch = library.find((l) => l.type === section.type);
                const recRes = libMatch?.recommended_resolution || '1920 × 600 px';

                return (
                  <div
                    key={section.id}
                    style={{
                      background: 'var(--surface, #1e2433)',
                      border: '1px solid var(--border, #333d52)',
                      borderRadius: 10,
                      padding: 20,
                      opacity: section.enabled ? 1 : 0.6,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                  >
                    {/* Section Top Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, borderBottom: '1px solid var(--border, #333d52)', paddingBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span
                          style={{
                            background: '#e5a93c',
                            color: '#000',
                            fontWeight: 800,
                            fontSize: 12,
                            padding: '2px 8px',
                            borderRadius: 6,
                          }}
                        >
                          #{index + 1}
                        </span>
                        <input
                          type="text"
                          value={section.name}
                          onChange={(e) => updateSection(section.id, { name: e.target.value })}
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            border: '1px solid transparent',
                            background: 'transparent',
                            color: '#fff',
                            padding: '2px 6px',
                            borderRadius: 4,
                          }}
                          onFocus={(e) => (e.target.style.background = '#0f172a')}
                          onBlur={(e) => (e.target.style.background = 'transparent')}
                          placeholder="Unique Section Name"
                        />
                        <span
                          style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 4,
                            background: '#0f172a',
                            border: '1px solid #334155',
                            color: '#94a3b8',
                          }}
                        >
                          Type: <strong>{section.type}</strong>
                        </span>
                      </div>

                      {/* Section Controls */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          className="button secondary"
                          disabled={index === 0}
                          onClick={() => moveSection(index, -1)}
                          title="Move Section Up"
                          style={{ padding: '4px 8px' }}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          className="button secondary"
                          disabled={index === currentPage.sections.length - 1}
                          onClick={() => moveSection(index, 1)}
                          title="Move Section Down"
                          style={{ padding: '4px 8px' }}
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          className="button secondary"
                          onClick={() => duplicateSection(section.id)}
                          title="Duplicate Section"
                          style={{ padding: '4px 8px' }}
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          className="button secondary"
                          onClick={() => updateSection(section.id, { enabled: !section.enabled })}
                          style={{ padding: '4px 8px', color: section.enabled ? '#22c55e' : '#94a3b8' }}
                          title={section.enabled ? 'Section is active (click to hide)' : 'Section is disabled (click to activate)'}
                        >
                          {section.enabled ? 'Active' : 'Disabled'}
                        </button>
                        <button
                          className="button secondary"
                          onClick={() => deleteSection(section.id)}
                          title="Delete Section"
                          style={{ padding: '4px 8px', color: '#ef4444' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Section Body */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20, marginTop: 16 }}>
                      <fieldset style={{display:'grid',gap:12,minWidth:0}}><legend>Customer-facing content</legend><p>Global navigation and account tools remain managed by the app. Use these fields for published headings, descriptions and calls to action.</p>
                        <p>English is the fallback when a Kannada or Hindi field is empty. Buttons use local app paths, for example /services or /pages/your-page.</p>
                        {(['en','kn','hi'] as const).map(language=><details key={language} open={language==='en'}><summary>{{en:'English',kn:'Kannada',hi:'Hindi'}[language]}</summary><div style={{display:'grid',gap:8,paddingBlock:10}}>{(['title','description','action'] as const).map(field=><label key={field}>{field==='action'?'Button label':field==='title'?'Heading':'Description'}<textarea rows={field==='description'?3:1} maxLength={5000} value={section.content?.[language]?.[field]??''} onChange={event=>updateSection(section.id,{content:{...section.content,[language]:{...section.content?.[language],[field]:event.target.value}}})} style={{display:'block',width:'100%',boxSizing:'border-box'}}/></label>)}</div></details>)}
                        <label>Video playlist (one hosted HTTPS or local video URL per line)<textarea rows={3} value={(section.video_urls??[]).join('\n')} onChange={event=>updateSection(section.id,{video_urls:event.target.value.split('\n')})} placeholder="/videos/homepage/vistrah-introduction.mp4" style={{display:'block',width:'100%'}}/></label>
                        <label>Button destination<input value={section.action_href??''} onChange={event=>updateSection(section.id,{action_href:event.target.value})} placeholder="/services" style={{display:'block',width:'100%'}}/></label>
                      </fieldset>
                      {/* 1. Variations Selector */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <label style={{ fontSize: 13, fontWeight: 700, color: '#e5a93c' }}>
                            Variations ({section.available_variations.length} available)
                          </label>
                          <button
                            className="button secondary"
                            disabled title="Use an existing layout. New layout definitions require a matching renderer." onClick={() => setAddingVariationSectionId(section.id)}
                            style={{ padding: '2px 8px', fontSize: 11 }}
                          >
                            + Custom Variation
                          </button>
                        </div>

                        {addingVariationSectionId === section.id && (
                          <div style={{ background: '#0f172a', padding: 12, borderRadius: 8, marginBottom: 12, border: '1px solid #334155' }}>
                            <strong style={{ fontSize: 12 }}>Define New Variation for &quot;{section.name}&quot;</strong>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                              <input
                                placeholder="Variation Key (e.g. split_cards)"
                                value={customVarForm.key}
                                onChange={(e) => setCustomVarForm({ ...customVarForm, key: e.target.value })}
                                style={{ fontSize: 12 }}
                              />
                              <input
                                placeholder="Display Name (e.g. Split Cards Layout)"
                                value={customVarForm.name}
                                onChange={(e) => setCustomVarForm({ ...customVarForm, name: e.target.value })}
                                style={{ fontSize: 12 }}
                              />
                              <input
                                placeholder="Description"
                                value={customVarForm.description}
                                onChange={(e) => setCustomVarForm({ ...customVarForm, description: e.target.value })}
                                style={{ fontSize: 12, gridColumn: '1 / -1' }}
                              />
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                              <button className="button" onClick={() => handleAddCustomVariation(section.id)} style={{ padding: '4px 10px', fontSize: 12 }}>
                                Save Variation
                              </button>
                              <button className="button secondary" onClick={() => setAddingVariationSectionId(null)} style={{ padding: '4px 10px', fontSize: 12 }}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                          {section.available_variations.map((v) => {
                            const isSelected = section.variation === v.key;
                            return (
                              <div
                                key={v.key}
                                onClick={() => updateSection(section.id, { variation: v.key })}
                                style={{
                                  border: isSelected ? '2px solid #e5a93c' : '1px solid var(--border, #333d52)',
                                  background: isSelected ? 'rgba(229,169,60,0.08)' : 'rgba(255,255,255,0.02)',
                                  borderRadius: 8,
                                  padding: 10,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <strong style={{ fontSize: 13, color: isSelected ? '#e5a93c' : '#fff' }}>
                                    {v.name}
                                  </strong>
                                  {v.badge && (
                                    <span style={{ fontSize: 9, background: '#e5a93c', color: '#000', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                                      {v.badge}
                                    </span>
                                  )}
                                </div>
                                <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--muted, #94a3b8)' }}>
                                  {v.description}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2. Feature Inclusions */}<p>Page content can control its call to action. Location, verification, pricing, accounts and payments retain their existing app workflows; design feature definitions do not enable those capabilities.</p>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <label style={{ fontSize: 13, fontWeight: 700, color: '#e5a93c' }}>
                            Feature Inclusions & Capabilities
                          </label>
                          <button
                            className="button secondary"
                            disabled title="App capabilities require an implemented component; adding a definition does not enable functionality." onClick={() => setAddingFeatureSectionId(section.id)}
                            style={{ padding: '2px 8px', fontSize: 11 }}
                          >
                            + Custom Feature
                          </button>
                        </div>

                        {addingFeatureSectionId === section.id && (
                          <div style={{ background: '#0f172a', padding: 12, borderRadius: 8, marginBottom: 12, border: '1px solid #334155' }}>
                            <strong style={{ fontSize: 12 }}>Define New Feature for &quot;{section.name}&quot;</strong>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                              <input
                                placeholder="Feature Key (e.g. show_coupon)"
                                value={customFeatForm.key}
                                onChange={(e) => setCustomFeatForm({ ...customFeatForm, key: e.target.value })}
                                style={{ fontSize: 12 }}
                              />
                              <input
                                placeholder="Label (e.g. Coupon Code Box)"
                                value={customFeatForm.label}
                                onChange={(e) => setCustomFeatForm({ ...customFeatForm, label: e.target.value })}
                                style={{ fontSize: 12 }}
                              />
                              <input
                                placeholder="Description"
                                value={customFeatForm.description}
                                onChange={(e) => setCustomFeatForm({ ...customFeatForm, description: e.target.value })}
                                style={{ fontSize: 12, gridColumn: '1 / -1' }}
                              />
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                              <button className="button" onClick={() => handleAddCustomFeature(section.id)} style={{ padding: '4px 10px', fontSize: 12 }}>
                                Save Feature
                              </button>
                              <button className="button secondary" onClick={() => setAddingFeatureSectionId(null)} style={{ padding: '4px 10px', fontSize: 12 }}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 8 }}>
                          {section.features.filter(feat=>feat.key==='show_direct_cta').map((feat) => (
                            <label
                              key={feat.key}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 10,
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid var(--border, #333d52)',
                                borderRadius: 6,
                                padding: 8,
                                cursor: 'pointer',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={feat.enabled}
                                onChange={(e) => {
                                  const updatedFeatures = section.features.map((f) =>
                                    f.key === feat.key ? { ...f, enabled: e.target.checked } : f
                                  );
                                  updateSection(section.id, { features: updatedFeatures });
                                }}
                                style={{ marginTop: 3 }}
                              />
                              <div>
                                <strong style={{ fontSize: 12, display: 'block', color: feat.enabled ? '#fff' : '#94a3b8' }}>
                                  {feat.label}
                                </strong>
                                <span style={{ fontSize: 11, color: 'var(--muted, #94a3b8)' }}>
                                  {feat.description}
                                </span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* 3. Section Running Images & Photo Changer */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ImageIcon size={16} style={{ color: '#e5a93c' }} />
                            <label style={{ fontSize: 13, fontWeight: 700, color: '#e5a93c' }}>
                              Current Running Photos ({section.images.length})
                            </label>
                            <span style={{ fontSize: 11, color: '#38bdf8', background: 'rgba(56,189,248,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                              Recommended: {recRes}
                            </span>
                          </div>

                          <button
                            className="button secondary"
                            onClick={() => openPhotoModal(section.id, -1, true)}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '4px 10px' }}
                          >
                            <Plus size={14} /> Add Photo
                          </button>
                        </div>

                        {/* Images Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                          {section.images.map((img, imgIdx) => (
                            <div
                              key={imgIdx}
                              style={{
                                background: '#0f172a',
                                border: '1px solid #334155',
                                borderRadius: 8,
                                padding: 12,
                                display: 'flex',
                                gap: 12,
                                alignItems: 'center',
                              }}
                            >
                              {/* Thumbnail */}
                              <div
                                style={{
                                  width: 90,
                                  height: 65,
                                  background: '#1e293b',
                                  borderRadius: 6,
                                  overflow: 'hidden',
                                  flexShrink: 0,
                                  border: '1px solid #475569',
                                }}
                              >
                                <img
                                  src={img.url}
                                  alt={img.alt_text || img.title || 'Thumbnail'}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  onError={(e) => {
                                    (e.currentTarget as any).src = '/brand/lockup-dark.png';
                                  }}
                                />
                              </div>

                              {/* Details & Resolution */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <strong style={{ fontSize: 13, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {img.title || `Photo #${imgIdx + 1}`}
                                </strong>

                                <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  <span style={{ fontSize: 11, color: '#e5a93c', fontWeight: 700 }}>
                                    Resolution: {img.resolution || (img.width && img.height ? `${img.width} × ${img.height} px` : 'Detected on change')}
                                  </span>
                                  <span style={{ fontSize: 11, color: 'var(--muted, #94a3b8)' }}>
                                    Aspect Ratio: <strong style={{ color: '#fff' }}>{img.aspect_ratio || 'Standard'}</strong>
                                  </span>
                                </div>

                                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                  <button
                                    className="button"
                                    onClick={() => openPhotoModal(section.id, imgIdx, false)}
                                    style={{ padding: '3px 8px', fontSize: 11 }}
                                  >
                                    Change Photo
                                  </button>
                                  <button
                                    className="button secondary"
                                    onClick={() => removePhoto(section.id, imgIdx)}
                                    style={{ padding: '3px 8px', fontSize: 11, color: '#ef4444' }}
                                    title="Remove this photo"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ===================== MODALS ===================== */}

      {/* 1. Add Page Modal */}
      {showAddPageModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#1e2433',
              border: '1px solid #334155',
              borderRadius: 12,
              padding: 24,
              maxWidth: 520,
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            }}
          >
            <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>Add New Vistrah Page</h2>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--muted, #94a3b8)' }}>
              Define a new page, assign sections, variations, and make it live across Vistrah.
            </p>

            <form onSubmit={handleCreatePage} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={{ fontSize: 13 }}>
                Page Name *
                <input
                  required
                  placeholder="e.g. Festive Deals or Trending Brands"
                  value={newPageForm.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                    setNewPageForm({
                      ...newPageForm,
                      name,
                      slug: newPageForm.slug || slug,
                      path: newPageForm.path || `/${slug}`,
                    });
                  }}
                  style={{ width: '100%', marginTop: 4 }}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ fontSize: 13 }}>
                  URL Slug *
                  <input
                    required
                    placeholder="e.g. festive-deals"
                    value={newPageForm.slug}
                    onChange={(e) => setNewPageForm({ ...newPageForm, slug: e.target.value })}
                    style={{ width: '100%', marginTop: 4 }}
                  />
                </label>
                <label style={{ fontSize: 13 }}>
                  Route Path
                  <input
                    placeholder="e.g. /festive-deals"
                    value={newPageForm.path}
                    onChange={(e) => setNewPageForm({ ...newPageForm, path: e.target.value })}
                    style={{ width: '100%', marginTop: 4 }}
                  />
                </label>
              </div>

              <label style={{ fontSize: 13 }}>
                Target Platform
                <select
                  value={newPageForm.target_platform}
                  onChange={(e: any) => setNewPageForm({ ...newPageForm, target_platform: e.target.value })}
                  style={{ width: '100%', marginTop: 4 }}
                >
                  <option value="all">All Platforms (Web & Mobile App)</option>
                  <option value="web">Web Platform Only</option>
                  <option value="mobile">Mobile App Only</option>
                </select>
              </label>

              <label style={{ fontSize: 13 }}>
                Starter Template
                <select
                  value={newPageForm.template}
                  onChange={(e: any) => setNewPageForm({ ...newPageForm, template: e.target.value })}
                  style={{ width: '100%', marginTop: 4 }}
                >
                  <option value="starter">Full Starter (Header, Search, Hero Showcase, Curated Services)</option>
                  <option value="empty">Empty Blank Page (Add sections manually)</option>
                </select>
              </label>

              <label style={{ fontSize: 13 }}>
                Description
                <textarea
                  rows={2}
                  placeholder="Page summary for search, SEO, and navigation…"
                  value={newPageForm.description}
                  onChange={(e) => setNewPageForm({ ...newPageForm, description: e.target.value })}
                  style={{ width: '100%', marginTop: 4 }}
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setShowAddPageModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="button" disabled={busy}>
                  Create Page & Open Editor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Photo Changer & Resolution Inspector Modal */}
      {photoModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#1e2433',
              border: '1px solid #334155',
              borderRadius: 12,
              padding: 24,
              maxWidth: 580,
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            }}
          >
            <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>
              {photoModal.isNew ? 'Add New Section Photo' : 'Change Section Photo & Inspect Resolution'}
            </h2>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--muted, #94a3b8)' }}>
              Upload an image from your computer or provide an image URL. Resolution and aspect ratio are automatically measured.
            </p>

            {/* Target Resolution Alert */}
            <div
              style={{
                background: 'rgba(56,189,248,0.1)',
                border: '1px solid #38bdf8',
                padding: '8px 12px',
                borderRadius: 6,
                marginBottom: 16,
                fontSize: 12,
                color: '#38bdf8',
              }}
            >
              Recommended Resolution for this section: <strong>{photoForm.recommended_resolution || '1920 × 600 px'}</strong>
            </div>

            {/* Live Preview & Measured Resolution */}
            {photoForm.url && (
              <div
                style={{
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                  display: 'flex',
                  gap: 16,
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: 140,
                    height: 90,
                    borderRadius: 6,
                    overflow: 'hidden',
                    background: '#1e293b',
                    border: '1px solid #475569',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={photoForm.url}
                    alt="Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      if (!photoForm.width || !photoForm.height) {
                        const w = img.naturalWidth;
                        const h = img.naturalHeight;
                        setPhotoForm((prev) => ({
                          ...prev,
                          width: w,
                          height: h,
                          resolution: `${w} × ${h} px`,
                          aspect_ratio: calculateAspectRatio(w, h),
                        }));
                      }
                    }}
                  />
                </div>

                <div>
                  <strong style={{ fontSize: 13, color: '#e5a93c' }}>Measured Image Details:</strong>
                  <div style={{ marginTop: 4, fontSize: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span>
                      Resolution: <strong>{photoForm.resolution || 'Measuring…'}</strong>
                    </span>
                    <span>
                      Aspect Ratio: <strong>{photoForm.aspect_ratio || 'Standard'}</strong>
                    </span>
                    {photoForm.width && photoForm.height && (
                      <span style={{ color: '#22c55e', fontWeight: 600 }}>
                        ✓ Width: {photoForm.width}px, Height: {photoForm.height}px
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Upload or URL Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Option A: Choose Image File from Computer
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  onChange={handleLocalImageUpload}
                  style={{ width: '100%', fontSize: 12 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Option B: Or Enter Image URL / Asset Path
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    placeholder="e.g. /brand/hero-banner.jpg or https://..."
                    value={photoForm.url}
                    onChange={(e) => setPhotoForm({ ...photoForm, url: e.target.value })}
                    style={{ flex: 1, fontSize: 12 }}
                  />
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => inspectImageUrl(photoForm.url)}
                    style={{ fontSize: 12 }}
                  >
                    Measure
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={{ fontSize: 13 }}>
                  Photo Title / Headline
                  <input
                    placeholder="e.g. Seasonal Grand Sale"
                    value={photoForm.title || ''}
                    onChange={(e) => setPhotoForm({ ...photoForm, title: e.target.value })}
                    style={{ width: '100%', marginTop: 4, fontSize: 12 }}
                  />
                </label>
                <label style={{ fontSize: 13 }}>
                  Accessibility Alt Text
                  <input
                    placeholder="e.g. Gold jewelry banner on model"
                    value={photoForm.alt_text || ''}
                    onChange={(e) => setPhotoForm({ ...photoForm, alt_text: e.target.value })}
                    style={{ width: '100%', marginTop: 4, fontSize: 12 }}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setPhotoModal({ open: false, sectionId: '', imageIndex: -1, isNew: false })}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={applyPhotoModal}
                  style={{ background: '#e5a93c', color: '#000', fontWeight: 700 }}
                >
                  {photoModal.isNew ? 'Add Photo to Section' : 'Apply Replacement'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

