'use client';
import {useLanguage} from './language-provider';
import type {CSSProperties} from 'react';
import {connectSections} from '../../shared/homepage-connect';
import {marketplaceCategories,marketplaceCategoryUrl,marketplaceItemId} from '../lib/marketplace-taxonomy';
import {marketplacePhoto} from '../lib/marketplace-photos';
import {PhotoCard} from './photo-card';
import styles from './homepage-connect.module.css';

export function HomepageConnect(){const {t,label}=useLanguage();return <>{connectSections.map(section=>{
 const category=marketplaceCategories.find(value=>value.slug===section.categorySlug);
 if(!category)return null;
 return <section key={section.key} className={styles.section} aria-labelledby={`connect-${section.key}`} style={{'--connect-background':section.background,'--connect-ink':section.ink} as CSSProperties}><div className="container"><h2 id={`connect-${section.key}`} className={styles.heading}>{section.heading}</h2><PhotoCard kind="category" slug={category.slug} title={label('category/'+category.slug,category.title)} meta="" description={t(section.key==='agri'?'connect.agriCopy':'connect.healthCopy')} href={marketplaceCategoryUrl(category.slug)} photo={marketplacePhoto(marketplaceItemId(category.slug))}/></div></section>;
 })}</>;}
