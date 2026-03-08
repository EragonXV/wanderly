import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { authorizeTripMutation } from '@/lib/trips/apiAuthorization';
import { createTripSystemMessage } from '@/lib/trips/chatMessages';

type Context = {
    params: Promise<{ id: string; dayId: string }>;
};

export async function PATCH(req: Request, context: Context) {
    try {
        const { id: tripId, dayId } = await context.params;
        const auth = await authorizeTripMutation(tripId, 'EDIT_ITINERARY');
        if (!auth.ok) {
            return auth.response;
        }
        const { dayNumber, summary, location, tags, blockDayIds, blockLength } = await req.json();

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
        const parsedBlockDayIds = Array.isArray(blockDayIds)
            ? Array.from(
                  new Set(
                      blockDayIds
                          .map((value) => (typeof value === 'string' ? value : ''))
                          .filter((value) => value.length > 0)
                  )
              )
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
            return NextResponse.json({ message: 'Location is required' }, { status: 400 });
        }

        const existingDay = await prisma.tripItineraryDay.findFirst({
            where: {
                id: dayId,
                tripId,
            },
            select: {
                id: true,
            },
        });

        if (!existingDay) {
            return NextResponse.json({ message: 'Itinerary day not found' }, { status: 404 });
        }

        const requestedBlockIds =
            parsedBlockDayIds.length > 0 && parsedBlockDayIds.includes(dayId)
                ? parsedBlockDayIds
                : [dayId];

        const targetDays = await prisma.tripItineraryDay.findMany({
            where: {
                tripId,
                id: {
                    in: requestedBlockIds,
                },
            },
            orderBy: {
                dayNumber: 'asc',
            },
            select: {
                id: true,
                dayNumber: true,
            },
        });

        if (targetDays.length !== requestedBlockIds.length) {
            return NextResponse.json(
                { message: 'Some itinerary days in this block were not found' },
                { status: 404 }
            );
        }

        if (requestedBlockIds.length > 1) {
            for (let i = 1; i < targetDays.length; i++) {
                if (targetDays[i].dayNumber !== targetDays[i - 1].dayNumber + 1) {
                    return NextResponse.json(
                        { message: 'Block days must be consecutive' },
                        { status: 400 }
                    );
                }
            }
        }

        const targetDayNumbers = Array.from(
            { length: parsedBlockLength },
            (_, index) => parsedDayNumber + index
        );

        const conflictingDays = await prisma.tripItineraryDay.findMany({
            where: {
                tripId,
                id: {
                    notIn: targetDays.map((day) => day.id),
                },
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

        const updatedDay = await prisma.$transaction(async (tx) => {
            const keepLength = Math.min(parsedBlockLength, targetDays.length);
            const keptDays = targetDays.slice(0, keepLength);
            const removedDays = targetDays.slice(keepLength);
            const additionalCount = parsedBlockLength - keepLength;

            if (removedDays.length > 0) {
                const activitiesOnRemovedDays = await tx.tripItineraryActivity.count({
                    where: {
                        dayId: {
                            in: removedDays.map((day) => day.id),
                        },
                    },
                });

                if (activitiesOnRemovedDays > 0) {
                    throw new Error('BLOCK_DAYS_HAVE_ACTIVITIES');
                }

                await tx.tripItineraryDay.deleteMany({
                    where: {
                        id: {
                            in: removedDays.map((day) => day.id),
                        },
                    },
                });
            }

            const allTargetDayIds = keptDays.map((day) => day.id);
            const temporaryBase = -1000000;

            for (let index = 0; index < additionalCount; index++) {
                const createdDay = await tx.tripItineraryDay.create({
                    data: {
                        tripId,
                        dayNumber: temporaryBase - index,
                        summary: parsedSummary,
                        location: parsedLocation,
                    },
                    select: {
                        id: true,
                    },
                });

                allTargetDayIds.push(createdDay.id);
            }

            for (let index = 0; index < allTargetDayIds.length; index++) {
                await tx.tripItineraryDay.update({
                    where: { id: allTargetDayIds[index] },
                    data: {
                        dayNumber: temporaryBase - 1000 - index,
                    },
                });
            }

            for (let index = 0; index < allTargetDayIds.length; index++) {
                await tx.tripItineraryDay.update({
                    where: { id: allTargetDayIds[index] },
                    data: {
                        dayNumber: targetDayNumbers[index],
                        summary: parsedSummary,
                        location: parsedLocation,
                    },
                });
            }

            await tx.tripItineraryTag.deleteMany({
                where: {
                    dayId: {
                        in: allTargetDayIds,
                    },
                },
            });

            if (parsedTags.length > 0) {
                await tx.tripItineraryTag.createMany({
                    data: allTargetDayIds.flatMap((targetDayId) =>
                        parsedTags.map((label: string) => ({ dayId: targetDayId, label }))
                    ),
                });
            }

            const days = await tx.tripItineraryDay.findMany({
                where: {
                    id: {
                        in: allTargetDayIds,
                    },
                },
                include: {
                    tags: {
                        orderBy: {
                            label: 'asc',
                        },
                    },
                },
                orderBy: {
                    dayNumber: 'asc',
                },
            });

            return days;
        });

        await createTripSystemMessage(
            tripId,
            updatedDay.length > 1
                ? 'Ein Tagesblock wurde bearbeitet.'
                : `Tag ${updatedDay[0]?.dayNumber ?? ''} wurde bearbeitet.`
        );

        if (updatedDay.length === 1) {
            return NextResponse.json({ day: updatedDay[0], days: updatedDay }, { status: 200 });
        }

        return NextResponse.json({ days: updatedDay }, { status: 200 });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '';

        if (errorMessage === 'BLOCK_DAYS_HAVE_ACTIVITIES') {
            return NextResponse.json(
                { message: 'Cannot shrink block while removed days still have activities' },
                { status: 409 }
            );
        }

        if (errorMessage.includes('Unique constraint')) {
            return NextResponse.json({ message: 'A day with this number already exists' }, { status: 409 });
        }

        console.error('Update itinerary day error:', error);
        return NextResponse.json(
            { message: 'Something went wrong while updating itinerary day' },
            { status: 500 }
        );
    }
}

export async function DELETE(req: Request, context: Context) {
    try {
        const { id: tripId, dayId } = await context.params;
        const auth = await authorizeTripMutation(tripId, 'EDIT_ITINERARY');
        if (!auth.ok) {
            return auth.response;
        }

        let parsedBody: unknown = {};
        try {
            const rawBody = await req.text();
            parsedBody = rawBody ? JSON.parse(rawBody) : {};
        } catch {
            parsedBody = {};
        }

        const blockDayIds =
            parsedBody && typeof parsedBody === 'object' && Array.isArray((parsedBody as { blockDayIds?: unknown[] }).blockDayIds)
                ? (parsedBody as { blockDayIds: unknown[] }).blockDayIds
                : [];

        const parsedBlockDayIds = Array.from(
            new Set(
                blockDayIds
                    .map((value) => (typeof value === 'string' ? value : ''))
                    .filter((value) => value.length > 0)
            )
        );

        const requestedDayIds =
            parsedBlockDayIds.length > 0 && parsedBlockDayIds.includes(dayId)
                ? parsedBlockDayIds
                : [dayId];

        const targetDays = await prisma.tripItineraryDay.findMany({
            where: {
                tripId,
                id: {
                    in: requestedDayIds,
                },
            },
            orderBy: {
                dayNumber: 'asc',
            },
            select: {
                id: true,
                dayNumber: true,
            },
        });

        if (targetDays.length !== requestedDayIds.length) {
            return NextResponse.json(
                { message: 'Some itinerary days in this selection were not found' },
                { status: 404 }
            );
        }

        if (targetDays.length > 1) {
            for (let index = 1; index < targetDays.length; index++) {
                if (targetDays[index].dayNumber !== targetDays[index - 1].dayNumber + 1) {
                    return NextResponse.json(
                        { message: 'Selected block days must be consecutive' },
                        { status: 400 }
                    );
                }
            }
        }

        await prisma.tripItineraryDay.deleteMany({
            where: {
                id: {
                    in: targetDays.map((day) => day.id),
                },
            },
        });

        await createTripSystemMessage(
            tripId,
            targetDays.length > 1
                ? `${targetDays.length} Tage wurden gelöscht.`
                : `Tag ${targetDays[0]?.dayNumber ?? ''} wurde gelöscht.`
        );

        return NextResponse.json(
            {
                deletedDayIds: targetDays.map((day) => day.id),
            },
            { status: 200 }
        );
    } catch (error: unknown) {
        console.error('Delete itinerary day error:', error);
        return NextResponse.json(
            { message: 'Something went wrong while deleting itinerary day' },
            { status: 500 }
        );
    }
}
