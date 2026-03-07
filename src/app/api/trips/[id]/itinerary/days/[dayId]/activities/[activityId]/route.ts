import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma/client';

type Context = {
    params: Promise<{ id: string; dayId: string; activityId: string }>;
};

const ACTIVITY_TYPES = ['FLIGHT', 'LODGING', 'FOOD', 'ACTIVITY'] as const;
const TIME_24H_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

async function assertOwner(tripId: string, userId: string) {
    const membership = await prisma.tripMember.findUnique({
        where: {
            tripId_userId: {
                tripId,
                userId,
            },
        },
    });

    if (!membership) {
        return { ok: false as const, status: 404, message: 'Trip not found' };
    }

    if (membership.role !== 'OWNER') {
        return { ok: false as const, status: 403, message: 'Only the owner can edit itinerary' };
    }

    return { ok: true as const };
}

export async function PATCH(req: Request, context: Context) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id: tripId, dayId, activityId } = await context.params;
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

        const ownerCheck = await assertOwner(tripId, userId);
        if (!ownerCheck.ok) {
            return NextResponse.json({ message: ownerCheck.message }, { status: ownerCheck.status });
        }

        const activity = await prisma.tripItineraryActivity.findFirst({
            where: {
                id: activityId,
                dayId,
                day: {
                    tripId,
                },
            },
            select: { id: true },
        });

        if (!activity) {
            return NextResponse.json({ message: 'Activity not found' }, { status: 404 });
        }

        const updated = await prisma.tripItineraryActivity.update({
            where: { id: activityId },
            data: {
                time: parsedTime,
                title: parsedTitle,
                type: parsedType as 'FLIGHT' | 'LODGING' | 'FOOD' | 'ACTIVITY',
            },
        });

        return NextResponse.json({ activity: updated }, { status: 200 });
    } catch (error) {
        console.error('Update itinerary activity error:', error);
        return NextResponse.json({ message: 'Something went wrong while updating activity' }, { status: 500 });
    }
}

export async function DELETE(_: Request, context: Context) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id: tripId, dayId, activityId } = await context.params;

        const ownerCheck = await assertOwner(tripId, userId);
        if (!ownerCheck.ok) {
            return NextResponse.json({ message: ownerCheck.message }, { status: ownerCheck.status });
        }

        const activity = await prisma.tripItineraryActivity.findFirst({
            where: {
                id: activityId,
                dayId,
                day: {
                    tripId,
                },
            },
            select: { id: true },
        });

        if (!activity) {
            return NextResponse.json({ message: 'Activity not found' }, { status: 404 });
        }

        await prisma.tripItineraryActivity.delete({
            where: { id: activityId },
        });

        return NextResponse.json({ message: 'Activity deleted' }, { status: 200 });
    } catch (error) {
        console.error('Delete itinerary activity error:', error);
        return NextResponse.json({ message: 'Something went wrong while deleting activity' }, { status: 500 });
    }
}
