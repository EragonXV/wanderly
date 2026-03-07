import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma/client';

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
    notes: string | null;
};

type BudgetItemCreateInput = {
    tripId: string;
    title: string;
    category: string;
    pricingMode: 'PER_PERSON' | 'GROUP_TOTAL';
    peopleCount: number;
    estimatedCostCents: number;
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
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id: tripId } = await context.params;
        const { title, category, pricingMode, peopleCount, estimatedCost, notes } = await req.json();

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
            return NextResponse.json({ message: 'Only the owner can edit budget' }, { status: 403 });
        }

        const budgetItem = await budgetItemClient.create({
            data: {
                tripId,
                title: parsedTitle,
                category: parsedCategory,
                pricingMode: parsedPricingMode as 'PER_PERSON' | 'GROUP_TOTAL',
                peopleCount: parsedPeopleCount,
                estimatedCostCents: Math.round(parsedEstimatedCost * 100),
                notes: parsedNotes || null,
            },
        });

        return NextResponse.json({ budgetItem }, { status: 201 });
    } catch (error) {
        console.error('Create budget item error:', error);
        return NextResponse.json(
            { message: 'Something went wrong while creating budget item' },
            { status: 500 }
        );
    }
}
