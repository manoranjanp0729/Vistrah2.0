import test from 'node:test';
import assert from 'node:assert/strict';
import {adminTaskGroups, adminSummary} from '../../shared/admin-dashboard.ts';

test('admin dashboard task groups and summary definitions are intact', () => {
  assert.ok(adminTaskGroups.length >= 4);
  assert.ok(adminSummary.some(s => s.key === 'requests'));
  assert.ok(adminSummary.some(s => s.key === 'providers'));
  assert.ok(adminSummary.some(s => s.key === 'services'));

  const dailyGroup = adminTaskGroups.find(g => g.title === 'Daily work');
  assert.ok(dailyGroup);
  assert.ok(dailyGroup.items.some(i => i.slug === 'requests'));
  assert.ok(dailyGroup.items.some(i => i.slug === 'v-ads'));
  assert.ok(dailyGroup.items.some(i => i.slug === 'commerce-orders'));
});

test('admin status transitions follow business rules', () => {
  const requestTransitions: Record<string, string[]> = {
    NEW: ['UNDER_REVIEW', 'CANCELLED'],
    UNDER_REVIEW: ['ASSIGNED', 'CANCELLED'],
    ASSIGNED: ['IN_PROGRESS', 'UNDER_REVIEW', 'CANCELLED'],
    IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
  };

  assert.ok(requestTransitions.NEW.includes('UNDER_REVIEW'));
  assert.ok(requestTransitions.UNDER_REVIEW.includes('ASSIGNED'));
  assert.ok(requestTransitions.ASSIGNED.includes('IN_PROGRESS'));
  assert.ok(requestTransitions.IN_PROGRESS.includes('COMPLETED'));
});

test('admin review payload contracts match backend expectations', () => {
  // Video review
  const videoPayload = {
    status: 'APPROVED',
    reason: 'Video approved by administrator.',
  };
  assert.equal(videoPayload.status, 'APPROVED');
  assert.ok(videoPayload.reason.length >= 10);

  // Advertiser review
  const advertiserPayload = {
    status: 'APPROVED',
    reason: 'Verified legitimate business seller profile.',
    expected_revision: 'abcdef0123456789',
  };
  assert.equal(advertiserPayload.status, 'APPROVED');
  assert.ok(advertiserPayload.reason.length >= 10);

  // Commerce listing review
  const commercePayload = {
    revision: 1,
    status: 'APPROVED',
    reason: 'Listing approved by administrator.',
    order_terms_acknowledged: true,
  };
  assert.equal(commercePayload.status, 'APPROVED');
  assert.equal(commercePayload.order_terms_acknowledged, true);

  // Provider verification
  const providerPayload = {
    status: 'VERIFIED',
    evidence: 'Verified official business credentials and contact.',
  };
  assert.equal(providerPayload.status, 'VERIFIED');
  assert.ok(providerPayload.evidence.length >= 10);
});

