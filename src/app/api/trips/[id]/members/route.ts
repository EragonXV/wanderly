import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma/client';

type Context = {
    params: Promise<{ id: string }>;
};

export async function POST(req: Request, context: Context) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id: tripId } = await context.params;
        const { email } = await req.json();

        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

        if (!normalizedEmail) {
            return NextResponse.json({ message: 'Email is required' }, { status: 400 });
        }

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
            return NextResponse.json({ message: 'Only the owner can invite participants' }, { status: 403 });
        }

        const userToInvite = await prisma.user.findUnique({
            where: {
                email: normalizedEmail,
            },
            select: {
                id: true,
                name: true,
                email: true,
            },
        });

        if (!userToInvite) {
            return NextResponse.json({ message: 'No user found with this email' }, { status: 404 });
        }

        const existingMembership = await prisma.tripMember.findUnique({
            where: {
                tripId_userId: {
                    tripId,
                    userId: userToInvite.id,
                },
            },
        });

        if (existingMembership) {
            return NextResponse.json({ message: 'User is already a participant' }, { status: 409 });
        }

        await prisma.tripMember.create({
            data: {
                tripId,
                userId: userToInvite.id,
                role: 'MEMBER',
            },
        });

        return NextResponse.json(
            {
                message: 'Participant invited',
                member: {
                    userId: userToInvite.id,
                    role: 'MEMBER',
                    name: userToInvite.name || userToInvite.email || 'Unknown user',
                    email: userToInvite.email,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Invite participant error:', error);
        return NextResponse.json({ message: 'Something went wrong while inviting participant' }, { status: 500 });
    }
}
