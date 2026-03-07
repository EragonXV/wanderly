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
                startDate: Date;
                endDate: Date;
                coverImage: string | null;
            };
            select: {
                id: true;
                title: true;
                destination: true;
                destinationPlaceId: true;
                category: true;
                description: true;
                startDate: true;
                endDate: true;
                coverImage: true;
            };
        }) => Promise<{
            id: string;
            title: string;
            destination: string;
            destinationPlaceId: string | null;
            category: string;
            description: string | null;
            startDate: Date;
            endDate: Date;
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
        const { title, destination, destinationPlaceId, category, description, startDate, endDate, coverImage } =
            await req.json();

        if (!title || !destination || !destinationPlaceId || !startDate || !endDate) {
            return NextResponse.json(
                { message: 'Title, destination, start date, and end date are required' },
                { status: 400 }
            );
        }

        const parsedStartDate = new Date(startDate);
        const parsedEndDate = new Date(endDate);

        if (Number.isNaN(parsedStartDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
            return NextResponse.json({ message: 'Invalid date format' }, { status: 400 });
        }

        if (parsedEndDate < parsedStartDate) {
            return NextResponse.json({ message: 'End date must be after start date' }, { status: 400 });
        }

        const parsedCategory = typeof category === 'string' ? category.trim() : '';
        if (!ALLOWED_TRIP_CATEGORIES.has(parsedCategory)) {
            return NextResponse.json({ message: 'Invalid trip category' }, { status: 400 });
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
                startDate: parsedStartDate,
                endDate: parsedEndDate,
                coverImage: typeof coverImage === 'string' ? coverImage.trim() || null : null,
            },
            select: {
                id: true,
                title: true,
                destination: true,
                destinationPlaceId: true,
                category: true,
                description: true,
                startDate: true,
                endDate: true,
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
