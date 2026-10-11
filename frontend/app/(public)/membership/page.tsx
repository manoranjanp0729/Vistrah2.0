import {ReplicaMembership} from '@/components/replica-pages';
export default async function MembershipPage({searchParams}:{searchParams:Promise<{next?:string}>}){const query=await searchParams;return <ReplicaMembership nextPath={query.next}/>;}
