import {notFound} from 'next/navigation';
import {AdminApp} from '@/components/admin';
export const metadata={title:'Admin dashboard'};
export default async function AdminPage({params}:{params:Promise<{section?:string[]}>}) {const {section=[]}=await params;if(section.length>1||!['','requests','providers','provider-services','catalogue','offers','payments','audit','workflows','job-sources','provider-applications','provider-requirements'].includes(section[0]||''))notFound();return <AdminApp section={section[0]||''}/>;}
