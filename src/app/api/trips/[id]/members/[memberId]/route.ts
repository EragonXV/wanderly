import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma/client';

type Context = {
    params: Promise<{ id: string; memberId: string }>;
};

export async function DELETE(_: Request, context: Context) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id: tripId, memberId } = await context.params;

        const requesterMembership = await prisma.tripMember.findUnique({
            where: {
                tripId_userId: {
                    tripId,
                    userId,
                },
            },
        });

        if (!requesterMembership) {
            return NextResponse.json({ message: 'Trip not found' }, { status: 404 });
        }

        if (requesterMembership.role !== 'OWNER') {
            return NextResponse.json({ message: 'Only the owner can remove participants' }, { status: 403 });
        }

        if (memberId === userId) {
            return NextResponse.json({ message: 'Owner cannot remove themselves' }, { status: 400 });
        }

        const targetMembership = await prisma.tripMember.findUnique({
            where: {
                tripId_userId: {
                    tripId,
                    userId: memberId,
                },
            },
        });

        if (!targetMembership) {
            return NextResponse.json({ message: 'Participant not found' }, { status: 404 });
        }

        if (targetMembership.role === 'OWNER') {
            return NextResponse.json({ message: 'Cannot remove the owner' }, { status: 400 });
        }

        await prisma.tripMember.delete({
            where: {
                tripId_userId: {
                    tripId,
                    userId: memberId,
                },
            },
        });

        return NextResponse.json({ message: 'Participant removed' }, { status: 200 });
    } catch (error) {
        console.error('Remove participant error:', error);
        return NextResponse.json({ message: 'Something went wrong while removing participant' }, { status: 500 });
    }
}
