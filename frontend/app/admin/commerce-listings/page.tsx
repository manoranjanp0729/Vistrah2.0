import {AdminReviewFrame} from '@/components/admin-workspace';
import {AdminCommerceReview} from '@/components/admin-commerce-review';
export const metadata = {title: 'Product & package approvals'};
export default function CommerceListingsPage() {
  return (
    <AdminReviewFrame>
      <AdminCommerceReview />
    </AdminReviewFrame>
  );
}
