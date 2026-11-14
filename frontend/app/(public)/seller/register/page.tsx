import {redirect} from 'next/navigation';
import {websiteLoginDestination} from '@/lib/login-destination';
export const metadata={title:'Create account'};
export default async function SellerRegister({searchParams}:{searchParams:Promise<{next?:string|string[]}>}) {
  const {next}=await searchParams;
  const target=websiteLoginDestination(Array.isArray(next)?next[0]:next,'/seller');
  redirect(`/register?next=${encodeURIComponent(target)}`);
}
