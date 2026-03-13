import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { authorizeTripMutation } from '@/lib/trips/apiAuthorization';
import { createTripSystemMessage } from '@/lib/trips/chatMessages';

type Context = {
    params: Promise<{ id: string; dayId: string; activityId: string }>;
};

const ACTIVITY_TYPES = ['FLIGHT', 'LODGING', 'FOOD', 'ACTIVITY'] as const;
const TIME_24H_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export async function PATCH(req: Request, context: Context) {
    try {
        const { id: tripId, dayId, activityId } = await context.params;
        const auth = await authorizeTripMutation(tripId, 'EDIT_ITINERARY');
        if (!auth.ok) {
            return auth.response;
        }
        const { time, title, type } = await req.json();

        const parsedTime = typeof time === 'string' ? time.trim() : '';
        const parsedTitle = typeof title === 'string' ? title.trim() : '';
        const parsedType = typeof type === 'string' ? type.toUpperCase() : 'ACTIVITY';

        if (!parsedTitle) {
            return NextResponse.json({ message: 'Title is required' }, { status: 400 });
        }

        if (parsedTime && !TIME_24H_REGEX.test(parsedTime)) {
            return NextResponse.json({ message: 'Time must be in 24h format (HH:mm)' }, { status: 400 });
        }

        if (!ACTIVITY_TYPES.includes(parsedType as (typeof ACTIVITY_TYPES)[number])) {
            return NextResponse.json({ message: 'Invalid activity type' }, { status: 400 });
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

        await createTripSystemMessage(
            tripId,
            parsedTime ? `Aktivität geändert: ${parsedTime} • ${parsedTitle}` : `Aktivität geändert: ${parsedTitle}`
        );

        return NextResponse.json({ activity: updated }, { status: 200 });
    } catch (error) {
        console.error('Update itinerary activity error:', error);
        return NextResponse.json({ message: 'Something went wrong while updating activity' }, { status: 500 });
    }
}

export async function DELETE(_: Request, context: Context) {
    try {
        const { id: tripId, dayId, activityId } = await context.params;
        const auth = await authorizeTripMutation(tripId, 'EDIT_ITINERARY');
        if (!auth.ok) {
            return auth.response;
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

        await createTripSystemMessage(tripId, 'Eine Aktivität wurde aus der Planung entfernt.');

        return NextResponse.json({ message: 'Activity deleted' }, { status: 200 });
    } catch (error) {
        console.error('Delete itinerary activity error:', error);
        return NextResponse.json({ message: 'Something went wrong while deleting activity' }, { status: 500 });
    }
}
