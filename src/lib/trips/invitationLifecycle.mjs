export const INVITATION_VALID_TRANSITIONS = {
  PENDING: ['ACCEPTED', 'DECLINED', 'EXPIRED'],
  ACCEPTED: [],
  DECLINED: [],
  EXPIRED: [],
};

export function canTransitionInvitationStatus(from, to) {
  return INVITATION_VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getEffectiveInvitationStatus(status, expiresAt, now = new Date()) {
  if (status === 'PENDING' && expiresAt.getTime() <= now.getTime()) {
    return 'EXPIRED';
  }
  return status;
}
