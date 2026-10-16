'use client';
import {useLanguage} from './language-provider';
import {PhotoCard} from './photo-card';
import {PhotoCardRail} from './photo-card-rail';
import {marketplaceCategoryUrl,marketplaceItemId,searchMarketplace,taxonomyCounts} from '../lib/marketplace-taxonomy';
import {marketplacePhoto} from '../lib/marketplace-photos';
import styles from './marketplace.module.css';
export function MarketplaceCategories({query='',compact=false,exclude=[]}:{query?:string;compact?:boolean;exclude?:readonly string[]}) {
  const {label,t}=useLanguage();
  const categories=searchMarketplace(query).filter(category=>!exclude.includes(category.slug));
  return <div className={styles.catalogue}>{!compact&&<p className={styles.inventory}>{taxonomyCounts.categories} categories <span aria-hidden="true">/</span> {taxonomyCounts.subcategories} subcategories <span aria-hidden="true">/</span> {taxonomyCounts.listingTypes} listing types</p>}
    <PhotoCardRail discovery label="Marketplace categories" compact={compact}>{categories.map(category=><PhotoCard key={category.slug} kind="category" slug={category.slug} title={label(marketplaceItemId(category.slug),category.title)} meta={compact?'':`${category.subcategories.length} subcategories`} href={marketplaceCategoryUrl(category.slug)} photo={marketplacePhoto(marketplaceItemId(category.slug))}/>)}</PhotoCardRail>
    {!categories.length&&<p className={styles.empty}>{t('catalogue.empty')}</p>}
  </div>;
}