import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma/client';
import { lookupPlaceById } from '@/lib/places/nominatim';

type Context = {
    params: Promise<{ id: string }>;
};

const ALLOWED_TRIP_CATEGORIES = new Set([
    'Ausflug',
    'Kurztrip',
    'Urlaub',
    'Workation',
    'Sonstiges',
]);
const ALLOWED_TIME_MODES = new Set(['FIXED', 'FLEXIBLE']);
const ALLOWED_PARTICIPANT_MODES = new Set(['NONE', 'FIXED', 'RANGE']);

const tripClient = (prisma as unknown as {
    trip: {
        update: (args: {
            where: { id: string };
            data: {
                title: string;
                destination: string;
                destinationPlaceId: string;
                destinationLat: number;
                destinationLng: number;
                category: string;
                description: string | null;
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
            };
            select: {
                id: true;
                title: true;
                destination: true;
                destinationPlaceId: true;
                category: true;
                description: true;
                timeMode: true;
                startDate: true;
                endDate: true;
                planningStartDate: true;
                planningEndDate: true;
                plannedDurationDays: true;
                participantMode: true;
                participantFixedCount: true;
                participantMinCount: true;
                participantMaxCount: true;
                coverImage: true;
            };
        }) => Promise<{
            id: string;
            title: string;
            destination: string;
            destinationPlaceId: string | null;
            category: string;
            description: string | null;
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
        }>;
    };
}).trip;

export async function PATCH(req: Request, context: Context) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await context.params;
        const {
            title,
            destination,
            destinationPlaceId,
            category,
            description,
            timeMode,
            startDate,
            endDate,
            planningStartDate,
            planningEndDate,
            plannedDurationDays,
            participantMode,
            participantFixedCount,
            participantMinCount,
            participantMaxCount,
            coverImage,
        } =
            await req.json();

        if (!title || !destination || !destinationPlaceId) {
            return NextResponse.json(
                { message: 'Title and destination are required' },
                { status: 400 }
            );
        }

        const parsedCategory = typeof category === 'string' ? category.trim() : '';
        if (!ALLOWED_TRIP_CATEGORIES.has(parsedCategory)) {
            return NextResponse.json({ message: 'Invalid trip category' }, { status: 400 });
        }

        const parsedTimeMode = typeof timeMode === 'string' ? timeMode.trim().toUpperCase() : 'FIXED';
        if (!ALLOWED_TIME_MODES.has(parsedTimeMode)) {
            return NextResponse.json({ message: 'Invalid time mode' }, { status: 400 });
        }
        const parsedParticipantMode =
            typeof participantMode === 'string' ? participantMode.trim().toUpperCase() : 'NONE';
        if (!ALLOWED_PARTICIPANT_MODES.has(parsedParticipantMode)) {
            return NextResponse.json({ message: 'Invalid participant mode' }, { status: 400 });
        }

        let parsedStartDate: Date;
        let parsedEndDate: Date;
        let parsedPlanningStartDate: Date | null = null;
        let parsedPlanningEndDate: Date | null = null;
        let parsedPlannedDurationDays: number | null = null;
        let parsedParticipantFixedCount: number | null = null;
        let parsedParticipantMinCount: number | null = null;
        let parsedParticipantMaxCount: number | null = null;

        if (parsedTimeMode === 'FIXED') {
            parsedStartDate = new Date(startDate);
            parsedEndDate = new Date(endDate);

            if (Number.isNaN(parsedStartDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
                return NextResponse.json({ message: 'Invalid date format' }, { status: 400 });
            }
            if (parsedEndDate < parsedStartDate) {
                return NextResponse.json({ message: 'End date must be after start date' }, { status: 400 });
            }
        } else {
            parsedPlanningStartDate = new Date(planningStartDate);
            parsedPlanningEndDate = new Date(planningEndDate);
            parsedPlannedDurationDays = Number(plannedDurationDays);

            if (Number.isNaN(parsedPlanningStartDate.getTime()) || Number.isNaN(parsedPlanningEndDate.getTime())) {
                return NextResponse.json({ message: 'Invalid planning period date format' }, { status: 400 });
            }
            if (parsedPlanningEndDate < parsedPlanningStartDate) {
                return NextResponse.json({ message: 'Planning period end must be after start' }, { status: 400 });
            }
            if (!Number.isInteger(parsedPlannedDurationDays) || parsedPlannedDurationDays < 1) {
                return NextResponse.json({ message: 'Planned duration must be at least 1 day' }, { status: 400 });
            }

            const planningWindowDays =
                Math.floor((parsedPlanningEndDate.getTime() - parsedPlanningStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            if (parsedPlannedDurationDays > planningWindowDays) {
                return NextResponse.json(
                    { message: 'Planned duration cannot be longer than the planning period' },
                    { status: 400 }
                );
            }

            parsedStartDate = parsedPlanningStartDate;
            parsedEndDate = parsedPlanningEndDate;
        }

        if (parsedParticipantMode === 'FIXED') {
            const fixedCount = Number(participantFixedCount);
            if (!Number.isInteger(fixedCount) || fixedCount < 1 || fixedCount > 10000) {
                return NextResponse.json({ message: 'Participant count must be between 1 and 10000' }, { status: 400 });
            }
            parsedParticipantFixedCount = fixedCount;
        } else if (parsedParticipantMode === 'RANGE') {
            const minCount = Number(participantMinCount);
            const maxCount = Number(participantMaxCount);
            if (!Number.isInteger(minCount) || !Number.isInteger(maxCount) || minCount < 1 || maxCount < minCount || maxCount > 10000) {
                return NextResponse.json({ message: 'Participant range is invalid' }, { status: 400 });
            }
            parsedParticipantMinCount = minCount;
            parsedParticipantMaxCount = maxCount;
        }

        const verifiedPlace = await lookupPlaceById(String(destinationPlaceId));
        if (!verifiedPlace) {
            return NextResponse.json({ message: 'Please select a valid place from suggestions' }, { status: 400 });
        }

        const ownerMembership = await prisma.tripMember.findUnique({
            where: {
                tripId_userId: {
                    tripId: id,
                    userId,
                },
            },
        });

        if (!ownerMembership) {
            return NextResponse.json({ message: 'Trip not found' }, { status: 404 });
        }

        if (ownerMembership.role !== 'OWNER') {
            return NextResponse.json({ message: 'Only the owner can update this trip' }, { status: 403 });
        }

        const trip = await tripClient.update({
            where: { id },
            data: {
                title: String(title).trim(),
                destination: String(destination).trim() || verifiedPlace.name,
                destinationPlaceId: verifiedPlace.placeId,
                destinationLat: verifiedPlace.lat,
                destinationLng: verifiedPlace.lng,
                category: parsedCategory,
                description: typeof description === 'string' ? description.trim() || null : null,
                timeMode: parsedTimeMode as 'FIXED' | 'FLEXIBLE',
                startDate: parsedStartDate,
                endDate: parsedEndDate,
                planningStartDate: parsedPlanningStartDate,
                planningEndDate: parsedPlanningEndDate,
                plannedDurationDays: parsedPlannedDurationDays,
                participantMode: parsedParticipantMode as 'NONE' | 'FIXED' | 'RANGE',
                participantFixedCount: parsedParticipantFixedCount,
                participantMinCount: parsedParticipantMinCount,
                participantMaxCount: parsedParticipantMaxCount,
                coverImage: typeof coverImage === 'string' ? coverImage.trim() || null : null,
            },
            select: {
                id: true,
                title: true,
                destination: true,
                destinationPlaceId: true,
                category: true,
                description: true,
                timeMode: true,
                startDate: true,
                endDate: true,
                planningStartDate: true,
                planningEndDate: true,
                plannedDurationDays: true,
                participantMode: true,
                participantFixedCount: true,
                participantMinCount: true,
                participantMaxCount: true,
                coverImage: true,
            },
        });

        return NextResponse.json({ trip }, { status: 200 });
    } catch (error) {
        console.error('Update trip error:', error);
        return NextResponse.json({ message: 'Something went wrong while updating the trip' }, { status: 500 });
    }
}

export async function DELETE(_: Request, context: Context) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await context.params;

        const ownerMembership = await prisma.tripMember.findUnique({
            where: {
                tripId_userId: {
                    tripId: id,
                    userId,
                },
            },
        });

        if (!ownerMembership) {
            return NextResponse.json({ message: 'Trip not found' }, { status: 404 });
        }

        if (ownerMembership.role !== 'OWNER') {
            return NextResponse.json({ message: 'Only the owner can delete this trip' }, { status: 403 });
        }

        await prisma.trip.delete({
            where: {
                id,
            },
        });

        return NextResponse.json({ message: 'Trip deleted' }, { status: 200 });
    } catch (error) {
        console.error('Delete trip error:', error);
        return NextResponse.json({ message: 'Something went wrong while deleting the trip' }, { status: 500 });
    }
}
