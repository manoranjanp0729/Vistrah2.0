import {officialContact} from './public-contact';
export const customerListingCopy={
  intro:'Explore available offers, review the service details and price, then choose your next step.',
  action:'See available options',
  steps:['Compare the available offers','Review what is included, the price and terms','Open an offer to see how to proceed'],
  heading:'Available options',
  guidance:'Choose an offer to see the full details and next steps. Availability may require confirmation.',
  emptyTitle:'No offers to choose from yet',
  emptyCopy:'There are no approved offers on this page right now. Explore related options, or email VISTRAH about what you need.',
  helpTitle:'Need help finding the right option?',
  helpCopy:'Tell VISTRAH what you need, your preferred location and timing. Your email app will open; nothing is sent automatically.',
  helpAction:'Email VISTRAH about this service',
} as const;
export function listingEnquiryHref(title:string,context:string){
  return `mailto:${officialContact.email}?`+new URLSearchParams({subject:`Service enquiry: ${title}`,body:`Hello VISTRAH,\n\nI am looking for: ${title}\nCategory: ${context}\n\nWhat I need:\nPreferred location (optional):\nPreferred timing (optional):\n\nPlease help me understand the available options.`}).toString().replace(/\+/g,'%20');
}
