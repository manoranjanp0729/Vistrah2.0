'use client';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {useRef,useState,type ReactNode} from 'react';
import {ArrowUpRight,LogOut} from 'lucide-react';
import {adminPrimaryDestinations,adminTaskGroups} from '../../shared/admin-dashboard';
import {AdminNavigation,resolvePrimaryDestination} from './admin-navigation';
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
  const pathname = usePathname();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const mobileNav = useRef<HTMLDetailsElement>(null);

  const exactPrimary = adminPrimaryDestinations.find(
    d => d.slug === section || d.matches[0] === section,
  );
  const matchedPrimary = resolvePrimaryDestination(pathname || (section ? `/${section}` : '/'));
  const subItem = exactPrimary
    ? undefined
    : adminTaskGroups.flatMap(g => g.items).find(i => i.slug === section);

  const title = exactPrimary?.label ?? subItem?.label ?? matchedPrimary.label;
  const eyebrow = exactPrimary?.eyebrow ?? matchedPrimary.eyebrow;
  const description =
    exactPrimary?.description ?? subItem?.description ?? matchedPrimary.description;

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
        <Link href="/" className="admin-brand">
          VISTRAH
          <span>Operations Console</span>
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
          <span className="tabular-nums">Discover. Connect. Grow.</span>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-breadcrumb">
            <Link href="/">Overview</Link>
            {section && title !== 'Overview' && (
              <>
                <span aria-hidden="true">/</span>
                <strong>{title}</strong>
              </>
            )}
          </div>

          <div className="admin-topbar-right">
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
            {actions && <div className="button-row">{actions}</div>}
          </div>

          {error && <Notice error message={error} />}
          <div className="admin-tool">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function AdminShellSkeleton({
  message = 'Verifying administrator session…',
}: {
  message?: string;
}) {
  return (
    <div className="admin-app">
      <aside className="admin-sidebar admin-desktop-navigation">
        <Link href="/" className="admin-brand">
          VISTRAH
          <span>Operations Console</span>
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
          <span className="tabular-nums">Discover. Connect. Grow.</span>
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
  const path = usePathname() || '/';
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
  const clean = path.split('?')[0] || '/';
  const section =
    clean === '/' || clean === '/admin'
      ? ''
      : clean.startsWith('/admin/')
        ? (clean.split('/')[2] ?? '')
        : (clean.split('/')[1] ?? '');
  return (
    <AdminWorkspace user={user} section={section} actions={actions}>
      {children}
    </AdminWorkspace>
  );
}
