import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { authorizeTripMutation } from '@/lib/trips/apiAuthorization';
import { createTripSystemMessage } from '@/lib/trips/chatMessages';

type Context = {
    params: Promise<{ id: string }>;
};

export async function POST(req: Request, context: Context) {
    try {
        const { id: tripId } = await context.params;
        const auth = await authorizeTripMutation(tripId, 'EDIT_ITINERARY');
        if (!auth.ok) {
            return auth.response;
        }
        const { dayNumber, summary, location, tags, blockLength } = await req.json();

        const parsedDayNumber = Number(dayNumber);
        const parsedBlockLength = Number(blockLength ?? 1);
        const parsedSummary = typeof summary === 'string' ? summary.trim() : '';
        const parsedLocation = typeof location === 'string' ? location.trim() : '';
        const parsedTags = Array.isArray(tags)
            ? tags
                  .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
                  .filter((tag) => tag.length > 0)
                  .slice(0, 10)
            : [];

        if (!Number.isInteger(parsedDayNumber) || parsedDayNumber < 1) {
            return NextResponse.json({ message: 'Day number must be a positive integer' }, { status: 400 });
        }

        if (!Number.isInteger(parsedBlockLength) || parsedBlockLength < 1 || parsedBlockLength > 30) {
            return NextResponse.json(
                { message: 'Block length must be a whole number between 1 and 30' },
                { status: 400 }
            );
        }

        if (!parsedLocation) {
            return NextResponse.json(
                { message: 'Location is required' },
                { status: 400 }
            );
        }

        const targetDayNumbers = Array.from(
            { length: parsedBlockLength },
            (_, index) => parsedDayNumber + index
        );

        const conflictingDays = await prisma.tripItineraryDay.findMany({
            where: {
                tripId,
                dayNumber: {
                    in: targetDayNumbers,
                },
            },
            select: {
                dayNumber: true,
            },
        });

        if (conflictingDays.length > 0) {
            const existing = conflictingDays
                .map((day) => day.dayNumber)
                .sort((a, b) => a - b)
                .join(', ');
            return NextResponse.json(
                { message: `Days already exist: ${existing}` },
                { status: 409 }
            );
        }

        const days = await prisma.$transaction(
            targetDayNumbers.map((targetDayNumber) =>
                prisma.tripItineraryDay.create({
                    data: {
                        tripId,
                        dayNumber: targetDayNumber,
                        summary: parsedSummary,
                        location: parsedLocation,
                        tags: {
                            create: parsedTags.map((label: string) => ({ label })),
                        },
                    },
                    include: {
                        tags: {
                            orderBy: {
                                label: 'asc',
                            },
                        },
                    },
                })
            )
        );

        await createTripSystemMessage(
            tripId,
            days.length > 1
                ? `Es wurden ${days.length} neue Planungstage hinzugefügt.`
                : 'Ein neuer Planungstag wurde hinzugefügt.'
        );

        return NextResponse.json({ days }, { status: 201 });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '';

        if (errorMessage.includes('Unique constraint')) {
            return NextResponse.json(
                { message: 'A day with this number already exists' },
                { status: 409 }
            );
        }

        console.error('Create itinerary day error:', error);
        return NextResponse.json(
            { message: 'Something went wrong while creating itinerary day' },
            { status: 500 }
        );
    }
}
