import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { authorizeTripMutation } from '@/lib/trips/apiAuthorization';
import { createTripSystemMessage } from '@/lib/trips/chatMessages';
import { getEffectiveInvitationStatus } from '@/lib/trips/invitationLifecycle';

type Context = {
    params: Promise<{ id: string }>;
};

function getAgeFromBirthDate(value: Date | null) {
    if (!value) {
        return null;
    }
    const now = new Date();
    let age = now.getFullYear() - value.getFullYear();
    const hasBirthdayPassed =
        now.getMonth() > value.getMonth()
        || (now.getMonth() === value.getMonth() && now.getDate() >= value.getDate());
    if (!hasBirthdayPassed) {
        age -= 1;
    }
    return age >= 0 ? age : null;
}

export async function POST(req: Request, context: Context) {
    try {
        const { id: tripId } = await context.params;
        const auth = await authorizeTripMutation(tripId, 'MANAGE_PARTICIPANTS');
        if (!auth.ok) {
            return auth.response;
        }
        const { email } = await req.json();

        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

        if (!normalizedEmail) {
            return NextResponse.json({ message: 'Email is required' }, { status: 400 });
        }

        const userToInvite = await prisma.user.findUnique({
            where: {
                email: normalizedEmail,
            },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                birthDate: true,
                country: true,
            },
        });

        if (!userToInvite) {
            return NextResponse.json({ message: 'No user found with this email' }, { status: 404 });
        }

        const existingMembership = await prisma.tripMember.findUnique({
            where: {
                tripId_userId: {
                    tripId,
                    userId: userToInvite.id,
                },
            },
        });

        if (existingMembership) {
            return NextResponse.json({ message: 'User is already a participant' }, { status: 409 });
        }

        const now = new Date();
        const existingPendingInvitation = await prisma.tripInvitation.findFirst({
            where: {
                tripId,
                userId: userToInvite.id,
                status: 'PENDING',
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        if (existingPendingInvitation) {
            const effectiveStatus = getEffectiveInvitationStatus(
                existingPendingInvitation.status,
                existingPendingInvitation.expiresAt,
                now
            );
            if (effectiveStatus === 'EXPIRED') {
                await prisma.tripInvitation.update({
                    where: { id: existingPendingInvitation.id },
                    data: {
                        status: 'EXPIRED',
                        respondedAt: now,
                    },
                });
            } else {
                return NextResponse.json({ message: 'A pending invitation already exists for this user' }, { status: 409 });
            }
        }

        const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const invitation = await prisma.tripInvitation.create({
            data: {
                tripId,
                userId: userToInvite.id,
                invitedByUserId: auth.userId,
                status: 'PENDING',
                expiresAt,
            },
        });
        const trip = await prisma.trip.findUnique({
            where: { id: tripId },
            select: { title: true },
        });

        await createTripSystemMessage(
            tripId,
            `${userToInvite.name || userToInvite.email || 'Ein Nutzer'} wurde zur Reise "${trip?.title ?? tripId}" eingeladen.`
        );

        return NextResponse.json(
            {
                message: 'Participant invitation sent',
                invitation: {
                    id: invitation.id,
                    status: invitation.status,
                    expiresAt: invitation.expiresAt,
                    createdAt: invitation.createdAt,
                    userId: userToInvite.id,
                    name: userToInvite.name || userToInvite.email || 'Unknown user',
                    email: userToInvite.email,
                    image: userToInvite.image,
                    age: getAgeFromBirthDate(userToInvite.birthDate),
                    country: userToInvite.country,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Invite participant error:', error);
        return NextResponse.json({ message: 'Something went wrong while inviting participant' }, { status: 500 });
    }
}
