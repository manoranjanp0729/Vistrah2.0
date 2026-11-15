import {AdminReviewFrame} from '@/components/admin-workspace';
import {VistrahServices} from '@/components/admin-commerce-workspace';
export const metadata = {title: 'VISTRAH service packages'};
export default function VistrahServicesPage() {
  return (
    <AdminReviewFrame>
      <VistrahServices />
    </AdminReviewFrame>
  );
}
