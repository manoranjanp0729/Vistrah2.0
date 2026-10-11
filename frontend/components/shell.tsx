'use client';
import {officialContact,emailHref} from '@/lib/contact';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useState,useEffect,useRef} from 'react';
import {House,Grid2X2,FileText,UserRound,MapPin,X,Mail} from 'lucide-react';
import {api} from '@/lib/api';
import type {Category} from '@/lib/types';
import {urls} from '@/lib/urls';
import {positioning} from '@/lib/positioning';
import copy from '@/lib/interface-copy.json';
import {LocationChooser,useCustomerLocation} from './customer-location';
export function Brand({light=false}:{light?:boolean}) {return <Link href="/" aria-label="VISTRAH home" className={`brand${light?' brand-light':''}`}>VISTRAH</Link>;}
const destinations=[{label:copy.nav.discover,href:'/',Icon:House},{label:copy.nav.services,href:'/services',Icon:Grid2X2},{label:copy.nav.requests,href:'/account/requests',Icon:FileText},{label:copy.nav.account,href:'/account',Icon:UserRound}];
export function Header(){
 const path=usePathname();const [open,setOpen]=useState(false);const {active}=useCustomerLocation();const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const element=dialog.current;if(open)element?.showModal();return()=>element?.close();},[open]);
 const selected=(href:string)=>href==='/'?path==='/':href==='/account'?path.startsWith('/account')&&!path.startsWith('/account/requests'):path.startsWith(href);
 const links=destinations.map(({label,href,Icon})=><Link key={href} href={href} aria-current={selected(href)?'page':undefined} className={selected(href)?'active':''}><Icon size={19}/><span>{label}</span></Link>);
 return <><a className="skip-link" href="#main-content">Skip to content</a><header className="public-header"><div className="container header-inner"><Brand/><nav className="desktop-nav replica-navigation" aria-label="Main navigation">{links}</nav><button type="button" className="replica-location-trigger" onClick={()=>setOpen(true)}><MapPin size={16}/><span>{active?active.locality:copy.nav.location}</span></button></div></header><nav className="replica-bottom-nav" aria-label="Main navigation">{links}</nav>{open&&<dialog ref={dialog} aria-label="Choose location" className="replica-location-dialog" onCancel={()=>setOpen(false)}><button type="button" className="icon-button" aria-label="Close location" onClick={()=>setOpen(false)}><X/></button><h2>Find services near you</h2><LocationChooser expanded/></dialog>}</>;
}
export function Footer() {const [categories,setCategories]=useState<Category[]>([]);useEffect(()=>{api<Category[]>('/catalogue').then(setCategories).catch(()=>{});},[]);return <footer className="footer"><div className="container footer-grid"><div><Brand/><p>{positioning.description}</p><a className="footer-email" href={emailHref(officialContact.email)!}><Mail size={16}/>{officialContact.email}</a></div><div><h3>Discover</h3><Link href="/services">All services</Link><Link href="/jobs">Public vacancies</Link><Link href="/membership">Membership</Link><Link href="/call-vistrah">Contact VISTRAH</Link></div><div><h3>Your VISTRAH</h3><Link href="/account">My account</Link><Link href="/account/requests">My requests</Link><Link href="/account/membership">My membership</Link><Link href="/register">Sign up as user</Link><Link href="/login">Login as user</Link><Link href="/seller/register">Sign up as seller</Link><Link href="/seller/login">Login as seller</Link></div><div><h3>Explore categories</h3>{categories.slice(0,3).map(category=><Link key={category.id} href={urls.category(category)}>{category.title}</Link>)}</div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} VISTRAH. All rights reserved.</span><span>{positioning.motto}</span></div></footer>;}

