'use client';
import {UiText,UiElement} from "./localized-ui";
import {useLanguage} from './language-provider';
import {PhotoCard} from './photo-card';
import {PhotoCardRail} from './photo-card-rail';
import {marketplaceCategoryUrl,marketplaceItemId,searchMarketplace,taxonomyCounts} from '../lib/marketplace-taxonomy';
import {marketplacePhoto} from '../lib/marketplace-photos';
import styles from './marketplace.module.css';
export function MarketplaceCategories({query='',compact=false,exclude=[]}:{query?:string;compact?:boolean;exclude?:readonly string[]}) {
  const {label,t}=useLanguage();
  const categories=searchMarketplace(query).filter(category=>!exclude.includes(category.slug));
  return <div className={styles.catalogue}>{!compact&&<p className={styles.inventory}>{taxonomyCounts.categories} <UiText value={"categories "}/><span aria-hidden="true">/</span> {taxonomyCounts.subcategories} <UiText value={"subcategories "}/><span aria-hidden="true">/</span> {taxonomyCounts.listingTypes} <UiText value={"listing types"}/></p>}
    <UiElement as={PhotoCardRail} discovery label="Marketplace categories" compact={compact}>{categories.map(category=><PhotoCard key={category.slug} kind="category" slug={category.slug} title={label(marketplaceItemId(category.slug),category.title)} meta={compact?'':`${category.subcategories.length} subcategories`} href={marketplaceCategoryUrl(category.slug)} photo={marketplacePhoto(marketplaceItemId(category.slug))}/>)}</UiElement>
    {!categories.length&&<p className={styles.empty}>{t('catalogue.empty')}</p>}
  </div>;
}