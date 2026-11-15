'use client';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {useRef,useState,type ReactNode} from 'react';
import {ArrowUpRight,ChevronDown,LogOut} from 'lucide-react';
import {adminPrimaryDestinations,adminTaskGroups} from '../../shared/admin-dashboard';
import {AdminNavigation} from './admin-navigation';
import {useUser} from './customer';
import {Notice} from './ui';
import {api} from '@/lib/api';
import type {User} from '@/lib/types';

const LIVE_SITE_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://vistrah.in';

export function AdminWorkspace({
  user,
  section,
  actions,
  children,
}: {
  user: User;
  section: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const mobileNav = useRef<HTMLDetailsElement>(null);
  const quickToolsRef = useRef<HTMLDetailsElement>(null);

  const primary = adminPrimaryDestinations.find(d => d.slug === section);
  const subItem = adminTaskGroups.flatMap(g => g.items).find(i => i.slug === section);
  const subGroup = adminTaskGroups.find(g => g.items.some(i => i.slug === section));

  const title = primary?.label ?? subItem?.label ?? 'Overview';
  const eyebrow = primary?.eyebrow ?? (subGroup?.title ? subGroup.title.toUpperCase() : 'VISTRAH OPERATIONS');
  const description =
    primary?.description ??
    subItem?.description ??
    'Live platform KPIs, moderation queues, pricing, and editorial publishing.';

  async function logout() {
    setBusy(true);
    setError('');
    try {
      await api('/auth/logout', {method: 'POST'});
      router.push('/login');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-app">
      <aside className="admin-sidebar admin-desktop-navigation">
        <Link href="/admin" className="admin-brand">
          VISTRAH
          <span>EDITORIAL ADMIN</span>
        </Link>
        <AdminNavigation />
        <div className="sidebar-bottom">
          <a
            href={LIVE_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-live-link"
          >
            <span>vistrah.in</span>
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
          <span className="tabular-nums">DPDP 2023 · Sandbox Billing</span>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-breadcrumb">
            <Link href="/admin">Control Center</Link>
            {section && (
              <>
                <span aria-hidden="true">/</span>
                <strong>{title}</strong>
              </>
            )}
          </div>

          <div className="admin-topbar-right">
            <details className="admin-quick-tools" ref={quickToolsRef}>
              <summary>
                <span>All Tools</span>
                <ChevronDown size={14} aria-hidden="true" />
              </summary>
              <div className="admin-quick-tools-panel">
                {adminTaskGroups.map(group => (
                  <div key={group.title} className="admin-quick-tools-col">
                    <p>{group.title}</p>
                    {group.items.map(tool => (
                      <Link
                        key={tool.slug}
                        href={`/admin/${tool.slug}`}
                        onClick={() => {
                          if (quickToolsRef.current) quickToolsRef.current.open = false;
                        }}
                      >
                        {tool.label}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            </details>

            <div className="admin-identity">
              <span>
                {user.name}
                <small>Administrator</small>
              </span>
              <button
                className="icon-button"
                disabled={busy}
                onClick={() => void logout()}
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </header>

        <details className="admin-mobile-navigation" ref={mobileNav}>
          <summary>Navigation</summary>
          <AdminNavigation
            onNavigate={() => {
              if (mobileNav.current) mobileNav.current.open = false;
            }}
          />
        </details>

        <main className="admin-content" id="admin-content">
          <div className="admin-heading">
            <div className="admin-heading-copy">
              <p className="eyebrow">{eyebrow}</p>
              <h1>{title}</h1>
              <p>{description}</p>
            </div>
            <div className="button-row">
              {section === 'homepage' && (
                <>
                  <Link href="/admin/edit-vistrah" className="button secondary">
                    Page Sections (CMS)
                  </Link>
                  <a
                    href={LIVE_SITE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button secondary"
                  >
                    Open Live Site
                    <ArrowUpRight size={15} />
                  </a>
                </>
              )}
              {section === 'pricing' && (
                <a
                  href={`${LIVE_SITE_URL}/pricing`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button secondary"
                >
                  Open Live /pricing
                  <ArrowUpRight size={15} />
                </a>
              )}
              {actions}
            </div>
          </div>

          {error && <Notice error message={error} />}
          <div className="admin-tool">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function AdminShellSkeleton({message = 'Verifying administrator session…'}: {message?: string}) {
  return (
    <div className="admin-app">
      <aside className="admin-sidebar admin-desktop-navigation">
        <Link href="/admin" className="admin-brand">
          VISTRAH
          <span>EDITORIAL ADMIN</span>
        </Link>
        <AdminNavigation />
        <div className="sidebar-bottom">
          <a
            href={LIVE_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-live-link"
          >
            <span>vistrah.in</span>
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
          <span className="tabular-nums">DPDP 2023 · Sandbox Billing</span>
        </div>
      </aside>
      <div className="admin-main">
        <details className="admin-mobile-navigation">
          <summary>Navigation</summary>
          <AdminNavigation />
        </details>
        <main className="admin-content" role="status">
          <p className="editorial-loading-note">{message}</p>
        </main>
      </div>
    </div>
  );
}

export function AdminReviewFrame({
  actions,
  children,
}: {
  actions?: ReactNode;
  children: ReactNode;
}) {
  const path = usePathname() || '/admin';
  const {user, loading, error} = useUser();
  if (loading) {
    return <AdminShellSkeleton />;
  }
  if (error) {
    return (
      <main className="admin-loading">
        <Notice error message={error} />
      </main>
    );
  }
  if (!user) {
    return (
      <main className="admin-loading">
        <p>Administrator sign-in required.</p>
        <Link href={'/login?next=' + encodeURIComponent(path)}>Sign in</Link>
      </main>
    );
  }
  if (user.role !== 'ADMIN') {
    return (
      <main className="admin-loading">
        <h1>Administrator access required</h1>
        <p>This account cannot access administration.</p>
      </main>
    );
  }
  return (
    <AdminWorkspace user={user} section={path.split('/')[2] ?? ''} actions={actions}>
      {children}
    </AdminWorkspace>
  );
}
