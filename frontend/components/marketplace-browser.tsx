'use client';
import {useLanguage} from './language-provider';
import Link from 'next/link';
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
  const {t,label}=useLanguage();
  const categoryName=category?label(marketplaceItemId(category.slug),category.title):'';
  const subcategoryName=subcategory?label(marketplaceItemId(category!.slug,subcategory.slug),subcategory.title):'';
  const typeName=listingType?label(marketplaceItemId(category!.slug,subcategory!.slug,listingType.slug),listingType.title):'';
  const results=searchMarketplaceEntries(query);
  const back=subcategory?marketplaceUrl({category:category!.slug}):'/services';
  return <section className={styles.browser} aria-label={t('discovery.explore')}>
    <nav aria-label={t('discovery.breadcrumb')} className={styles.breadcrumb}><ol>
      <li><Link href="/">{t('common.home')}</Link></li>
      <li>{category?<Link href="/services">{t('discovery.categories')}</Link>:<span aria-current="page">{t('discovery.categories')}</span>}</li>
      {category&&<li>{subcategory?<Link href={marketplaceUrl({category:category.slug})}>{categoryName}</Link>:<span aria-current="page">{categoryName}</span>}</li>}
      {subcategory&&<li>{listingType?<Link href={marketplaceUrl({category:category!.slug,subcategory:subcategory.slug})}>{subcategoryName}</Link>:<span aria-current="page">{subcategoryName}</span>}</li>}
      {listingType&&<li><span aria-current="page">{typeName}</span></li>}
    </ol></nav>
    <div className={styles.discoveryHeading}><p className={styles.eyebrow}>{t('discovery.marketplace')}</p>
      <h1>{typeName||subcategoryName||categoryName||t('discovery.title')}</h1>
      <p>{listingType?t('discovery.typeIntro'):subcategory?t('discovery.subcategoryIntro'):category?t('discovery.categoryIntro'):t('discovery.intro')}</p>
    </div>
    <form action="/services" className={styles.search} role="search">
      <label htmlFor="marketplace-search" className="sr-only">{t('discovery.searchLabel')}</label>
      <Search size={19} aria-hidden="true"/><input id="marketplace-search" name="q" defaultValue={query} placeholder={t('discovery.searchPlaceholder')} type="search"/>
      <button type="submit">{t('common.search')}</button>
    </form>
    {query.trim()?<div className={styles.resultSection}><div className={styles.sectionTitle}><h2>{t('discovery.results')}</h2><Link href="/services">{t('discovery.clearSearch')}</Link></div>
      <p className={styles.hint}>{t('discovery.matchCount',{count:results.length,query:query.trim()})}</p>
      <PhotoCardRail discovery label={t('discovery.resultsLabel')}>{results.map(result=><PhotoCard key={result.id} kind="result" slug={result.id} title={label(result.id,result.title)} meta={result.level} href={result.href} photo={marketplacePhoto(result.id)}/>)}</PhotoCardRail>
      {!results.length&&<p className={styles.empty}>{t('discovery.noMatchesWeb')}</p>}
    </div>:listingType?<div className={styles.classificationNotice}>
      <PhotoCard kind="type" slug={listingType.slug} title={typeName} meta={t('discovery.type')} href={marketplaceUrl({category:category!.slug,subcategory:subcategory!.slug,type:listingType.slug})} photo={marketplacePhoto(marketplaceItemId(category!.slug,subcategory!.slug,listingType.slug))}/>
      <span className={styles.eyebrow}>{t('discovery.type')}</span><h2>{t('discovery.possibilities')}</h2><p>{t('discovery.unavailableType')}</p>
      <Link href={marketplaceUrl({category:category!.slug,subcategory:subcategory!.slug})}><ArrowLeft size={18} aria-hidden="true"/>{t('discovery.backTo',{name:subcategoryName})}</Link>
    </div>:subcategory?<div><div className={styles.sectionTitle}><h2>{t('discovery.types')}</h2><span>{t('discovery.options',{count:subcategory.listing_types.length})}</span></div>
      <PhotoCardRail discovery label={t('discovery.types')}>{subcategory.listing_types.map(type=><PhotoCard key={type.slug} kind="type" slug={type.slug} title={label(marketplaceItemId(category!.slug,subcategory!.slug,type.slug),type.title)} meta={t('discovery.type')} href={marketplaceUrl({category:category!.slug,subcategory:subcategory.slug,type:type.slug})} photo={marketplacePhoto(marketplaceItemId(category!.slug,subcategory.slug,type.slug))}/>)}</PhotoCardRail>
      <Link href={back} className={styles.backLink}><ArrowLeft size={18} aria-hidden="true"/>{t('discovery.allSubcategories',{name:categoryName})}</Link>
    </div>:category?<div><div className={styles.sectionTitle}><h2>{t('discovery.exploreSubcategories')}</h2><span>{t('discovery.options',{count:category.subcategories.length})}</span></div>
      <PhotoCardRail discovery label={t('discovery.subcategories')}>{category.subcategories.map(sub=><PhotoCard key={sub.slug} kind="subcategory" slug={sub.slug} title={label(marketplaceItemId(category!.slug,sub.slug),sub.title)} meta={t('discovery.typeCount',{count:sub.listing_types.length})} href={marketplaceUrl({category:category.slug,subcategory:sub.slug})} photo={marketplacePhoto(marketplaceItemId(category.slug,sub.slug))}/>)}</PhotoCardRail>
      <Link href="/services" className={styles.backLink}><ArrowLeft size={18} aria-hidden="true"/>{t('catalogue.all')}</Link>
    </div>:<MarketplaceCategories/>}
  </section>;
}
