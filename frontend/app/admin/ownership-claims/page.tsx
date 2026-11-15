'use client';
import {AdminReviewFrame} from '@/components/admin-workspace';
import {AdminOwnershipClaimQueue} from '@/components/ownership-claims';

export default function OwnershipClaimsPage() {
  return (
    <AdminReviewFrame>
      {user => <AdminOwnershipClaimQueue currentUserId={user.id} />}
    </AdminReviewFrame>
  );
}
