import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma/client';
import TripDetailsClient from '@/components/trips/TripDetailsClient';

type Props = {
    params: Promise<{ id: string }>;
};

const DEFAULT_COVER_IMAGE =
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=2000&auto=format&fit=crop';

const AVATAR_COLORS = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-pink-500',
    'bg-indigo-500',
];

export default async function TripDetailsPage({ params }: Props) {
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

    const collaborators = trip.members.map((member, index) => {
        const name = member.user.name || member.user.email || 'User';
        return {
            id: member.user.id,
            name,
            initial: name.charAt(0).toUpperCase(),
            color: AVATAR_COLORS[index % AVATAR_COLORS.length],
        };
    });

    return (
        <TripDetailsClient
            trip={{
                id: trip.id,
                title: trip.title,
                destination: trip.destination,
                startDate: trip.startDate.toISOString(),
                endDate: trip.endDate.toISOString(),
                coverImage: trip.coverImage || DEFAULT_COVER_IMAGE,
                collaborators,
            }}
        />
    );
}
