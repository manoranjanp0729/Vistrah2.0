import {AdminReviewFrame} from '@/components/admin-workspace';
import {AdminOverviewConsole} from '@/components/admin-overview';

export const metadata = {title: 'Overview · VISTRAH Admin'};

export default function HomePage() {
  return (
    <AdminReviewFrame>
      <AdminOverviewConsole />
    </AdminReviewFrame>
  );
}
