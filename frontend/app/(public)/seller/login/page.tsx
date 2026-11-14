import {redirect} from 'next/navigation';
import {websiteLoginDestination} from '@/lib/login-destination';
export const metadata={title:'Sign in'};
export default async function SellerLogin({searchParams}:{searchParams:Promise<{next?:string|string[]}>}) {
  const {next}=await searchParams;
  const target=websiteLoginDestination(Array.isArray(next)?next[0]:next,'/seller');
  redirect(`/login?next=${encodeURIComponent(target)}`);
}
