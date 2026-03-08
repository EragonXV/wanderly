import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma/client';
import {
    AUTH_MESSAGES,
    evaluateTripMutationAuthorization,
} from '@/lib/trips/apiAuthorizationCore.mjs';
import type { TripRole } from '@/lib/trips/permissions';

export type TripMutationPermission =
    | 'EDIT_ITINERARY'
    | 'EDIT_BUDGET'
    | 'MANAGE_PARTICIPANTS'
    | 'MANAGE_TRIP_SETTINGS'
    | 'MANAGE_ROLES'
    | 'DELETE_TRIP';

type AuthorizationSuccess = {
    ok: true;
    userId: string;
    membership: {
        userId: string;
        role: TripRole;
    };
};

type AuthorizationFailure = {
    ok: false;
    response: NextResponse;
};

export type TripMutationAuthorizationResult = AuthorizationSuccess | AuthorizationFailure;

export async function authorizeSignedInMutation() {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
        return {
            ok: false as const,
            response: NextResponse.json({ message: AUTH_MESSAGES.UNAUTHORIZED }, { status: 401 }),
        };
    }

    return {
        ok: true as const,
        userId,
    };
}

export async function authorizeTripMutation(
    tripId: string,
    permission: TripMutationPermission
): Promise<TripMutationAuthorizationResult> {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;

    if (!userId) {
        return {
            ok: false,
            response: NextResponse.json({ message: AUTH_MESSAGES.UNAUTHORIZED }, { status: 401 }),
        };
    }

    const membership = await prisma.tripMember.findUnique({
        where: {
            tripId_userId: {
                tripId,
                userId,
            },
        },
        select: {
            userId: true,
            role: true,
        },
    });

    const decision = evaluateTripMutationAuthorization({
        userId,
        membershipRole: membership?.role ?? null,
        permission,
    });

    if (!decision.ok) {
        return {
            ok: false,
            response: NextResponse.json({ message: decision.message }, { status: decision.status }),
        };
    }

    return {
        ok: true,
        userId,
        membership: {
            userId,
            role: membership!.role as TripRole,
        },
    };
}
