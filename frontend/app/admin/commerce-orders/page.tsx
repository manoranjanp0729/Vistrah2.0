import {AdminReviewFrame} from '@/components/admin-workspace';
import {AdminCommerceOrders} from '@/components/admin-commerce-workspace';
export const metadata = {title: 'Purchase orders'};
export default function CommerceOrdersPage() {
  return (
    <AdminReviewFrame>
      <AdminCommerceOrders />
    </AdminReviewFrame>
  );
}
