import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma/client';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { title, destination, startDate, endDate } = await req.json();

    if (!title || !destination || !startDate || !endDate) {
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

    const trip = await prisma.trip.create({
      data: {
        title: String(title).trim(),
        destination: String(destination).trim(),
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
