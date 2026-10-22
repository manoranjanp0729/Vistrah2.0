'use client';
import {UiText,UiSection} from "./localized-ui";
import Link from 'next/link';
import {useCommerceResource} from '@/lib/use-commerce-resource';
import type {ListingPage,SellerListing} from '../../shared/commerce';
import {listingProgress} from '../../shared/seller-journey';
export function SellerRecentListings({businessId}:{businessId:number}){
  const result=useCommerceResource<ListingPage<SellerListing>>('/seller/businesses/'+businessId+'/commerce-listings?page=1');
  return <UiSection  aria-label="Recent listing status">{result.loading?<p role="status"><UiText value={"Loading recent listings..."}/></p>:result.error?<><p role="alert"><UiText value={"Could not load listing status."}/></p><button className="button secondary" onClick={result.retry}><UiText value={"Try again"}/></button></>:result.data?.items.length?<><p className="small-label"><UiText value={"Recent listings"}/></p>{result.data.items.slice(0,3).map(row=><div key={row.id} className="seller-listing-summary"><Link href={'/seller/commerce/'+businessId+'?focus='+row.id}>{row.title}</Link><span><UiText value={listingProgress(row).label}/></span></div>)}</>:<p><UiText value={"No listings yet. Choose a Listing Type using Add service."}/></p>}</UiSection>;
}
