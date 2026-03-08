import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canTransitionInvitationStatus,
  getEffectiveInvitationStatus,
} from '../src/lib/trips/invitationLifecycle.mjs';

test('allows only valid invitation state transitions from PENDING', () => {
  assert.equal(canTransitionInvitationStatus('PENDING', 'ACCEPTED'), true);
  assert.equal(canTransitionInvitationStatus('PENDING', 'DECLINED'), true);
  assert.equal(canTransitionInvitationStatus('PENDING', 'EXPIRED'), true);
});

test('denies transitions from terminal invitation states', () => {
  assert.equal(canTransitionInvitationStatus('ACCEPTED', 'PENDING'), false);
  assert.equal(canTransitionInvitationStatus('DECLINED', 'ACCEPTED'), false);
  assert.equal(canTransitionInvitationStatus('EXPIRED', 'ACCEPTED'), false);
});

test('marks pending invitation as expired when expiration is in the past', () => {
  const now = new Date('2026-03-08T10:00:00.000Z');
  const expiredAt = new Date('2026-03-08T09:00:00.000Z');

  const effectiveStatus = getEffectiveInvitationStatus('PENDING', expiredAt, now);
  assert.equal(effectiveStatus, 'EXPIRED');
});

test('keeps pending invitation as pending before expiration', () => {
  const now = new Date('2026-03-08T10:00:00.000Z');
  const expiresAt = new Date('2026-03-08T11:00:00.000Z');

  const effectiveStatus = getEffectiveInvitationStatus('PENDING', expiresAt, now);
  assert.equal(effectiveStatus, 'PENDING');
});
