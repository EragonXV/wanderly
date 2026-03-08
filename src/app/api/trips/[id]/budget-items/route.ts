import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { authorizeTripMutation } from '@/lib/trips/apiAuthorization';
import { createTripSystemMessage } from '@/lib/trips/chatMessages';

type Context = {
    params: Promise<{ id: string }>;
};

type BudgetItemRecord = {
    id: string;
    tripId: string;
    title: string;
    category: string;
    pricingMode: 'PER_PERSON' | 'GROUP_TOTAL';
    peopleCount: number;
    estimatedCostCents: number;
    dayStart: number | null;
    dayEnd: number | null;
    notes: string | null;
};

type BudgetItemCreateInput = {
    tripId: string;
    title: string;
    category: string;
    pricingMode: 'PER_PERSON' | 'GROUP_TOTAL';
    peopleCount: number;
    estimatedCostCents: number;
    dayStart: number | null;
    dayEnd: number | null;
    notes: string | null;
};

const budgetItemClient = (prisma as unknown as {
    tripBudgetItem: {
        create: (args: { data: BudgetItemCreateInput }) => Promise<BudgetItemRecord>;
    };
}).tripBudgetItem;

const ALLOWED_CATEGORIES = new Set([
    'TRANSPORT',
    'ACCOMMODATION',
    'FOOD',
    'ACTIVITIES',
    'INSURANCE',
    'OTHER',
]);

const ALLOWED_PRICING_MODES = new Set(['PER_PERSON', 'GROUP_TOTAL']);

export async function POST(req: Request, context: Context) {
    try {
        const { id: tripId } = await context.params;
        const auth = await authorizeTripMutation(tripId, 'EDIT_BUDGET');
        if (!auth.ok) {
            return auth.response;
        }
        const { title, category, pricingMode, peopleCount, estimatedCost, dayStart, dayEnd, notes } = await req.json();

        const parsedTitle = typeof title === 'string' ? title.trim() : '';
        const parsedCategory = typeof category === 'string' ? category.trim().toUpperCase() : '';
        const parsedPricingMode = typeof pricingMode === 'string' ? pricingMode.trim().toUpperCase() : 'GROUP_TOTAL';
        const parsedPeopleCount = Number(peopleCount ?? 1);
        const parsedEstimatedCost = Number(estimatedCost);
        const parsedNotes = typeof notes === 'string' ? notes.trim() : '';

        if (!parsedTitle) {
            return NextResponse.json({ message: 'Title is required' }, { status: 400 });
        }

        if (!ALLOWED_CATEGORIES.has(parsedCategory)) {
            return NextResponse.json({ message: 'Invalid budget category' }, { status: 400 });
        }

        if (!ALLOWED_PRICING_MODES.has(parsedPricingMode)) {
            return NextResponse.json({ message: 'Invalid pricing mode' }, { status: 400 });
        }

        if (!Number.isInteger(parsedPeopleCount) || parsedPeopleCount < 1 || parsedPeopleCount > 1000) {
            return NextResponse.json({ message: 'People count must be between 1 and 1000' }, { status: 400 });
        }

        if (!Number.isFinite(parsedEstimatedCost) || parsedEstimatedCost <= 0) {
            return NextResponse.json({ message: 'Estimated cost must be greater than 0' }, { status: 400 });
        }

        const parsedDayStartRaw = dayStart === '' || dayStart == null ? null : Number(dayStart);
        const parsedDayEndRaw = dayEnd === '' || dayEnd == null ? null : Number(dayEnd);
        let parsedDayStart: number | null = null;
        let parsedDayEnd: number | null = null;

        if (parsedDayStartRaw !== null) {
            if (!Number.isInteger(parsedDayStartRaw) || parsedDayStartRaw < 1) {
                return NextResponse.json({ message: 'Day start must be a positive integer' }, { status: 400 });
            }
            parsedDayStart = parsedDayStartRaw;
            if (parsedDayEndRaw === null) {
                parsedDayEnd = parsedDayStartRaw;
            } else {
                if (!Number.isInteger(parsedDayEndRaw) || parsedDayEndRaw < parsedDayStartRaw) {
                    return NextResponse.json({ message: 'Day end must be greater than or equal to day start' }, { status: 400 });
                }
                parsedDayEnd = parsedDayEndRaw;
            }
        } else if (parsedDayEndRaw !== null) {
            return NextResponse.json({ message: 'Day start is required when day end is set' }, { status: 400 });
        }

        const trip = await prisma.trip.findUnique({
            where: { id: tripId },
            select: { timeMode: true, startDate: true, endDate: true, plannedDurationDays: true },
        });
        if (!trip) {
            return NextResponse.json({ message: 'Trip not found' }, { status: 404 });
        }

        const tripDays =
            trip.timeMode === 'FLEXIBLE'
                ? Math.max(1, trip.plannedDurationDays ?? 1)
                : Math.max(
                      1,
                      Math.floor((trip.endDate.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
                  );
        if (parsedDayStart !== null && parsedDayEnd !== null && (parsedDayStart > tripDays || parsedDayEnd > tripDays)) {
            return NextResponse.json(
                { message: `Assigned days must be within trip range 1-${tripDays}` },
                { status: 400 }
            );
        }

        const budgetItem = await budgetItemClient.create({
            data: {
                tripId,
                title: parsedTitle,
                category: parsedCategory,
                pricingMode: parsedPricingMode as 'PER_PERSON' | 'GROUP_TOTAL',
                peopleCount: parsedPeopleCount,
                estimatedCostCents: Math.round(parsedEstimatedCost * 100),
                dayStart: parsedDayStart,
                dayEnd: parsedDayEnd,
                notes: parsedNotes || null,
            },
        });

        await createTripSystemMessage(tripId, 'Es gab neue oder geänderte Budgetposten.');

        return NextResponse.json({ budgetItem }, { status: 201 });
    } catch (error) {
        console.error('Create budget item error:', error);
        return NextResponse.json(
            { message: 'Something went wrong while creating budget item' },
            { status: 500 }
        );
    }
}
