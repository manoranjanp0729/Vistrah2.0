import {VAdsReels} from '@/components/v-ads';

export const metadata = {title: 'V Ads'};

export default async function VAdsPage({
  searchParams,
}: {
  searchParams: Promise<{video?: string; category?: string; service_type?: string}>;
}) {
  const {video, category, service_type} = await searchParams;
  const cleanVideo = typeof video === 'string' ? video : undefined;
  const cleanCat = typeof category === 'string' ? category : undefined;
  const cleanSvc = typeof service_type === 'string' ? service_type : undefined;
  return (
    <VAdsReels
      key={`${cleanVideo ?? 'feed'}:${cleanCat ?? ''}:${cleanSvc ?? ''}`}
      initialVideo={cleanVideo}
      initialCategory={cleanCat}
      initialServiceType={cleanSvc}
    />
  );
}
