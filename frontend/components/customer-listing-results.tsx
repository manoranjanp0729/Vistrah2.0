'use client';
import {UiText,UiNav} from "./localized-ui";
import Link from 'next/link';
import {useState} from 'react';
import {ApiError} from '@/lib/api';
import {useCommerceResource} from '@/lib/use-commerce-resource';
import {ButtonLink} from './ui';
import {marketplaceUrl} from '../../shared/marketplace';
import {customerListingCopy as copy} from '../../shared/customer-listing';
import type {ServiceSelection} from '../../shared/service-listing';
import {listingPrice,type CommerceListing,type ListingPage} from '../../shared/commerce';
import styles from './marketplace.module.css';

export function ClassifiedServices({selection}:{selection:ServiceSelection}){
  const [page,setPage]=useState(1);
  const result=useCommerceResource<ListingPage<CommerceListing>>('/commerce/classified-services?'+new URLSearchParams({...selection,page:String(page)}));
  const returnTo=marketplaceUrl(selection),related=marketplaceUrl({category:selection.category,subcategory:selection.subcategory});
  const status=result.error instanceof ApiError?result.error.status:null;
  return <section id="available-options" className={styles.options} aria-labelledby="available-options-title">
    <div className={styles.sectionTitle}><h2 id="available-options-title"><UiText value={copy.heading}/></h2><button className="button secondary" disabled={result.loading} onClick={result.retry}><UiText value={"Refresh"}/></button></div>
    <p><UiText value={copy.guidance}/></p>
    {result.loading?<p role="status"><UiText value={"Finding available options..."}/></p>:result.error?<div className={styles.customerPanel}>
      <h3><UiText value={status===401?'Sign in to view service offers':status===403?'Membership is required to view these offers':'We could not load the options'}/></h3>
      <p><UiText value={status===401?'Sign in to your customer account, then continue with this service.':status===403?'Review membership access before deciding how to continue.':'Please try again. You can also explore related options or email VISTRAH below.'}/></p>
      {status===401?<ButtonLink href={'/login?next='+encodeURIComponent(returnTo)}><UiText value={"Sign in and continue"}/></ButtonLink>:status===403?<ButtonLink href={'/membership?next='+encodeURIComponent(returnTo)}><UiText value={"View membership"}/></ButtonLink>:<button className="button" onClick={result.retry}><UiText value={"Try again"}/></button>}
      <Link href={related}><UiText value={"Explore related options"}/></Link>
    </div>:result.data?<>
      {result.data.items.length?<><p className={styles.hint}>{result.data.total} <UiText value={result.data.total===1?'offer':'offers'}/> <UiText value={"to explore"}/></p><div className={styles.offerGrid}>{result.data.items.map(row=><article key={row.id} className={styles.customerPanel}>
        <span className={styles.eyebrow}><UiText value={"Reviewed offer"}/></span><h3>{row.title}</h3><p><UiText value={"Offered by "}/>{row.business}</p>
        <strong className={styles.offerPrice}>{listingPrice(row.unit_price_paise)} <small><UiText value={"per package"}/></small></strong><p className={styles.offerDescription}>{row.description}</p>
        <ButtonLink href={'/commerce/'+row.id}><UiText value={"View service & next steps"}/></ButtonLink>
      </article>)}</div></>:<div className={styles.customerPanel}><h3><UiText value={result.data.total===0?copy.emptyTitle:'No options on this page'}/></h3><p><UiText value={result.data.total===0?copy.emptyCopy:'Go back a page to see the remaining offers.'}/></p><ButtonLink secondary href={related}><UiText value={"Explore related options"}/></ButtonLink></div>}
      {(page>1||result.data.total>result.data.page_size)&&<UiNav  className={styles.customerActions} aria-label="Service offer pages"><button className="button secondary" disabled={page===1} onClick={()=>setPage(value=>value-1)}><UiText value={"Previous"}/></button><span><UiText value={"Page "}/>{page}</span><button className="button secondary" disabled={page*result.data.page_size>=result.data.total} onClick={()=>setPage(value=>value+1)}><UiText value={"Next"}/></button></UiNav>}
    </>:null}
  </section>;
}
