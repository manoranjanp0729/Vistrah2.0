import {AuthForm} from '@/components/customer';
export const metadata={title:'Sign in'};
export default async function Login({searchParams}:{searchParams:Promise<{next?:string|string[]}>}) {
  const {next}=await searchParams;
  return <AuthForm nextPath={Array.isArray(next)?next[0]:next}/>;
}
