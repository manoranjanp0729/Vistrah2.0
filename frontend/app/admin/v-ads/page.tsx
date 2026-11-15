'use client';
import {AdminReviewFrame} from '@/components/admin-workspace';
import {AdminVAds} from '@/components/admin-v-ads';

export default function AdminVAdsPage() {
  return <AdminReviewFrame>{user => <AdminVAds actorId={user.id} />}</AdminReviewFrame>;
}
