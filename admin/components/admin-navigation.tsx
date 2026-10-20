'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
export const adminGroups=[
 {title:'Daily work',items:[['','Overview'],['requests','Enquiries & estimates']]},
 {title:'Providers & approvals',items:[['provider-applications','Provider applications'],['providers','Businesses & providers'],['ownership-claims','Ownership claims'],['publication-drafts','Publication reviews'],['v-ads','V Ads management'],['employer-jobs','Employer job approvals'],['commerce-listings','Product & package approvals'],['vistrah-services','VISTRAH service packages'],['commerce-orders','Purchase orders'],['provider-services','Service approvals']]},
 {title:'Services & membership',items:[['homepage','Homepage editor'],['catalogue','Service catalogue'],['memberships','Memberships & benefits'],['offers','Member offers'],['payments','Payments']]},
 {title:'Advanced tools',advanced:true,items:[['provider-requirements','Application requirements'],['audit','Activity log'],['job-sources','Job sources'],['workflows','Workflow operations']]},
];
export function AdminNavigation({onNavigate}:{onNavigate?:()=>void}){const path=usePathname();return <nav aria-label="Admin navigation">{adminGroups.map(group=>{const items=group.items.map(([slug,label])=>{const href='/admin'+(slug?'/'+slug:'');return <Link key={slug} href={href} onClick={onNavigate} className={path===href?'active':''} aria-current={path===href?'page':undefined}>{label}</Link>;});return group.advanced?<details key={group.title} open={group.items.some(([slug])=>path==='/admin/'+slug)}><summary>{group.title}</summary>{items}</details>:<section key={group.title}><p className="admin-nav-group">{group.title}</p>{items}</section>;})}</nav>;}
export function AdminReviewFrame({children}:{children:React.ReactNode}){return <div className="admin-review-frame"><aside><Link href="/admin" className="admin-brand">VISTRAH<span>ADMIN</span></Link><AdminNavigation/></aside><main>{children}</main></div>;}

