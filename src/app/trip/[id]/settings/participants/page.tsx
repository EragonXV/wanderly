import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma/client';
import TripParticipantsClient from '@/components/trips/TripParticipantsClient';

type Props = {
    params: Promise<{ id: string }>;
};

type MemberForSettings = {
    userId: string;
    role: 'OWNER' | 'MEMBER';
    name: string;
    email: string | null;
};

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
                        },
                    },
                },
                orderBy: {
                    createdAt: 'asc',
                },
            },
        },
    });

    if (!trip) {
        notFound();
    }

    const currentMembership = trip.members.find((member) => member.userId === userId);

    if (!currentMembership) {
        redirect(`/trip/${id}`);
    }

    const members: MemberForSettings[] = trip.members.map((member) => ({
        userId: member.userId,
        role: member.role,
        name: member.user.name || member.user.email || 'Unknown user',
        email: member.user.email,
    }));

    return (
        <TripParticipantsClient
            tripId={trip.id}
            ownerId={userId}
            members={members}
            canManage={currentMembership.role === 'OWNER'}
        />
    );
}
