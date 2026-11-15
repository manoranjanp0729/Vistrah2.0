import {AdminReviewFrame} from '@/components/admin-workspace';
import {PricingEditor} from '@/components/pricing-editor';

export const metadata = {
  title: 'Pricing Editor — VISTRAH Ads & Marketing',
};

export default function AdminPricingEditorPage() {
  return (
    <AdminReviewFrame>
      <PricingEditor />
    </AdminReviewFrame>
  );
}
