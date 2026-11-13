import type {SellerListing} from './commerce';
export const serviceJourneySteps=['Save draft','Submit for review','Admin review','Live'] as const;
export function businessProgress(business:{verification_status:string;active:boolean}){
  if(business.verification_status==='VERIFIED')return business.active?'Verified business':'Business inactive';
  if(business.verification_status==='REJECTED')return 'Verification declined';
  if(business.verification_status==='INACTIVE')return 'Business inactive';
  return 'Verification pending';
}
export function listingProgress(row:Pick<SellerListing,'status'|'available'>&{business_active?:boolean;business_verification_status?:string}){
  switch(row.status){
    case 'DRAFT':return {label:'Draft',hint:'Review your details, then submit for admin review.'};
    case 'SUBMITTED':return {label:'In review',hint:'Waiting for an independent admin decision. Not public yet.'};
    case 'REJECTED':return {label:'Needs changes',hint:'Read the review note, edit your draft and submit again.'};
    case 'ARCHIVED':return {label:'Archived',hint:'Hidden from customers.'};
    case 'APPROVED':return row.available&&row.business_active===true&&row.business_verification_status==='VERIFIED'
      ?{label:'Live',hint:'Approved and available to customers with the required access.'}
      :{label:'Approved - hidden',hint:'Publication also requires availability and an active, verified business.'};
  }
}
