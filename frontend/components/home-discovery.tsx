'use client';
import {UiText,UiSection} from "./localized-ui";
import {useState} from 'react';
import type {ServiceContext} from '@/lib/types';
import {ServiceAccessState} from './service-access';
import {NearbyProviders} from './nearby-providers';

export function HomeNearby({services,accessStatus}:{services:ServiceContext[];accessStatus:number}){
  const [serviceId,setServiceId]=useState('');
  const context=services.find(item=>String(item.service.id)===serviceId);
  return <UiSection  className="container section home-nearby" aria-label="Services Near You"><p className="eyebrow"><UiText value={"LOCATION-BASED DISCOVERY"}/></p><h2><UiText value={"Services Near You"}/></h2><p><UiText value={"Choose a location and service to find eligible providers that cover your area. Distances are straight-line, not travel distances."}/></p>{accessStatus?(accessStatus===401||accessStatus===403?<ServiceAccessState status={accessStatus} next="/" embedded/>:<p role="status"><UiText value={"Nearby provider access is unavailable. Please try again later."}/></p>):services.length?<><label htmlFor="nearby-service"><UiText value={"Choose a service"}/></label><select id="nearby-service" value={serviceId} onChange={event=>setServiceId(event.target.value)}><option value=""><UiText value={"Select a service"}/></option>{services.map(item=><option key={item.service.id} value={item.service.id}>{item.category.title} — {item.service.title}</option>)}</select>{context?<NearbyProviders key={context.service.id} context={context} carousel/>:<p><UiText value={"No nearby search yet. Select a service; confirm your location using Choose your location."}/></p>}</>:<p><UiText value={"No catalogue services are available for nearby search."}/></p>}</UiSection>;
}

export function AffiliateBrands(){return <UiSection  className="container section" aria-label="Affiliate brands"><p className="eyebrow"><UiText value={"AFFILIATE BRANDS"}/></p><h2><UiText value={"Affiliate brands"}/></h2><p><UiText value={"No affiliate brands or links are configured. There are no affiliate offers to display."}/></p></UiSection>;}
