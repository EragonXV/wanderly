import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma/client';
import { createTripUserMessage } from '@/lib/trips/chatMessages';

type Context = {
    params: Promise<{ id: string }>;
};

const tripChatMessageClient = (prisma as unknown as {
    tripChatMessage: {
        findMany: (args: {
            where: { tripId: string };
            include: {
                user: {
                    select: {
                        id: true;
                        name: true;
                        email: true;
                        image: true;
                    };
                };
            };
            orderBy: { createdAt: 'asc' };
            take: number;
        }) => Promise<Array<{
            id: string;
            tripId: string;
            userId: string | null;
            type: 'USER' | 'SYSTEM';
            content: string;
            createdAt: Date;
            updatedAt: Date;
            user: {
                id: string;
                name: string | null;
                email: string | null;
                image: string | null;
            } | null;
        }>>;
    };
}).tripChatMessage;

async function ensureTripMembership(tripId: string, userId: string) {
    const membership = await prisma.tripMember.findUnique({
        where: {
            tripId_userId: {
                tripId,
                userId,
            },
        },
        select: {
            userId: true,
        },
    });

    return Boolean(membership);
}

export async function GET(_: Request, context: Context) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id: tripId } = await context.params;
        const isMember = await ensureTripMembership(tripId, userId);
        if (!isMember) {
            return NextResponse.json({ message: 'Trip not found' }, { status: 404 });
        }

        const messages = await tripChatMessageClient.findMany({
            where: { tripId },
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
            orderBy: { createdAt: 'asc' },
            take: 200,
        });

        return NextResponse.json({ messages }, { status: 200 });
    } catch (error) {
        console.error('List trip chat messages error:', error);
        return NextResponse.json({ message: 'Something went wrong while loading chat messages' }, { status: 500 });
    }
}

export async function POST(req: Request, context: Context) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id: tripId } = await context.params;
        const isMember = await ensureTripMembership(tripId, userId);
        if (!isMember) {
            return NextResponse.json({ message: 'Trip not found' }, { status: 404 });
        }

        const { content } = await req.json();
        const parsedContent = typeof content === 'string' ? content.trim() : '';

        if (!parsedContent) {
            return NextResponse.json({ message: 'Message is required' }, { status: 400 });
        }

        if (parsedContent.length > 2000) {
            return NextResponse.json({ message: 'Message is too long (max 2000 characters)' }, { status: 400 });
        }

        const message = await createTripUserMessage(tripId, userId, parsedContent);

        return NextResponse.json({ message }, { status: 201 });
    } catch (error) {
        console.error('Create trip chat message error:', error);
        return NextResponse.json({ message: 'Something went wrong while creating chat message' }, { status: 500 });
    }
}
