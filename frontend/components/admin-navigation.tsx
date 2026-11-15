'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Activity,Globe,IndianRupee,LayoutDashboard,ShieldCheck} from 'lucide-react';
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
  moderation: ShieldCheck,
  pricing: IndianRupee,
  homepage: Globe,
  audit: Activity,
} as const;

export function resolvePrimaryDestination(pathname: string) {
  const seg = pathname === '/admin' ? '' : (pathname.split('/')[2] ?? '');
  return (
    adminPrimaryDestinations.find(dest => dest.matches.includes(seg)) ??
    adminPrimaryDestinations[0]
  );
}

export function AdminNavigation({onNavigate}:{onNavigate?:()=>void}) {
  const path = usePathname() || '/admin';
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
