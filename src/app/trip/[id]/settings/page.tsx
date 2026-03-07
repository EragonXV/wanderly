import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma/client';
import TripSettingsClient from '@/components/trips/TripSettingsClient';

type Props = {
    params: Promise<{ id: string }>;
};

type TripSettingsData = {
    id: string;
    title: string;
    destination: string;
    destinationPlaceId: string | null;
    category: string;
    description: string | null;
    startDate: Date;
    endDate: Date;
    coverImage: string | null;
    members: {
        userId: string;
        role: 'OWNER' | 'MEMBER';
    }[];
};

export default async function TripSettingsPage({ params }: Props) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
        redirect('/login');
    }

    const trip = (await prisma.trip.findFirst({
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
                select: {
                    userId: true,
                    role: true,
                },
            },
        },
    })) as unknown as TripSettingsData | null;

    if (!trip) {
        notFound();
    }

    const currentMembership = trip.members.find((member) => member.userId === userId);

    if (!currentMembership || currentMembership.role !== 'OWNER') {
        redirect(`/trip/${id}`);
    }

    return (
        <TripSettingsClient
            tripId={trip.id}
            tripTitle={trip.title}
            initialDestination={trip.destination}
            initialDestinationPlaceId={trip.destinationPlaceId}
            initialCategory={trip.category}
            initialDescription={trip.description}
            initialStartDate={trip.startDate.toISOString().slice(0, 10)}
            initialEndDate={trip.endDate.toISOString().slice(0, 10)}
            initialCoverImage={trip.coverImage}
        />
    );
}
