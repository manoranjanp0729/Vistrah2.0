import {AdminReviewFrame} from '@/components/admin-workspace';
import {AdminBusinessesConsole} from '@/components/admin-businesses-console';

export const metadata = {title: 'Businesses · VISTRAH Admin'};

export default function ListingsAliasPage() {
  return (
    <AdminReviewFrame>
      <AdminBusinessesConsole />
    </AdminReviewFrame>
  );
}
