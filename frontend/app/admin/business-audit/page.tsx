import { AdminReviewFrame } from '@/components/admin-workspace';
import { BusinessAuditExplorer } from '@/components/business-audit-explorer';

export const metadata = {
  title: 'Data Collection & Business Audit · Vistrah Admin',
};

export default function AdminBusinessAuditExplorerPage() {
  return (
    <AdminReviewFrame>
      <BusinessAuditExplorer />
    </AdminReviewFrame>
  );
}
