import {AdminReviewFrame} from '@/components/admin-workspace';
import {AdminUsersAuditsConsole} from '@/components/admin-users-console';

export const metadata = {title: 'Users & Audits · VISTRAH Admin'};

export default function AdminUsersPage() {
  return (
    <AdminReviewFrame>
      <AdminUsersAuditsConsole />
    </AdminReviewFrame>
  );
}
