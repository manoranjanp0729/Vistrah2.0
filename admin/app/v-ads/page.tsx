import {AdminReviewFrame} from '@/components/admin-workspace';
import {AdminVAdsConsole} from '@/components/admin-v-ads-console';

export const metadata = {title: 'V Ads · VISTRAH Admin'};

export default function VAdsRootPage() {
  return (
    <AdminReviewFrame>
      <AdminVAdsConsole />
    </AdminReviewFrame>
  );
}
