'use client';
import {UiText,UiElement,UiNav} from "./localized-ui";
import {officialContact,emailHref} from '@/lib/contact';
import Link from 'next/link';
import Image from 'next/image';
import brandStyles from './brand.module.css';
import {usePathname} from 'next/navigation';
import {House,Grid2X2,Layers,UserRound,Mail,PlayCircle} from 'lucide-react';
import {marketplaceCategories,marketplaceUrl,marketplaceItemId} from '@/lib/marketplace-taxonomy';
import {positioning} from '@/lib/positioning';
import {useLanguage} from './language-provider';
import {SellerEntry} from './seller-auth';
import {SettingsPopup} from './settings-popup';
export function Brand({light=false}:{light?:boolean}) {
  const {t}=useLanguage();
  const path=usePathname();
  const handleClick=(e:React.MouseEvent)=>{
    if(path==='/'){
      e.preventDefault();
      window.scrollTo({top:0,behavior:'smooth'});
    }
  };
  return <UiElement as={Link} href="/" onClick={handleClick} aria-label={t('navigation.home')} className={`brand${light?' brand-light':''}`}>
    <Image src="/brand/lockup-dark.svg" alt="VISTRAH" width={210} height={52} className={light?brandStyles.alwaysLight:brandStyles.dark} unoptimized priority/>
    <Image src="/brand/lockup-light.svg" alt="VISTRAH" width={210} height={52} className={light?brandStyles.hidden:brandStyles.light} unoptimized priority/>
  </UiElement>;
}
const destinations=[{key:'nav.discover',href:'/',Icon:House},{key:'nav.services',href:'/services',Icon:Grid2X2},{key:'navigation.vAds',href:'/v-ads',Icon:PlayCircle},{key:'V Essentials',href:'/v-essentials',Icon:Layers},{key:'nav.account',href:'/account',Icon:UserRound}];
export function Header(){
 const {t}=useLanguage();
 const path=usePathname();
 const selected=(href:string)=>href==='/'?path==='/':href==='/account'?path.startsWith('/account')&&!path.startsWith('/account/requests'):path.startsWith(href);
 const links=destinations.map(({key,href,Icon})=><Link key={href} href={href} aria-current={selected(href)?'page':undefined} className={selected(href)?'active':''}><Icon size={19}/><span>{key.includes('.')?t(key):key}</span></Link>);
 return <><a className="skip-link" href="#main-content">{t('navigation.skip')}</a><header className="public-header"><div className="container header-inner"><Brand/><UiNav  className="desktop-nav replica-navigation" aria-label={t('navigation.main')}>{links}</UiNav><SettingsPopup/></div></header><UiNav  className="replica-bottom-nav" style={{gridTemplateColumns:"repeat(5,minmax(0,1fr))"}} aria-label={t('navigation.main')}>{links}</UiNav></>;
}
export function Footer() {const {t,label}=useLanguage();return <footer className="footer"><div className="container footer-grid"><div><Brand/><p>{positioning.description}</p><a className="footer-email" href={emailHref(officialContact.email)!}><Mail size={16}/>{officialContact.email}</a></div><div><h3>{t('nav.discover')}</h3><Link href="/services">{t('footer.services')}</Link><Link href="/jobs">{t('jobs.title')}</Link><Link href="/membership">{t('account.membership')}</Link><Link href="/call-vistrah">{t('footer.contact')}</Link></div><div><h3>{t('account.title')}</h3><SellerEntry secondary footer/><Link href="/account">{t('footer.account')}</Link><Link href="/account/requests">{t('footer.requests')}</Link><Link href="/account/membership">{t('footer.myMembership')}</Link><Link href="/register">{t('footer.signup')}</Link><Link href="/login">{t('footer.login')}</Link></div><div><h3>{t('navigation.categories')}</h3>{marketplaceCategories.slice(0,3).map(category=><Link key={category.slug} href={marketplaceUrl({category:category.slug})}>{label(marketplaceItemId(category.slug),category.title)}</Link>)}</div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} <UiText value={"VISTRAH. "}/>{t('navigation.rights')}</span><span>{positioning.motto}</span></div></footer>;}


