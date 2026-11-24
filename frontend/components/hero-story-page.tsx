import Link from 'next/link';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Briefcase,
  Calendar,
  CheckCircle2,
  Coffee,
  Compass,
  Droplet,
  Heart,
  Home,
  Key,
  MessageCircle,
  Phone,
  Play,
  PlusSquare,
  ShieldCheck,
  ShoppingBag,
  Sliders,
  Star,
  Sun,
  TrendingUp,
  Truck,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import {
  ADS_STUDIO_PILLARS,
  AGRI_CARDS,
  BUSINESS_TIMELINE,
  getHeroBannerByKey,
  HEALTH_PATHWAYS,
  HERO_BANNERS,
  USER_COMPARISON,
  USER_VERTICALS,
  VADS_RATE_SNAPSHOT,
  type HeroBannerKey,
} from '../../shared/hero-banners';
import styles from './hero-story-page.module.css';

const ICON_MAP = {
  home: Home,
  briefcase: Briefcase,
  truck: Truck,
  heart: Heart,
  sun: Sun,
  key: Key,
  coffee: Coffee,
  'shopping-bag': ShoppingBag,
  'book-open': BookOpen,
  users: Users,
  compass: Compass,
  star: Star,
  calendar: Calendar,
  'trending-up': TrendingUp,
  droplet: Droplet,
  sliders: Sliders,
  'user-check': UserCheck,
  activity: Activity,
  'plus-square': PlusSquare,
} as const;

export function HeroStoryPage({storyKey}: {storyKey: HeroBannerKey}) {
  const banner = getHeroBannerByKey(storyKey);

  return (
    <div className={`container ${styles.page}`}>
      {/* Top Magazine Switcher */}
      <nav className={styles.storyNav} aria-label="Featured VISTRAH guides">
        <Link href="/" className={styles.backHome}>
          <ArrowLeft size={15} aria-hidden="true" />
          <span>Home</span>
        </Link>

        <div className={styles.storyTabs}>
          {HERO_BANNERS.map(item => {
            const active = item.key === storyKey;
            return (
              <Link
                key={item.key}
                href={item.storyPath}
                aria-current={active ? 'page' : undefined}
                className={`${styles.storyTab} ${active ? styles.storyTabActive : ''}`}
              >
                <span>{item.navTitle}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Full-Width Banner Artwork Header + Hairline Stat Strip */}
      <header className={styles.heroFrame}>
        <div className={styles.bannerArtworkWrap}>
          <img
            src={banner.webImageSrc}
            alt={`${banner.navTitle} — ${banner.title}`}
            className={styles.bannerArtwork}
          />
        </div>

        <div className={styles.heroIntroRow}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{banner.navTitle}</p>
            <h1 className={styles.displayTitle}>{banner.title}</h1>
            <p className={styles.oneLineLead}>{banner.subtitle}</p>
          </div>

          <div className={styles.ctaGroup}>
            <Link href={banner.primaryCta.webHref} className={styles.primaryBtn}>
              <span>{banner.primaryCta.label}</span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            {banner.secondaryCta && (
              <Link href={banner.secondaryCta.webHref} className={styles.secondaryBtn}>
                <span>{banner.secondaryCta.label}</span>
              </Link>
            )}
          </div>
        </div>

        <div className={styles.statStrip}>
          {banner.stats.map(stat => (
            <div key={stat.label} className={styles.statCell}>
              <span className={styles.statValue}>{stat.value}</span>
              <span className={styles.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>
      </header>

      {/* STORY 1: FOR USERS */}
      {storyKey === 'users' && (
        <>
          <section className={styles.sectionBlock} aria-labelledby="compare-heading">
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrow}>Direct Marketplace Comparison</p>
                <h2 id="compare-heading" className={styles.sectionTitle}>
                  Static Directories vs. VISTRAH Direct
                </h2>
              </div>
              <p className={styles.sectionCaption}>
                Why thousands skip broker portals for direct owner contact.
              </p>
            </div>

            <div className={styles.compareGrid}>
              {/* Legacy Directory UI Mockup */}
              <article className={styles.compareCard}>
                <div className={styles.mockupCanvas}>
                  <div className={styles.legacySpamRow}>
                    <span>Incoming: Unknown Lead Agent #1</span>
                    <span className={styles.legacyBadge}>SPAM ×5</span>
                  </div>
                  <div className={styles.legacySpamRow}>
                    <span>Map Pin: Last updated 2021</span>
                    <span className={styles.legacyBadge}>UNVERIFIED</span>
                  </div>
                </div>
                <div className={styles.compareBody}>
                  <p className={styles.eyebrow}>{USER_COMPARISON.legacyTag}</p>
                  <h3 className={styles.cardTitle}>{USER_COMPARISON.legacyTitle}</h3>
                  <ul className={styles.compareList}>
                    {USER_COMPARISON.legacyRows.map(row => (
                      <li key={row}>
                        <XCircle size={16} color="#ef4444" aria-hidden="true" />
                        <span>{row}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>

              {/* VISTRAH Verified UI Mockup */}
              <article className={`${styles.compareCard} ${styles.compareCardHighlight}`}>
                <div className={styles.mockupCanvas}>
                  <div className={styles.verifiedMockCard}>
                    <div className={styles.verifiedMockTop}>
                      <span className={styles.verifiedTag}>
                        <ShieldCheck size={15} aria-hidden="true" />
                        Verified Owner · 2.4 km away
                      </span>
                      <span className={styles.numTag}>9:16 Live Reel</span>
                    </div>
                    <div className={styles.mockActionRow}>
                      <span className={styles.mockPillSolid}>
                        <Phone size={13} aria-hidden="true" />
                        Call Owner
                      </span>
                      <span className={styles.mockPillOutline}>
                        <MessageCircle size={13} aria-hidden="true" />
                        WhatsApp
                      </span>
                      <span className={styles.mockPillOutline}>
                        <Play size={12} aria-hidden="true" />
                        60s Demo
                      </span>
                    </div>
                  </div>
                </div>
                <div className={styles.compareBody}>
                  <p className={styles.eyebrow}>{USER_COMPARISON.vistrahTag}</p>
                  <h3 className={styles.cardTitle}>{USER_COMPARISON.vistrahTitle}</h3>
                  <ul className={styles.compareList}>
                    {USER_COMPARISON.vistrahRows.map(row => (
                      <li key={row}>
                        <CheckCircle2 size={16} color="#10b981" aria-hidden="true" />
                        <span>{row}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            </div>
          </section>

          <section className={styles.sectionBlock} aria-labelledby="verticals-heading">
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrow}>13 ESSENTIAL SECTORS</p>
                <h2 id="verticals-heading" className={styles.sectionTitle}>
                  One Unified Local Discovery Grid
                </h2>
              </div>
              <Link href="/services" className={styles.secondaryBtn}>
                <span>Browse All Categories</span>
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>

            <div className={styles.verticalGrid}>
              {USER_VERTICALS.map(v => {
                const Icon = ICON_MAP[v.icon as keyof typeof ICON_MAP] ?? Compass;
                return (
                  <Link
                    key={v.num}
                    href={`/services?category=${encodeURIComponent(v.slug)}`}
                    className={styles.verticalTile}
                  >
                    <div className={styles.verticalTileTop}>
                      <span className={styles.iconBox}>
                        <Icon size={18} aria-hidden="true" />
                      </span>
                    </div>
                    <h3 className={styles.verticalTitle}>{v.title}</h3>
                    <p className={styles.verticalCaption}>{v.caption}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* STORY 2: FOR BUSINESSES */}
      {storyKey === 'businesses' && (
        <section className={styles.sectionBlock} aria-labelledby="timeline-heading">
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>Discover · Connect · Grow</p>
              <h2 id="timeline-heading" className={styles.sectionTitle}>
                Start at ₹0. Scale at Your Own Pace.
              </h2>
            </div>
            <p className={styles.sectionCaption}>
              ₹0 / Free Forever for Business Listings &amp; Any-Radius V Ads.
            </p>
          </div>

          <div className={styles.threeColGrid}>
            {BUSINESS_TIMELINE.map(item => (
              <article key={item.step} className={styles.graphicCard}>
                <div className={styles.uiPreviewHeader}>
                  <div className={styles.previewTopBar}>
                    <span className={styles.eyebrow}>
                      {item.step} · {item.badge}
                    </span>
                    <span className={styles.priceBadge}>{item.price}</span>
                  </div>
                  <div className={styles.mockupChipList}>
                    {item.mockupPills.map(pill => (
                      <span key={pill} className={styles.mockupChip}>
                        {pill}
                      </span>
                    ))}
                  </div>
                </div>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{item.title}</h3>
                  <p className={styles.cardCaption}>{item.caption}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* STORY 3: VISTRAH ADS & MARKETING */}
      {storyKey === 'ads' && (
        <>
          <section className={styles.sectionBlock} aria-labelledby="studio-pillars-heading">
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrow}>Studio &amp; Website Packages</p>
                <h2 id="studio-pillars-heading" className={styles.sectionTitle}>
                  Done-For-You Creative, Web &amp; Growth Studio
                </h2>
              </div>
              <p className={styles.sectionCaption}>
                Fixed build packages · Management fee separated from ad spend.
              </p>
            </div>

            <div className={styles.threeColGrid}>
              {/* Creative & Video Mockup */}
              <article className={styles.graphicCard}>
                <div className={styles.uiPreviewHeader}>
                  <div className={styles.previewTopBar}>
                    <span className={styles.eyebrow}>{ADS_STUDIO_PILLARS[0].tag}</span>
                    <span className={styles.priceBadge}>{ADS_STUDIO_PILLARS[0].price}</span>
                  </div>
                  <div className={styles.reelMockupRow} aria-hidden="true">
                    <div className={styles.reelFrame}>
                      <Play size={16} />
                      <span>9:16 Reel</span>
                    </div>
                    <div className={styles.brandSwatchCard}>
                      <span className={styles.brandAa}>Aa.</span>
                      <div className={styles.swatchRow}>
                        <span className={styles.swatchDot} style={{background: '#0F294A'}} />
                        <span className={styles.swatchDot} style={{background: '#F97316'}} />
                        <span className={styles.swatchDot} style={{background: '#132F54'}} />
                        <span className={styles.swatchDot} style={{background: '#EA580C'}} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{ADS_STUDIO_PILLARS[0].title}</h3>
                  <p className={styles.cardCaption}>{ADS_STUDIO_PILLARS[0].caption}</p>
                  <div className={styles.tierTable}>
                    {ADS_STUDIO_PILLARS[0].tiers.map(t => (
                      <div key={t.label} className={styles.tierRow}>
                        <span>{t.label}</span>
                        <strong>{t.rate}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              {/* Website Creation Mockup */}
              <article className={styles.graphicCard}>
                <div className={styles.uiPreviewHeader}>
                  <div className={styles.previewTopBar}>
                    <span className={styles.eyebrow}>{ADS_STUDIO_PILLARS[1].tag}</span>
                    <span className={styles.priceBadge}>{ADS_STUDIO_PILLARS[1].price}</span>
                  </div>
                  <div className={styles.browserMock} aria-hidden="true">
                    <div className={styles.browserBar}>
                      <span className={styles.browserDot} />
                      <span className={styles.browserDot} />
                      <span className={styles.browserDot} />
                      <span>yourbusiness.in</span>
                    </div>
                    <div className={styles.browserCanvas}>
                      <span style={{fontSize: '0.75rem', fontWeight: 600}}>Mobile-First UI</span>
                      <span className={styles.mockPillSolid}>WhatsApp Lead →</span>
                    </div>
                  </div>
                </div>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{ADS_STUDIO_PILLARS[1].title}</h3>
                  <p className={styles.cardCaption}>{ADS_STUDIO_PILLARS[1].caption}</p>
                  <div className={styles.tierTable}>
                    {ADS_STUDIO_PILLARS[1].tiers.map(t => (
                      <div key={t.label} className={styles.tierRow}>
                        <span>{t.label}</span>
                        <strong>{t.rate}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              {/* Social Media Split-Billing Mockup */}
              <article className={styles.graphicCard}>
                <div className={styles.uiPreviewHeader}>
                  <div className={styles.previewTopBar}>
                    <span className={styles.eyebrow}>{ADS_STUDIO_PILLARS[2].tag}</span>
                    <span className={styles.priceBadge}>{ADS_STUDIO_PILLARS[2].price}</span>
                  </div>
                  <div className={styles.splitBillingBox} aria-hidden="true">
                    <div className={styles.splitCol}>
                      <small>Studio Fee</small>
                      <strong>₹4,999+/mo</strong>
                    </div>
                    <div className={styles.splitCol}>
                      <small>Ad Spend</small>
                      <strong>0% Markup</strong>
                    </div>
                  </div>
                </div>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{ADS_STUDIO_PILLARS[2].title}</h3>
                  <p className={styles.cardCaption}>{ADS_STUDIO_PILLARS[2].caption}</p>
                  <div className={styles.tierTable}>
                    {ADS_STUDIO_PILLARS[2].tiers.map(t => (
                      <div key={t.label} className={styles.tierRow}>
                        <span>{t.label}</span>
                        <strong>{t.rate}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section className={styles.vAdsSpotlight} aria-labelledby="vads-free-heading">
            <div className={styles.vAdsSpotTop}>
              <div>
                <p className={styles.eyebrow}>Local Video Discovery</p>
                <h2 id="vads-free-heading" className={styles.sectionTitle}>
                  ₹0 / Free Forever — Free for Any Radius on VISTRAH
                </h2>
              </div>
              <div className={styles.ctaGroup}>
                <Link href="/seller/v-ads" className={styles.primaryBtn}>
                  <span>Create &amp; Upload Free Ad</span>
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
                <Link href="/pricing" className={styles.secondaryBtn}>
                  <span>View Studio &amp; Tech Pricing</span>
                </Link>
              </div>
            </div>

            <div className={styles.rateGrid}>
              {VADS_RATE_SNAPSHOT.map(row => (
                <div key={row.zone} className={styles.rateCell}>
                  <span className={styles.rateZone}>{row.zone}</span>
                  <strong className={styles.rateFree}>{row.month1}</strong>
                  <span className={styles.rateAfter}>{row.day31}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* STORY 4: AGRICONNECT */}
      {storyKey === 'agri' && (
        <section className={styles.sectionBlock} aria-labelledby="agri-grid-heading">
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>AgriConnect Services</p>
              <h2 id="agri-grid-heading" className={styles.sectionTitle}>
                Seed-to-Market Farming Network
              </h2>
            </div>
            <p className={styles.sectionCaption}>
              Tap any card to browse verified providers in your district.
            </p>
          </div>

          <div className={styles.twoColGrid}>
            {AGRI_CARDS.map(card => {
              const Icon = ICON_MAP[card.icon as keyof typeof ICON_MAP] ?? Sun;
              return (
                <Link
                  key={card.title}
                  href={`/services?category=agriculture-and-farming&subcategory=${encodeURIComponent(
                    card.subcategory,
                  )}`}
                  className={styles.pathwayLinkCard}
                >
                  <div className={styles.previewTopBar}>
                    <span className={styles.iconBox}>
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <span className={styles.priceBadge}>{card.badge}</span>
                  </div>
                  <h3 className={styles.cardTitle}>{card.title}</h3>
                  <p className={styles.cardCaption}>{card.caption}</p>
                  <div className={styles.mockupChipList}>
                    {card.chips.map(chip => (
                      <span key={chip} className={styles.mockupChip}>
                        {chip}
                      </span>
                    ))}
                  </div>
                  <div className={styles.pathwayAction}>
                    <span>Browse {card.title}</span>
                    <ArrowRight size={15} aria-hidden="true" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* STORY 5: HEALTHCONNECT */}
      {storyKey === 'health' && (
        <section className={styles.sectionBlock} aria-labelledby="health-grid-heading">
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>HealthConnect Care</p>
              <h2 id="health-grid-heading" className={styles.sectionTitle}>
                Neighborhood Clinics, Doorstep Labs &amp; Family Wellness
              </h2>
            </div>
            <p className={styles.sectionCaption}>
              For medical emergencies dial 108 immediately.
            </p>
          </div>

          <div className={styles.threeColGrid}>
            {HEALTH_PATHWAYS.map(path => {
              const Icon = ICON_MAP[path.icon as keyof typeof ICON_MAP] ?? Heart;
              return (
                <Link
                  key={path.title}
                  href={`/services?category=health-fitness-and-wellness&subcategory=${encodeURIComponent(
                    path.subcategory,
                  )}`}
                  className={styles.pathwayLinkCard}
                >
                  <div className={styles.previewTopBar}>
                    <span className={styles.iconBox}>
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <span className={styles.priceBadge}>{path.tag}</span>
                  </div>
                  <p className={styles.eyebrow}>{path.badge}</p>
                  <h3 className={styles.cardTitle}>{path.title}</h3>
                  <p className={styles.cardCaption}>{path.caption}</p>
                  <div className={styles.pathwayAction}>
                    <span>Open Pathway</span>
                    <ArrowRight size={15} aria-hidden="true" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Grounded Editorial Footer Lead-In */}
      <section className={styles.bottomCtaBar} aria-label="Next step">
        <div>
          <p className={styles.eyebrow}>Discover. Connect. Grow.</p>
          <h2 className={styles.sectionTitle}>Find verified businesses near you or list your shop for ₹0</h2>
        </div>
        <div className={styles.ctaGroup}>
          <Link href="/seller/onboard" className={styles.primaryBtn}>
            <span>List Your Business Free</span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link href="/services/nearby" className={styles.secondaryBtn}>
            <span>Explore Nearby Services</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
