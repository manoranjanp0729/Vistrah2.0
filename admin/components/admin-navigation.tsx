'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {adminTaskGroups} from '../../shared/admin-dashboard';
export const adminGroups=adminTaskGroups.map(group=>({title:group.title,advanced:group.collapsed,items:[...(group.collapsed?[]:[['','Overview']]),...group.items.map(item=>[item.slug,item.label])]}));
export function AdminNavigation({onNavigate}:{onNavigate?:()=>void}){const path=usePathname();return <nav aria-label="Admin navigation">{adminGroups.map(group=>{const items=group.items.map(([slug,label])=>{const href='/admin'+(slug?'/'+slug:'');return <Link key={slug} href={href} onClick={onNavigate} className={path===href?'active':''} aria-current={path===href?'page':undefined}>{label}</Link>;});return group.advanced?<details key={group.title} open={group.items.some(([slug])=>path==='/admin/'+slug)}><summary>{group.title}</summary>{items}</details>:<section key={group.title}><p className="admin-nav-group">{group.title}</p>{items}</section>;})}</nav>;}
