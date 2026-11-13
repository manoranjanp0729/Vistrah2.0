import {VAdsAdvertiser} from '@/components/v-ads';
export const metadata={title:'Advertiser profile'};
export default async function AdvertiserPage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  return <VAdsAdvertiser key={id} id={id}/>;
}
