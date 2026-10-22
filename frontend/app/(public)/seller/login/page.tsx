import {SellerAuth} from '@/components/seller-auth';
export const metadata={title:'Login as seller'};
export default async function SellerLogin({searchParams}:{searchParams:Promise<{next?:string|string[]}>}) {
  const {next}=await searchParams;
  return <SellerAuth nextPath={Array.isArray(next)?next[0]:next}/>;
}
