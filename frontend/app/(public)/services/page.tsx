import {notFound} from 'next/navigation';
import {MarketplaceBrowser} from '@/components/marketplace-browser';
import {SellerEntry} from '@/components/seller-auth';
import {resolveMarketplaceSelection,type MarketplaceSelection} from '@/lib/marketplace-taxonomy';
import styles from '@/components/marketplace.module.css';

export const dynamic='force-dynamic';
export const metadata={title:'Service categories'};
export default async function Services({searchParams}:{searchParams:Promise<MarketplaceSelection>}) {
  const params=await searchParams;
  const {q=''}=params;
  const selection=resolveMarketplaceSelection(params);
  if(!selection)notFound();
  return <div className={`container ${styles.servicesPage}`}>
    {!selection.listingType&&<div className={styles.sellerEntry}><SellerEntry/></div>}
    <MarketplaceBrowser selection={selection} query={q}/>
  </div>;
}
