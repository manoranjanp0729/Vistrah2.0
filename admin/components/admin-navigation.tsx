'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Building2,LayoutDashboard,Users,Video} from 'lucide-react';
import {adminPrimaryDestinations,adminTaskGroups} from '../../shared/admin-dashboard';

export const adminGroups = adminTaskGroups.map(group => ({
  title: group.title,
  advanced: group.collapsed,
  items: [
    ...(group.collapsed ? [] : [['', 'Overview']]),
    ...group.items.map(item => [item.slug, item.label]),
  ],
}));

const navIcons = {
  '': LayoutDashboard,
  businesses: Building2,
  'v-ads': Video,
  users: Users,
} as const;

export function resolvePrimaryDestination(pathname: string) {
  const clean = (pathname || '/').split('?')[0] || '/';
  const seg =
    clean === '/' || clean === '/admin'
      ? ''
      : clean.startsWith('/admin/')
        ? (clean.split('/')[2] ?? '')
        : (clean.split('/')[1] ?? '');
  return (
    adminPrimaryDestinations.find(dest => dest.matches.includes(seg)) ??
    adminPrimaryDestinations[0]
  );
}

export function AdminNavigation({onNavigate}:{onNavigate?:()=>void}) {
  const path = usePathname() || '/';
  const activeDest = resolvePrimaryDestination(path);

  return (
    <nav aria-label="Admin navigation" className="admin-rail">
      {adminPrimaryDestinations.map(dest => {
        const Icon = navIcons[dest.slug as keyof typeof navIcons] ?? LayoutDashboard;
        const isActive = activeDest.slug === dest.slug;
        return (
          <Link
            key={dest.href}
            href={dest.href}
            onClick={onNavigate}
            className={isActive ? 'admin-rail-link active' : 'admin-rail-link'}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon size={17} aria-hidden="true" />
            <span>{dest.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
