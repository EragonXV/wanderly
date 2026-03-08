export type TripRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export const canEditItinerary = (role: TripRole) => role === 'OWNER' || role === 'ADMIN';

export const canEditBudget = (role: TripRole) => role === 'OWNER' || role === 'ADMIN';

export const canManageParticipants = (role: TripRole) => role === 'OWNER' || role === 'ADMIN';

export const canManageTripSettings = (role: TripRole) => role === 'OWNER';

export const canManageRoles = (role: TripRole) => role === 'OWNER';

export const canDeleteTrip = (role: TripRole) => role === 'OWNER';
