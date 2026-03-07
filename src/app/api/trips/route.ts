import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma/client';
import { lookupPlaceById } from '@/lib/places/nominatim';

const ALLOWED_TRIP_CATEGORIES = new Set([
  'Ausflug',
  'Kurztrip',
  'Urlaub',
  'Workation',
  'Sonstiges',
]);

const tripClient = (prisma as unknown as {
  trip: {
    create: (args: {
      data: {
        title: string;
        destination: string;
        destinationPlaceId: string;
        destinationLat: number;
        destinationLng: number;
        category: string;
        startDate: Date;
        endDate: Date;
        members: {
          create: {
            userId: string;
            role: 'OWNER';
          };
        };
      };
      select: { id: true };
    }) => Promise<{ id: string }>;
  };
}).trip;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { title, destination, destinationPlaceId, category, startDate, endDate } = await req.json();

    if (!title || !destination || !destinationPlaceId || !startDate || !endDate) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);

    if (Number.isNaN(parsedStartDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
      return NextResponse.json({ message: 'Invalid date format' }, { status: 400 });
    }

    if (parsedEndDate < parsedStartDate) {
      return NextResponse.json({ message: 'End date must be after start date' }, { status: 400 });
    }

    const parsedCategory = typeof category === 'string' ? category.trim() : 'Sonstiges';
    if (!ALLOWED_TRIP_CATEGORIES.has(parsedCategory)) {
      return NextResponse.json({ message: 'Invalid trip category' }, { status: 400 });
    }

    const verifiedPlace = await lookupPlaceById(String(destinationPlaceId));
    if (!verifiedPlace) {
      return NextResponse.json({ message: 'Please select a valid place from suggestions' }, { status: 400 });
    }

    const trip = await tripClient.create({
      data: {
        title: String(title).trim(),
        destination: String(destination).trim() || verifiedPlace.name,
        destinationPlaceId: verifiedPlace.placeId,
        destinationLat: verifiedPlace.lat,
        destinationLng: verifiedPlace.lng,
        category: parsedCategory,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        members: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
      },
      select: {
        id: true,
      },
    });

    return NextResponse.json({ trip }, { status: 201 });
  } catch (error) {
    console.error('Create trip error:', error);
    return NextResponse.json({ message: 'Something went wrong while creating the trip' }, { status: 500 });
  }
}
