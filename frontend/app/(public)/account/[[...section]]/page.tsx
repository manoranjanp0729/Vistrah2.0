import {notFound} from 'next/navigation';
import {Account} from '@/components/customer';
export const metadata={title:'My account'};
export default async function AccountPage({params}:{params:Promise<{section?:string[]}>}){const {section=[]}=await params;if((section.length>1&&!(section[0]==='finds'&&section.length===2&&/^[0-9a-f-]{36}$/.test(section[1])))||!['','profile','membership','orders','requests','payments','finds','provider-applications'].includes(section[0]||''))notFound();return <Account section={section[0]||''} workflowId={section[1]}/>;}
