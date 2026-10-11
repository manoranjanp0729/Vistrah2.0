import {Checkout} from '@/components/customer';
export const metadata={title:'Sandbox checkout'};
export default async function SandboxCheckout({searchParams}:{searchParams:Promise<{next?:string|string[]}>}){const {next}=await searchParams;return <Checkout nextPath={Array.isArray(next)?next[0]:next}/>;}
