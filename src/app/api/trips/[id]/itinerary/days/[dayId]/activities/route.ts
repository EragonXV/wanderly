import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma/client';

type Context = {
    params: Promise<{ id: string; dayId: string }>;
};

const ACTIVITY_TYPES = ['FLIGHT', 'LODGING', 'FOOD', 'ACTIVITY'] as const;
const TIME_24H_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export async function POST(req: Request, context: Context) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id: tripId, dayId } = await context.params;
        const { time, title, type } = await req.json();

        const parsedTime = typeof time === 'string' ? time.trim() : '';
        const parsedTitle = typeof title === 'string' ? title.trim() : '';
        const parsedType = typeof type === 'string' ? type.toUpperCase() : 'ACTIVITY';

        if (!parsedTime || !parsedTitle) {
            return NextResponse.json({ message: 'Time and title are required' }, { status: 400 });
        }

        if (!TIME_24H_REGEX.test(parsedTime)) {
            return NextResponse.json({ message: 'Time must be in 24h format (HH:mm)' }, { status: 400 });
        }

        if (!ACTIVITY_TYPES.includes(parsedType as (typeof ACTIVITY_TYPES)[number])) {
            return NextResponse.json({ message: 'Invalid activity type' }, { status: 400 });
        }

        const membership = await prisma.tripMember.findUnique({
            where: {
                tripId_userId: {
                    tripId,
                    userId,
                },
            },
        });

        if (!membership) {
            return NextResponse.json({ message: 'Trip not found' }, { status: 404 });
        }

        if (membership.role !== 'OWNER') {
            return NextResponse.json({ message: 'Only the owner can edit itinerary' }, { status: 403 });
        }

        const day = await prisma.tripItineraryDay.findFirst({
            where: {
                id: dayId,
                tripId,
            },
            select: { id: true },
        });

        if (!day) {
            return NextResponse.json({ message: 'Itinerary day not found' }, { status: 404 });
        }

        const activity = await prisma.tripItineraryActivity.create({
            data: {
                dayId,
                time: parsedTime,
                title: parsedTitle,
                type: parsedType as 'FLIGHT' | 'LODGING' | 'FOOD' | 'ACTIVITY',
            },
        });

        return NextResponse.json({ activity }, { status: 201 });
    } catch (error) {
        console.error('Create itinerary activity error:', error);
        return NextResponse.json({ message: 'Something went wrong while creating activity' }, { status: 500 });
    }
}
