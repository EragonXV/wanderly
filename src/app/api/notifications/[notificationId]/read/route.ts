import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { markNotificationRead } from '@/lib/notifications';

type Context = {
    params: Promise<{ notificationId: string }>;
};

export async function PATCH(_: Request, context: Context) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { notificationId } = await context.params;
        await markNotificationRead(notificationId, userId);

        return NextResponse.json({ message: 'Notification marked as read' }, { status: 200 });
    } catch (error) {
        console.error('Mark notification read error:', error);
        return NextResponse.json({ message: 'Something went wrong while marking notification as read' }, { status: 500 });
    }
}
