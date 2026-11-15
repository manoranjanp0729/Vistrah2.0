'use client';
import {AdminReviewFrame} from '@/components/admin-workspace';
import {AdminEditVistrah} from '@/components/admin-edit-vistrah';

export default function EditVistrahPage() {
  return <AdminReviewFrame>{user => <AdminEditVistrah actorId={user.id} />}</AdminReviewFrame>;
}
