'use client';
import {officialContact,emailHref} from '@/lib/contact';
import Link from 'next/link';
import Image from 'next/image';
import brandStyles from './brand.module.css';
import {usePathname} from 'next/navigation';
import {useState,useEffect,useRef} from 'react';
import {House,Grid2X2,FileText,UserRound,MapPin,X,Mail} from 'lucide-react';
import {api} from '@/lib/api';
import type {Category} from '@/lib/types';
import {urls} from '@/lib/urls';
import {positioning} from '@/lib/positioning';
import {useLanguage} from './language-provider';
import {LocationChooser,useCustomerLocation} from './customer-location';
export function Brand({light=false}:{light?:boolean}) {const {t}=useLanguage();return <Link href="/" aria-label={t('navigation.home')} className={`brand${light?' brand-light':''}`}><Image src="/brand/lockup-dark.svg" alt="" width={176} height={44} className={light?brandStyles.alwaysLight:brandStyles.dark} unoptimized/><Image src="/brand/lockup-light.svg" alt="" width={176} height={44} className={light?brandStyles.hidden:brandStyles.light} unoptimized/></Link>;}
const destinations=[{key:'nav.discover',href:'/',Icon:House},{key:'nav.services',href:'/services',Icon:Grid2X2},{key:'nav.requests',href:'/account/requests',Icon:FileText},{key:'nav.account',href:'/account',Icon:UserRound}];
export function Header(){
 const {copy,t}=useLanguage();
 const path=usePathname();const [open,setOpen]=useState(false);const {active}=useCustomerLocation();const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const element=dialog.current;if(open)element?.showModal();return()=>element?.close();},[open]);
 const selected=(href:string)=>href==='/'?path==='/':href==='/account'?path.startsWith('/account')&&!path.startsWith('/account/requests'):path.startsWith(href);
 const links=destinations.map(({key,href,Icon})=><Link key={href} href={href} aria-current={selected(href)?'page':undefined} className={selected(href)?'active':''}><Icon size={19}/><span>{t(key)}</span></Link>);
 return <><a className="skip-link" href="#main-content">{t('navigation.skip')}</a><header className="public-header"><div className="container header-inner"><Brand/><nav className="desktop-nav replica-navigation" aria-label={t('navigation.main')}>{links}</nav><button type="button" className="replica-location-trigger" onClick={()=>setOpen(true)}><MapPin size={16}/><span>{active?active.locality:copy.nav.location}</span></button></div></header><nav className="replica-bottom-nav" aria-label={t('navigation.main')}>{links}</nav>{open&&<dialog ref={dialog} aria-label={copy.nav.location} className="replica-location-dialog" onCancel={()=>setOpen(false)}><button type="button" className="icon-button" aria-label={t('navigation.closeLocation')} onClick={()=>setOpen(false)}><X/></button><h2>{t('navigation.nearby')}</h2><LocationChooser expanded/></dialog>}</>;
}
export function Footer() {const {t,label}=useLanguage();const [categories,setCategories]=useState<Category[]>([]);useEffect(()=>{api<Category[]>('/catalogue').then(setCategories).catch(()=>{});},[]);return <footer className="footer"><div className="container footer-grid"><div><Brand/><p>{positioning.description}</p><a className="footer-email" href={emailHref(officialContact.email)!}><Mail size={16}/>{officialContact.email}</a></div><div><h3>{t('nav.discover')}</h3><Link href="/services">{t('footer.services')}</Link><Link href="/jobs">{t('jobs.title')}</Link><Link href="/membership">{t('account.membership')}</Link><Link href="/call-vistrah">{t('footer.contact')}</Link></div><div><h3>{t('account.title')}</h3><Link href="/account">{t('footer.account')}</Link><Link href="/account/requests">{t('footer.requests')}</Link><Link href="/account/membership">{t('footer.myMembership')}</Link><Link href="/register">{t('footer.signup')}</Link><Link href="/login">{t('footer.login')}</Link><Link href="/seller/register">{t('footer.sellerSignup')}</Link><Link href="/seller/login">{t('footer.sellerLogin')}</Link></div><div><h3>{t('navigation.categories')}</h3>{categories.slice(0,3).map(category=><Link key={category.id} href={urls.category(category)}>{label('category/'+category.slug,category.title)}</Link>)}</div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} VISTRAH. {t('navigation.rights')}</span><span>{positioning.motto}</span></div></footer>;}


