import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma/client';
import { canEditBudget, canEditItinerary, canManageParticipants, canManageTripSettings, TripRole } from '@/lib/trips/permissions';
import TripDetailsClient from '@/components/trips/TripDetailsClient';

type TripChatMessageType = 'USER' | 'SYSTEM';
type TripTab = 'overview' | 'itinerary' | 'explore' | 'budget' | 'chat';

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
        role: TripRole;
        user: {
            id: string;
            name: string | null;
            email: string | null;
            image: string | null;
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
    chatMessages: {
        id: string;
        type: TripChatMessageType;
        content: string;
        createdAt: Date;
        user: {
            id: string;
            name: string | null;
            email: string | null;
            image: string | null;
        } | null;
    }[];
};

const DEFAULT_COVER_IMAGE =
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=2000&auto=format&fit=crop';

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
                            image: true,
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
            chatMessages: {
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
                orderBy: {
                    createdAt: 'asc',
                },
                take: 200,
            },
        },
    } as never)) as unknown as TripWithRelations | null;

    if (!trip) {
        notFound();
    }

    const collaborators = trip.members.map((member) => {
        const name = member.user.name || member.user.email || 'User';
        return {
            id: member.user.id,
            name,
            image: member.user.image,
        };
    });
    const currentMember = trip.members.find((member) => member.userId === userId);
    const role = currentMember?.role;
    const canManage = role ? canEditItinerary(role) && canEditBudget(role) : false;
    const canViewParticipants = Boolean(currentMember);
    const canManageParticipantsValue = role ? canManageParticipants(role) : false;
    const canManageTripSettingsValue = role ? canManageTripSettings(role) : false;

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
                chatMessages: trip.chatMessages.map((message) => ({
                    id: message.id,
                    type: message.type,
                    content: message.content,
                    createdAt: message.createdAt.toISOString(),
                    user: message.user
                        ? {
                              id: message.user.id,
                              name: message.user.name,
                              email: message.user.email,
                              image: message.user.image,
                          }
                        : null,
                })),
            }}
            currentUserId={userId}
            canManage={canManage}
            canManageParticipants={canManageParticipantsValue}
            canManageTripSettings={canManageTripSettingsValue}
            canViewParticipants={canViewParticipants}
            initialTab={initialTab}
        />
    );
}
