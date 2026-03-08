import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma/client';
import { createTripSystemMessage } from '@/lib/trips/chatMessages';
import {
    canTransitionInvitationStatus,
    getEffectiveInvitationStatus,
} from '@/lib/trips/invitationLifecycle';

type Context = {
    params: Promise<{ invitationId: string }>;
};

export async function POST(_: Request, context: Context) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { invitationId } = await context.params;
        const invitation = await prisma.tripInvitation.findUnique({
            where: { id: invitationId },
        });

        if (!invitation) {
            return NextResponse.json({ message: 'Invitation not found' }, { status: 404 });
        }

        if (invitation.userId !== userId) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const now = new Date();
        const effectiveStatus = getEffectiveInvitationStatus(invitation.status, invitation.expiresAt, now);

        if (effectiveStatus === 'EXPIRED') {
            if (invitation.status !== 'EXPIRED') {
                await prisma.tripInvitation.update({
                    where: { id: invitation.id },
                    data: {
                        status: 'EXPIRED',
                        respondedAt: now,
                    },
                });
            }
            return NextResponse.json({ message: 'Invitation has expired' }, { status: 409 });
        }

        if (!canTransitionInvitationStatus(invitation.status, 'DECLINED')) {
            return NextResponse.json({ message: 'Invitation cannot be declined from its current state' }, { status: 409 });
        }

        await prisma.tripInvitation.update({
            where: { id: invitation.id },
            data: {
                status: 'DECLINED',
                respondedAt: now,
            },
        });

        await createTripSystemMessage(invitation.tripId, 'Eine Einladung wurde abgelehnt.');

        return NextResponse.json({ message: 'Invitation declined' }, { status: 200 });
    } catch (error) {
        console.error('Decline invitation error:', error);
        return NextResponse.json({ message: 'Something went wrong while declining invitation' }, { status: 500 });
    }
}
