import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma/client';
import { getEffectiveInvitationStatus } from '@/lib/trips/invitationLifecycle';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || 20)));

        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: {
                id: true,
                type: true,
                title: true,
                message: true,
                link: true,
                isRead: true,
                createdAt: true,
                invitationId: true,
            },
        });

        const unreadCount = await prisma.notification.count({
            where: {
                userId,
                isRead: false,
            },
        });

        const invitationIds = notifications
            .map((item) => item.invitationId)
            .filter((value): value is string => Boolean(value));

        const invitations = invitationIds.length
            ? await prisma.tripInvitation.findMany({
                  where: { id: { in: invitationIds } },
                  select: {
                      id: true,
                      status: true,
                      expiresAt: true,
                  },
              })
            : [];

        const invitationById = new Map(
            invitations.map((invitation) => [
                invitation.id,
                getEffectiveInvitationStatus(invitation.status, invitation.expiresAt),
            ])
        );

        return NextResponse.json(
            {
                unreadCount,
                notifications: notifications.map((notification) => ({
                    ...notification,
                    invitationStatus: notification.invitationId
                        ? invitationById.get(notification.invitationId) ?? null
                        : null,
                })),
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Get notifications error:', error);
        return NextResponse.json({ message: 'Something went wrong while loading notifications' }, { status: 500 });
    }
}
