import {ReplicaAccount,ReplicaRequests,ReplicaProfile,ReplicaPayments} from '@/components/replica-pages';
import {notFound,redirect} from 'next/navigation';
import {Account} from '@/components/customer';
export const metadata={title:'My account'};
export default async function AccountPage({params}:{params:Promise<{section?:string[]}>}){const {section=[]}=await params;if((section.length>1&&!(section[0]==='finds'&&section.length===2&&/^[0-9a-f-]{36}$/.test(section[1])))||!['','profile','membership','orders','requests','payments','finds','provider-applications'].includes(section[0]||''))notFound();if(section[0]==='membership')redirect('/membership');if(!section.length)return <ReplicaAccount/>;if(section[0]==='requests')return <ReplicaRequests/>;if(section[0]==='profile')return <ReplicaProfile/>;if(section[0]==='payments'||section[0]==='orders')return <ReplicaPayments/>;return <Account section={section[0]||''} workflowId={section[1]}/>;}

