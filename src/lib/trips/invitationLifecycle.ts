import { TripInvitationStatus } from '@prisma/client';

export const INVITATION_VALID_TRANSITIONS: Record<TripInvitationStatus, readonly TripInvitationStatus[]> = {
    PENDING: ['ACCEPTED', 'DECLINED', 'EXPIRED'],
    ACCEPTED: [],
    DECLINED: [],
    EXPIRED: [],
};

export function canTransitionInvitationStatus(from: TripInvitationStatus, to: TripInvitationStatus) {
    return INVITATION_VALID_TRANSITIONS[from].includes(to);
}

export function getEffectiveInvitationStatus(
    status: TripInvitationStatus,
    expiresAt: Date,
    now = new Date()
): TripInvitationStatus {
    if (status === 'PENDING' && expiresAt.getTime() <= now.getTime()) {
        return 'EXPIRED';
    }
    return status;
}
