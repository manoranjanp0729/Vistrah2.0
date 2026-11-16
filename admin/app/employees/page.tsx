import {AdminReviewFrame} from '@/components/admin-workspace';
import {EmployeesWorkspace} from '@/components/employees-workspace';

export const metadata = {
  title: 'Employees & HR Letters · Vistrah Admin',
};

export default function EmployeesPage() {
  return (
    <AdminReviewFrame>
      <EmployeesWorkspace />
    </AdminReviewFrame>
  );
}
