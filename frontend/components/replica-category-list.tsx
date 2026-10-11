'use client';
import {useState} from 'react';
import Link from 'next/link';
import type {Category} from '@/lib/types';
import {allServices,urls} from '@/lib/urls';
import copy from '@/lib/interface-copy.json';
export function ReplicaCategoryList({category}:{category:Category}){const [query,setQuery]=useState('');const needle=query.trim().toLocaleLowerCase();const rows=allServices([category]).filter(item=>[item.service.title,item.service.description,item.category.title,item.subcategory?.title??''].join(' ').toLocaleLowerCase().includes(needle));return <div className="container page replica-page"><h1>{copy.catalogue.serviceTitle}</h1><label className="replica-category-search">{copy.catalogue.serviceSearch}<input placeholder={copy.catalogue.servicePlaceholder} value={query} onChange={event=>setQuery(event.target.value)}/></label><Link className="button secondary" href="/services">{copy.catalogue.all}</Link><p>{copy.catalogue.serviceIntro}</p><div className="service-grid">{rows.map(context=><Link className="panel replica-service-card" href={urls.service(context.category,context.service,context.subcategory)} key={context.service.id}><span className="small-label">{category.title}</span><h2>{context.service.title}</h2><p>{context.service.description}</p><span className="text-link">{copy.catalogue.explore}</span></Link>)}</div>{!rows.length&&<p>{copy.catalogue.noServices}</p>}</div>;}
