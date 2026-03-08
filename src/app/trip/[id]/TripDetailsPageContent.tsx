import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma/client';
import TripDetailsClient from '@/components/trips/TripDetailsClient';

type TripTab = 'overview' | 'itinerary' | 'explore' | 'budget';

type TripWithRelations = {
    id: string;
    title: string;
    description: string | null;
    destination: string;
    category: string;
    timeMode: 'FIXED' | 'FLEXIBLE';
    startDate: Date;
    endDate: Date;
    planningStartDate: Date | null;
    planningEndDate: Date | null;
    plannedDurationDays: number | null;
    participantMode: 'NONE' | 'FIXED' | 'RANGE';
    participantFixedCount: number | null;
    participantMinCount: number | null;
    participantMaxCount: number | null;
    coverImage: string | null;
    members: {
        userId: string;
        role: 'OWNER' | 'MEMBER';
        user: {
            id: string;
            name: string | null;
            email: string | null;
        };
    }[];
    itineraryDays: {
        id: string;
        dayNumber: number;
        summary: string;
        location: string;
        activities: {
            id: string;
            time: string;
            title: string;
            type: 'FLIGHT' | 'LODGING' | 'FOOD' | 'ACTIVITY';
        }[];
        tags: { label: string }[];
    }[];
    budgetItems: {
        id: string;
        title: string;
        category: string;
        pricingMode: 'PER_PERSON' | 'GROUP_TOTAL';
        peopleCount: number;
        estimatedCostCents: number;
        dayStart: number | null;
        dayEnd: number | null;
        notes: string | null;
    }[];
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

type Props = {
    id: string;
    initialTab?: TripTab;
};

export default async function TripDetailsPageContent({ id, initialTab = 'overview' }: Props) {
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
            itineraryDays: {
                include: {
                    activities: {
                        orderBy: {
                            time: 'asc',
                        },
                    },
                    tags: {
                        orderBy: {
                            label: 'asc',
                        },
                    },
                },
                orderBy: {
                    dayNumber: 'asc',
                },
            },
            budgetItems: {
                orderBy: {
                    createdAt: 'asc',
                },
            },
        },
    })) as unknown as TripWithRelations | null;

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
    const currentMember = trip.members.find((member) => member.userId === userId);
    const canManage = currentMember?.role === 'OWNER';
    const canViewParticipants = Boolean(currentMember);

    return (
        <TripDetailsClient
            trip={{
                id: trip.id,
                title: trip.title,
                description: trip.description,
                destination: trip.destination,
                category: trip.category,
                timeMode: trip.timeMode,
                startDate: trip.startDate.toISOString(),
                endDate: trip.endDate.toISOString(),
                planningStartDate: trip.planningStartDate?.toISOString() ?? null,
                planningEndDate: trip.planningEndDate?.toISOString() ?? null,
                plannedDurationDays: trip.plannedDurationDays,
                participantMode: trip.participantMode,
                participantFixedCount: trip.participantFixedCount,
                participantMinCount: trip.participantMinCount,
                participantMaxCount: trip.participantMaxCount,
                coverImage: trip.coverImage || DEFAULT_COVER_IMAGE,
                collaborators,
                itineraryDays: trip.itineraryDays.map((day) => ({
                    id: day.id,
                    dayNumber: day.dayNumber,
                    summary: day.summary,
                    location: day.location,
                    activities: day.activities.map((activity) => ({
                        id: activity.id,
                        time: activity.time,
                        title: activity.title,
                        type: activity.type,
                    })),
                    tags: day.tags.map((tag) => tag.label),
                })),
                budgetItems: trip.budgetItems.map((item) => ({
                    id: item.id,
                    title: item.title,
                    category: item.category,
                    pricingMode: item.pricingMode,
                    peopleCount: item.peopleCount,
                    estimatedCostCents: item.estimatedCostCents,
                    dayStart: item.dayStart,
                    dayEnd: item.dayEnd,
                    notes: item.notes,
                })),
            }}
            canManage={canManage}
            canViewParticipants={canViewParticipants}
            initialTab={initialTab}
        />
    );
}
