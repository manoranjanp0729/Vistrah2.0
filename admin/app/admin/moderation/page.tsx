import {AdminReviewFrame} from '@/components/admin-workspace';
import {AdminModerationHub} from '@/components/admin-moderation-hub';

export const metadata = {title: 'V Ads & Sellers · Vistrah Admin'};

export default function AdminModerationPage() {
  return (
    <AdminReviewFrame>
      <AdminModerationHub />
    </AdminReviewFrame>
  );
}
