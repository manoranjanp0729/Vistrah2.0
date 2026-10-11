import Link from 'next/link';
import {Visual} from '@/components/visual';
import {categoryPhoto} from '@/lib/imagery';
import {serverApi} from '@/lib/server';
import {allServices,urls} from '@/lib/urls';
import copy from '@/lib/interface-copy.json';
import type {Category} from '@/lib/types';
export const dynamic='force-dynamic';
export const metadata={title:'Service categories'};
export default async function Services({searchParams}:{searchParams:Promise<{q?:string}>}){const {q=''}=await searchParams;const categories=await serverApi<Category[]>('/catalogue');const needle=q.trim().toLocaleLowerCase();const matches=new Set(allServices(categories).filter(item=>[item.service.title,item.service.description,item.category.title,item.subcategory?.title??''].join(' ').toLocaleLowerCase().includes(needle)).map(item=>item.category.id));const rows=categories.filter(category=>!needle||matches.has(category.id)||[category.title,category.description].join(' ').toLocaleLowerCase().includes(needle));return <div className="container page replica-page"><h1>{copy.catalogue.title}</h1><form className="form replica-search" action="/services"><label>{copy.catalogue.search}<input name="q" defaultValue={q} placeholder={copy.catalogue.placeholder}/></label><button className="button" type="submit">Search</button></form><p>{copy.catalogue.intro}</p>{rows.length?<div className="reference-categories">{rows.map(category=><Link href={urls.category(category)} key={category.id} className="reference-category"><Visual photo={categoryPhoto(category)} variant="card" decorative/><h3>{category.title}</h3><p>{category.description}</p></Link>)}</div>:<p>{copy.catalogue.empty}</p>}</div>;}
