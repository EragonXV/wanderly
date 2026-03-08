const ROLE_ORDER = ['OWNER', 'ADMIN', 'MEMBER'];

const PERMISSION_RULES = {
  EDIT_ITINERARY: ['OWNER', 'ADMIN'],
  EDIT_BUDGET: ['OWNER', 'ADMIN'],
  MANAGE_PARTICIPANTS: ['OWNER', 'ADMIN'],
  MANAGE_TRIP_SETTINGS: ['OWNER'],
  MANAGE_ROLES: ['OWNER'],
  DELETE_TRIP: ['OWNER'],
};

export const AUTH_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized',
  TRIP_NOT_FOUND: 'Trip not found',
  FORBIDDEN: 'Forbidden',
};

export function isValidRole(role) {
  return ROLE_ORDER.includes(role);
}

export function canRoleAccessPermission(role, permission) {
  if (!isValidRole(role)) {
    return false;
  }
  const allowedRoles = PERMISSION_RULES[permission];
  if (!allowedRoles) {
    return false;
  }
  return allowedRoles.includes(role);
}

export function evaluateTripMutationAuthorization(input) {
  const { userId, membershipRole, permission } = input;

  if (!userId) {
    return { ok: false, status: 401, message: AUTH_MESSAGES.UNAUTHORIZED };
  }

  if (!membershipRole) {
    return { ok: false, status: 404, message: AUTH_MESSAGES.TRIP_NOT_FOUND };
  }

  if (!canRoleAccessPermission(membershipRole, permission)) {
    return { ok: false, status: 403, message: AUTH_MESSAGES.FORBIDDEN };
  }

  return { ok: true, status: 200, message: null };
}
