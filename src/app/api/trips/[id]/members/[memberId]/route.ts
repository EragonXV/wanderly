import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { authorizeTripMutation } from '@/lib/trips/apiAuthorization';
import { createTripSystemMessage } from '@/lib/trips/chatMessages';
import { TripRole } from '@/lib/trips/permissions';

type Context = {
    params: Promise<{ id: string; memberId: string }>;
};

export async function DELETE(_: Request, context: Context) {
    try {
        const { id: tripId, memberId } = await context.params;
        const auth = await authorizeTripMutation(tripId, 'MANAGE_PARTICIPANTS');
        if (!auth.ok) {
            return auth.response;
        }
        const userId = auth.userId;

        if (memberId === userId) {
            return NextResponse.json({ message: 'You cannot remove yourself' }, { status: 400 });
        }

        const targetMembership = await prisma.tripMember.findUnique({
            where: {
                tripId_userId: {
                    tripId,
                    userId: memberId,
                },
            },
        });

        if (!targetMembership) {
            return NextResponse.json({ message: 'Participant not found' }, { status: 404 });
        }

        if (targetMembership.role === 'OWNER') {
            return NextResponse.json({ message: 'Cannot remove the owner' }, { status: 400 });
        }

        await prisma.tripMember.delete({
            where: {
                tripId_userId: {
                    tripId,
                    userId: memberId,
                },
            },
        });

        await createTripSystemMessage(tripId, 'Ein Teilnehmer wurde aus der Reise entfernt.');

        return NextResponse.json({ message: 'Participant removed' }, { status: 200 });
    } catch (error) {
        console.error('Remove participant error:', error);
        return NextResponse.json({ message: 'Something went wrong while removing participant' }, { status: 500 });
    }
}

export async function PATCH(req: Request, context: Context) {
    try {
        const { id: tripId, memberId } = await context.params;
        const auth = await authorizeTripMutation(tripId, 'MANAGE_ROLES');
        if (!auth.ok) {
            return auth.response;
        }
        const { role } = await req.json();
        const parsedRole = typeof role === 'string' ? role.trim().toUpperCase() : '';

        if (!['ADMIN', 'MEMBER'].includes(parsedRole)) {
            return NextResponse.json({ message: 'Invalid role' }, { status: 400 });
        }

        const targetMembership = await prisma.tripMember.findUnique({
            where: {
                tripId_userId: {
                    tripId,
                    userId: memberId,
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    },
                },
            },
        });

        if (!targetMembership) {
            return NextResponse.json({ message: 'Participant not found' }, { status: 404 });
        }

        if (targetMembership.role === 'OWNER') {
            return NextResponse.json({ message: 'Owner role cannot be changed' }, { status: 400 });
        }

        const updated = await prisma.tripMember.update({
            where: {
                tripId_userId: {
                    tripId,
                    userId: memberId,
                },
            },
            data: {
                role: parsedRole as TripRole,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    },
                },
            },
        });

        await createTripSystemMessage(
            tripId,
            `${updated.user.name || updated.user.email || 'Ein Teilnehmer'} hat jetzt die Rolle ${updated.role}.`
        );

        return NextResponse.json(
            {
                member: {
                    userId: updated.userId,
                    role: updated.role,
                    name: updated.user.name || updated.user.email || 'Unknown user',
                    email: updated.user.email,
                    image: updated.user.image,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Update member role error:', error);
        return NextResponse.json({ message: 'Something went wrong while updating member role' }, { status: 500 });
    }
}
