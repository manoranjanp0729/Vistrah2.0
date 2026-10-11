'use client';
import {useState} from 'react';
import type {ServiceContext} from '@/lib/types';
import {ServiceAccessState} from './service-access';
import {NearbyProviders} from './nearby-providers';

export function HomeNearby({services,accessStatus}:{services:ServiceContext[];accessStatus:number}){
  const [serviceId,setServiceId]=useState('');
  const context=services.find(item=>String(item.service.id)===serviceId);
  return <section className="container section home-nearby" aria-label="Services Near You"><p className="eyebrow">LOCATION-BASED DISCOVERY</p><h2>Services Near You</h2><p>Choose a location and service to find eligible providers that cover your area. Distances are straight-line, not travel distances.</p>{accessStatus?(accessStatus===401||accessStatus===403?<ServiceAccessState status={accessStatus} next="/" embedded/>:<p role="status">Nearby provider access is unavailable. Please try again later.</p>):services.length?<><label htmlFor="nearby-service">Choose a service</label><select id="nearby-service" value={serviceId} onChange={event=>setServiceId(event.target.value)}><option value="">Select a service</option>{services.map(item=><option key={item.service.id} value={item.service.id}>{item.category.title} — {item.service.title}</option>)}</select>{context?<NearbyProviders key={context.service.id} context={context} carousel/>:<p>No nearby search yet. Select a service; confirm your location using Choose your location.</p>}</>:<p>No catalogue services are available for nearby search.</p>}</section>;
}

export function AffiliateBrands(){return <section className="container section" aria-label="Affiliate brands"><p className="eyebrow">AFFILIATE BRANDS</p><h2>Affiliate brands</h2><p>No affiliate brands or links are configured. There are no affiliate offers to display.</p></section>;}
