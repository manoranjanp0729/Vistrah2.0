'use client';
import {UiText,UiElement,UiSection,UiNav,UiInput} from "./localized-ui";
import {useLanguage} from './language-provider';
import Link from 'next/link';
import {customerListingCopy,listingEnquiryHref} from '../../shared/customer-listing';
import type {ReactNode} from 'react';
import {useUser} from './customer';
import {ClassifiedServices} from './commerce';
import {addServiceUrl,serviceSelection} from '../../shared/service-listing';
import type {MarketplaceSelection} from '../../shared/marketplace';
import {ArrowLeft,Search} from 'lucide-react';
import {MarketplaceCategories} from './marketplace-categories';
import {marketplaceUrl,marketplaceItemId,searchMarketplaceEntries,type resolveMarketplaceSelection} from '../lib/marketplace-taxonomy';
import {marketplacePhoto} from '../lib/marketplace-photos';
import {PhotoCard} from './photo-card';
import {PhotoCardRail} from './photo-card-rail';
import styles from './marketplace.module.css';

type Resolved=NonNullable<ReturnType<typeof resolveMarketplaceSelection>>;
export function MarketplaceBrowser({selection,query=''}:{selection:Resolved;query?:string}) {
  const {category,subcategory,listingType}=selection;
  const {user}=useUser(true,'seller');const seller=Boolean(user?.seller_enabled);
  const {t,label}=useLanguage();
  const categoryName=category?label(marketplaceItemId(category.slug),category.title):'';
  const subcategoryName=subcategory?label(marketplaceItemId(category!.slug,subcategory.slug),subcategory.title):'';
  const typeName=listingType?label(marketplaceItemId(category!.slug,subcategory!.slug,listingType.slug),listingType.title):'';
  const results=searchMarketplaceEntries(query);
  const back=subcategory?marketplaceUrl({category:category!.slug}):'/services';
  return <UiSection  className={styles.browser} aria-label={t('discovery.explore')}>
    <UiNav  aria-label={t('discovery.breadcrumb')} className={styles.breadcrumb}><ol>
      <li><Link href="/">{t('common.home')}</Link></li>
      <li>{category?<Link href="/services">{t('discovery.categories')}</Link>:<span aria-current="page">{t('discovery.categories')}</span>}</li>
      {category&&<li>{subcategory?<Link href={marketplaceUrl({category:category.slug})}>{categoryName}</Link>:<span aria-current="page">{categoryName}</span>}</li>}
      {subcategory&&<li>{listingType?<Link href={marketplaceUrl({category:category!.slug,subcategory:subcategory.slug})}>{subcategoryName}</Link>:<span aria-current="page">{subcategoryName}</span>}</li>}
      {listingType&&<li><span aria-current="page">{typeName}</span></li>}
    </ol></UiNav>
    <div className={styles.discoveryHeading}><p className={styles.eyebrow}>{t('discovery.marketplace')}</p>
      <h1>{typeName||subcategoryName||categoryName||t('discovery.title')}</h1>
      <p><UiText value={listingType?customerListingCopy.intro:subcategory?t('discovery.subcategoryIntro'):category?t('discovery.categoryIntro'):t('discovery.intro')}/></p>
    </div>
    {!listingType&&<p><Link className="button secondary" href="/commerce"><UiText value={"Browse published products & service packages"}/></Link></p>}
    {(!listingType||Boolean(query.trim()))&&<form action="/services" className={styles.search} role="search">
      <label htmlFor="marketplace-search" className="sr-only">{t('discovery.searchLabel')}</label>
      <Search size={19} aria-hidden="true"/><UiInput  id="marketplace-search" name="q" defaultValue={query} placeholder={t('discovery.searchPlaceholder')} type="search"/>
      <button type="submit">{t('common.search')}</button>
    </form>}
    {query.trim()?<div className={styles.resultSection}><div className={styles.sectionTitle}><h2>{t('discovery.results')}</h2><Link href="/services">{t('discovery.clearSearch')}</Link></div>
      <p className={styles.hint}>{t('discovery.matchCount',{count:results.length,query:query.trim()})}</p>
      <UiElement as={PhotoCardRail} discovery cardActions={seller} label={t('discovery.resultsLabel')}>{results.map(result=><TypeAction key={result.id} seller={seller} selection={result.selection} title={result.title}><PhotoCard kind="result" slug={result.id} title={label(result.id,result.title)} meta={result.level} href={result.href} photo={marketplacePhoto(result.id)}/></TypeAction>)}</UiElement>
      {!results.length&&<p className={styles.empty}>{t('discovery.noMatchesWeb')}</p>}
    </div>:listingType?<div className={styles.classificationNotice}>
      <div className={styles.customerIntro}><p className={styles.eyebrow}><UiText value={"Find your next step"}/></p><h2><UiText value={"Find an option that suits you"}/></h2><ol className={styles.customerSteps}>{customerListingCopy.steps.map(step=><li key={step}>{step}</li>)}</ol><a className="button" href="#available-options">{customerListingCopy.action}</a></div>
      <ClassifiedServices key={category!.slug+'/'+subcategory!.slug+'/'+listingType.slug} selection={{category:category!.slug,subcategory:subcategory!.slug,type:listingType.slug}}/>
      <section className={styles.customerPanel}><h2>{customerListingCopy.helpTitle}</h2><p>{customerListingCopy.helpCopy}</p><a className="button secondary" href={listingEnquiryHref(typeName,categoryName+' / '+subcategoryName)}>{customerListingCopy.helpAction}</a></section>
      {seller&&<aside className={styles.sellerAside}><p><UiText value={"Do you offer "}/>{typeName}?</p><UiElement as={Link} className="button secondary" aria-label={'Add service: '+typeName} href={addServiceUrl({category:category!.slug,subcategory:subcategory!.slug,type:listingType.slug})}><UiText value={"+ Add your service"}/></UiElement></aside>}
      <Link href={marketplaceUrl({category:category!.slug,subcategory:subcategory!.slug})}><ArrowLeft size={18} aria-hidden="true"/>{t('discovery.backTo',{name:subcategoryName})}</Link>
    </div>:subcategory?<div><div className={styles.sectionTitle}><h2>{t('discovery.types')}</h2><span>{t('discovery.options',{count:subcategory.listing_types.length})}</span></div>
      <UiElement as={PhotoCardRail} discovery cardActions={seller} label={t('discovery.types')}>{subcategory.listing_types.map(type=><TypeAction key={type.slug} seller={seller} selection={{category:category!.slug,subcategory:subcategory!.slug,type:type.slug}} title={type.title}><PhotoCard kind="type" slug={type.slug} title={label(marketplaceItemId(category!.slug,subcategory!.slug,type.slug),type.title)} meta={t('discovery.type')} href={marketplaceUrl({category:category!.slug,subcategory:subcategory.slug,type:type.slug})} photo={marketplacePhoto(marketplaceItemId(category!.slug,subcategory.slug,type.slug))}/></TypeAction>)}</UiElement>
      <Link href={back} className={styles.backLink}><ArrowLeft size={18} aria-hidden="true"/>{t('discovery.allSubcategories',{name:categoryName})}</Link>
    </div>:category?<div><div className={styles.sectionTitle}><h2>{t('discovery.exploreSubcategories')}</h2><span>{t('discovery.options',{count:category.subcategories.length})}</span></div>
      <UiElement as={PhotoCardRail} discovery label={t('discovery.subcategories')}>{category.subcategories.map(sub=><PhotoCard key={sub.slug} kind="subcategory" slug={sub.slug} title={label(marketplaceItemId(category!.slug,sub.slug),sub.title)} meta={t('discovery.typeCount',{count:sub.listing_types.length})} href={marketplaceUrl({category:category.slug,subcategory:sub.slug})} photo={marketplacePhoto(marketplaceItemId(category.slug,sub.slug))}/>)}</UiElement>
      <Link href="/services" className={styles.backLink}><ArrowLeft size={18} aria-hidden="true"/>{t('catalogue.all')}</Link>
    </div>:<MarketplaceCategories/>}
  </UiSection>;
}

function TypeAction({seller,selection,title,children}:{seller:boolean;selection:MarketplaceSelection;title:string;children:ReactNode}){const selected=serviceSelection(selection);return <div className={`${styles.typeCard} ${seller&&selected?styles.withAction:''}`}>{children}{seller&&selected&&<UiElement as={Link} className={styles.addService} href={addServiceUrl(selected)} aria-label={'Add service: '+title}>+</UiElement>}</div>;}
