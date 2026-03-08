import { prisma } from '@/lib/prisma/client';

type TripChatMessageRecord = {
    id: string;
    tripId: string;
    userId: string | null;
    type: 'USER' | 'SYSTEM';
    content: string;
    createdAt: Date;
    updatedAt: Date;
};

const tripChatMessageClient = (prisma as unknown as {
    tripChatMessage: {
        findFirst: (args: {
            where: {
                tripId: string;
                type: 'SYSTEM';
                content: string;
            };
            orderBy: {
                createdAt: 'desc';
            };
            select: {
                id: true;
                createdAt: true;
            };
        }) => Promise<{ id: string; createdAt: Date } | null>;
        update: (args: {
            where: { id: string };
            data: { updatedAt: Date };
        }) => Promise<TripChatMessageRecord>;
        create: (args: {
            data: {
                tripId: string;
                userId?: string;
                type: 'SYSTEM' | 'USER';
                content: string;
            };
            include?: {
                user: {
                    select: {
                        id: true;
                        name: true;
                        email: true;
                        image: true;
                    };
                };
            };
        }) => Promise<TripChatMessageRecord & {
            user?: {
                id: string;
                name: string | null;
                email: string | null;
                image: string | null;
            } | null;
        }>;
    };
}).tripChatMessage;

export async function createTripSystemMessage(tripId: string, content: string) {
    const parsedContent = content.trim();
    if (!parsedContent) {
        return;
    }

    const existing = await tripChatMessageClient.findFirst({
        where: {
            tripId,
            type: 'SYSTEM',
            content: parsedContent,
        },
        orderBy: {
            createdAt: 'desc',
        },
        select: {
            id: true,
            createdAt: true,
        },
    });

    // Cluster identical system updates for 2 minutes.
    if (existing && Date.now() - existing.createdAt.getTime() < 2 * 60 * 1000) {
        await tripChatMessageClient.update({
            where: { id: existing.id },
            data: {
                updatedAt: new Date(),
            },
        });
        return;
    }

    await tripChatMessageClient.create({
        data: {
            tripId,
            type: 'SYSTEM',
            content: parsedContent,
        },
    });
}

export async function createTripUserMessage(tripId: string, userId: string, content: string) {
    const parsedContent = content.trim();
    if (!parsedContent) {
        return null;
    }

    return tripChatMessageClient.create({
        data: {
            tripId,
            userId,
            type: 'USER',
            content: parsedContent,
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
}
