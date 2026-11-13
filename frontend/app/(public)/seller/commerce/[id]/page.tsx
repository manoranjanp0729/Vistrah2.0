import {notFound} from 'next/navigation';
import {SellerDashboard} from '@/components/seller';
export const metadata={title:'Your services & products'};
export default async function SellerListingsPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  if(!/^[1-9]\d*$/.test(id)||!Number.isSafeInteger(Number(id)))notFound();
  return <SellerDashboard businessId={Number(id)} listingsOnly/>;
}
