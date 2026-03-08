import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateTripMutationAuthorization,
  canRoleAccessPermission,
} from '../src/lib/trips/apiAuthorizationCore.mjs';

test('denies when user is not authenticated', () => {
  const result = evaluateTripMutationAuthorization({
    userId: null,
    membershipRole: 'OWNER',
    permission: 'EDIT_ITINERARY',
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 401);
});

test('denies when trip membership is missing', () => {
  const result = evaluateTripMutationAuthorization({
    userId: 'user_1',
    membershipRole: null,
    permission: 'EDIT_BUDGET',
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 404);
});

test('denies member for budget mutation', () => {
  const result = evaluateTripMutationAuthorization({
    userId: 'user_1',
    membershipRole: 'MEMBER',
    permission: 'EDIT_BUDGET',
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
});

test('allows admin for itinerary and budget mutations', () => {
  assert.equal(canRoleAccessPermission('ADMIN', 'EDIT_ITINERARY'), true);
  assert.equal(canRoleAccessPermission('ADMIN', 'EDIT_BUDGET'), true);
});

test('denies admin for owner-only permissions', () => {
  assert.equal(canRoleAccessPermission('ADMIN', 'MANAGE_TRIP_SETTINGS'), false);
  assert.equal(canRoleAccessPermission('ADMIN', 'MANAGE_ROLES'), false);
  assert.equal(canRoleAccessPermission('ADMIN', 'DELETE_TRIP'), false);
});

test('allows owner for owner-only permissions', () => {
  const result = evaluateTripMutationAuthorization({
    userId: 'owner_1',
    membershipRole: 'OWNER',
    permission: 'MANAGE_ROLES',
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
});
