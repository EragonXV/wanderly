import { NotificationType } from '@prisma/client';
import { prisma } from '@/lib/prisma/client';

type CreateNotificationsInput = {
    userIds: string[];
    type: NotificationType;
    title: string;
    message: string;
    tripId?: string;
    invitationId?: string;
    link?: string;
};

const CLUSTERED_TYPES: NotificationType[] = [
    'TRIP_UPDATED',
    'ITINERARY_UPDATED',
    'BUDGET_UPDATED',
    'PARTICIPANTS_UPDATED',
    'ROLE_UPDATED',
];

export async function createNotifications(input: CreateNotificationsInput) {
    const deduplicatedUserIds = Array.from(new Set(input.userIds.filter(Boolean)));
    if (deduplicatedUserIds.length === 0) {
        return;
    }

    const shouldCluster = CLUSTERED_TYPES.includes(input.type) && Boolean(input.tripId);

    await Promise.all(
        deduplicatedUserIds.map(async (userId) => {
            if (shouldCluster) {
                const existing = await prisma.notification.findFirst({
                    where: {
                        userId,
                        tripId: input.tripId ?? null,
                        type: input.type,
                        isRead: false,
                    },
                    select: {
                        id: true,
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                });

                if (existing) {
                    await prisma.notification.update({
                        where: {
                            id: existing.id,
                        },
                        data: {
                            title: input.title,
                            message: input.message,
                            link: input.link ?? null,
                        },
                    });
                    return;
                }
            }

            await prisma.notification.create({
                data: {
                    userId,
                    tripId: input.tripId ?? null,
                    invitationId: input.invitationId ?? null,
                    type: input.type,
                    title: input.title,
                    message: input.message,
                    link: input.link ?? null,
                },
            });
        })
    );
}

type CreateTripMemberNotificationsInput = {
    tripId: string;
    actorUserId?: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
};

export async function createTripMemberNotifications(input: CreateTripMemberNotificationsInput) {
    const members = await prisma.tripMember.findMany({
        where: { tripId: input.tripId },
        select: { userId: true },
    });

    const recipientIds = members
        .map((member) => member.userId)
        .filter((memberUserId) => memberUserId !== input.actorUserId);

    await createNotifications({
        userIds: recipientIds,
        tripId: input.tripId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
    });
}

export async function markNotificationRead(notificationId: string, userId: string) {
    return prisma.notification.updateMany({
        where: {
            id: notificationId,
            userId,
            isRead: false,
        },
        data: {
            isRead: true,
            readAt: new Date(),
        },
    });
}

export async function markAllNotificationsRead(userId: string) {
    return prisma.notification.updateMany({
        where: {
            userId,
            isRead: false,
        },
        data: {
            isRead: true,
            readAt: new Date(),
        },
    });
}
