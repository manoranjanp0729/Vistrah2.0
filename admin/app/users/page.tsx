import {AdminReviewFrame} from '@/components/admin-workspace';
import {AdminUsersAuditsConsole} from '@/components/admin-users-console';

export const metadata = {title: 'Users & Audits · VISTRAH Admin'};

export default function UsersRootPage() {
  return (
    <AdminReviewFrame>
      <AdminUsersAuditsConsole />
    </AdminReviewFrame>
  );
}
