import {AuthForm} from '@/components/customer';
export const metadata={title:'Create an account'};
export default async function Register({searchParams}:{searchParams:Promise<{next?:string|string[]}>}) {
  const {next}=await searchParams;
  return <AuthForm register nextPath={Array.isArray(next)?next[0]:next}/>;
}
