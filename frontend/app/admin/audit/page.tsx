import {AdminReviewFrame} from '@/components/admin-workspace';
import {AdminAuditHealth} from '@/components/admin-audit-health';

export const metadata = {title: 'Audit & Health · Vistrah Admin'};

export default function AdminAuditPage() {
  return (
    <AdminReviewFrame>
      <AdminAuditHealth />
    </AdminReviewFrame>
  );
}
