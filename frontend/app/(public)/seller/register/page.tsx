import {AuthForm} from '@/components/customer';
export const metadata={title:'Sign up as seller'};
export default async function SellerRegister({searchParams}:{searchParams:Promise<{next?:string|string[]}>}) {
  const {next}=await searchParams;
  return <AuthForm seller register nextPath={Array.isArray(next)?next[0]:next}/>;
}
