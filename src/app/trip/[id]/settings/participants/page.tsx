import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma/client';
import { getEffectiveInvitationStatus } from '@/lib/trips/invitationLifecycle';
import { canManageParticipants, canManageRoles, TripRole } from '@/lib/trips/permissions';
import TripParticipantsClient from '@/components/trips/TripParticipantsClient';

type Props = {
    params: Promise<{ id: string }>;
};

type MemberForSettings = {
    userId: string;
    role: TripRole;
    name: string;
    email: string | null;
    image: string | null;
    age: number | null;
    country: string | null;
};

type InvitationForSettings = {
    id: string;
    userId: string;
    name: string;
    email: string | null;
    image: string | null;
    age: number | null;
    country: string | null;
    status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
    expiresAt: string;
    createdAt: string;
    invitedByName: string;
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

export default async function TripParticipantsPage({ params }: Props) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
        redirect('/login');
    }

    const trip = await prisma.trip.findFirst({
        where: {
            id,
            members: {
                some: {
                    userId,
                },
            },
        },
        include: {
            members: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            image: true,
                            birthDate: true,
                            country: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'asc',
                },
            },
            invitations: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            image: true,
                            birthDate: true,
                            country: true,
                        },
                    },
                    invitedBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            },
        },
    });

    if (!trip) {
        notFound();
    }

    const currentMembership = trip.members.find((member) => member.userId === userId);
    const tripOwner = trip.members.find((member) => member.role === 'OWNER');

    if (!currentMembership) {
        redirect(`/trip/${id}`);
    }

    const members: MemberForSettings[] = trip.members.map((member) => ({
        userId: member.userId,
        role: member.role,
        name: member.user.name || member.user.email || 'Unknown user',
        email: member.user.email,
        image: member.user.image,
        age: getAgeFromBirthDate(member.user.birthDate),
        country: member.user.country,
    }));

    const invitations: InvitationForSettings[] = trip.invitations.map((invitation) => ({
        id: invitation.id,
        userId: invitation.userId,
        name: invitation.user.name || invitation.user.email || 'Unknown user',
        email: invitation.user.email,
        image: invitation.user.image,
        age: getAgeFromBirthDate(invitation.user.birthDate),
        country: invitation.user.country,
        status: getEffectiveInvitationStatus(invitation.status, invitation.expiresAt),
        expiresAt: invitation.expiresAt.toISOString(),
        createdAt: invitation.createdAt.toISOString(),
        invitedByName: invitation.invitedBy.name || invitation.invitedBy.email || 'Unknown user',
    }));

    return (
        <TripParticipantsClient
            tripId={trip.id}
            currentUserId={userId}
            ownerId={tripOwner?.userId || userId}
            members={members}
            invitations={invitations}
            canManage={canManageParticipants(currentMembership.role)}
            canManageRoles={canManageRoles(currentMembership.role)}
        />
    );
}
