import {AdminOwnershipClaimQueue} from '@/components/ownership-claims';
import {AuthGate} from '@/components/customer';
export const metadata = {title: 'Ownership claims'};
export default function OwnershipClaimsPage() {
  return (
    <AuthGate next="/admin/ownership-claims">
      {user => <AdminOwnershipClaimQueue currentUserId={user.id} />}
    </AuthGate>
  );
}
