import {VAdsReels} from '@/components/v-ads';
export const metadata={title:'V Ads'};
export default async function VAdsPage({searchParams}:{searchParams:Promise<{video?:string}>}) {
  const {video}=await searchParams;
  return <VAdsReels key={typeof video==='string'?video:'feed'} initialVideo={typeof video==='string'?video:undefined}/>;
}
