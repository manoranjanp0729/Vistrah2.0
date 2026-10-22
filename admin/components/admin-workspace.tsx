'use client';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {useRef,useState,type ReactNode} from 'react';
import {LogOut} from 'lucide-react';
import {adminTaskGroups} from '../../shared/admin-dashboard';
import {AdminNavigation} from './admin-navigation';
import {useUser} from './customer';
import {Notice} from './ui';
import {api} from '@/lib/api';
import type {User} from '@/lib/types';

export function AdminWorkspace({user,section,actions,children}:{user:User;section:string;actions?:ReactNode;children:ReactNode}){
  const router=useRouter();
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  const mobileNav=useRef<HTMLDetailsElement>(null);
  const item=adminTaskGroups.flatMap(group=>group.items).find(item=>item.slug===section);
  const group=adminTaskGroups.find(group=>group.items.some(item=>item.slug===section));
  const title=item?.label??'Overview';
  async function logout(){setBusy(true);setError('');try{await api('/auth/logout',{method:'POST'});router.push('/login');router.refresh();}catch(error){setError((error as Error).message);}finally{setBusy(false);}}
  return <div className="admin-app">
    <aside className="admin-sidebar admin-desktop-navigation"><Link href="/admin" className="admin-brand">VISTRAH<span>ADMIN WORKSPACE</span></Link><AdminNavigation/><div className="sidebar-bottom">Sandbox payments enabled</div></aside>
    <div className="admin-main">
      <header className="admin-topbar"><div><Link href="/admin">Dashboard</Link>{section&&<><span aria-hidden="true">/</span><strong>{title}</strong></>}</div><div className="admin-identity"><span>{user.name}<small>Administrator</small></span><button className="icon-button" disabled={busy} onClick={()=>void logout()} aria-label="Sign out"><LogOut size={18}/></button></div></header>
      <details className="admin-mobile-navigation" ref={mobileNav}><summary>Admin menu</summary><AdminNavigation onNavigate={()=>{if(mobileNav.current)mobileNav.current.open=false;}}/></details>
      <main className="admin-content" id="admin-content">
        {section&&<Link className="admin-back-link" href="/admin">← Dashboard</Link>}
        <div className="admin-heading"><div className="admin-heading-copy"><p className="eyebrow">{group?.title??'VISTRAH OPERATIONS'}</p><h1>{title}</h1><p>{item?.description??'Start with enquiries, orders and video reviews. Open other tools when you need them.'}</p></div>{actions&&<div className="button-row">{actions}</div>}</div>
        {error&&<Notice error message={error}/>}
        <div className="admin-tool">{children}</div>
      </main>
    </div>
  </div>;
}

export function AdminReviewFrame({children}:{children:ReactNode}){
  const path=usePathname();
  const {user,loading,error}=useUser();
  if(loading)return <main className="admin-loading" role="status">Loading administrator access…</main>;
  if(error)return <main className="admin-loading"><Notice error message={error}/></main>;
  if(!user)return <main className="admin-loading"><p>Administrator sign-in required.</p><Link href={'/login?next='+encodeURIComponent(path)}>Sign in</Link></main>;
  if(user.role!=='ADMIN')return <main className="admin-loading"><h1>Administrator access required</h1><p>This account cannot access administration.</p></main>;
  return <AdminWorkspace user={user} section={path.split('/')[2]??''}>{children}</AdminWorkspace>;
}
