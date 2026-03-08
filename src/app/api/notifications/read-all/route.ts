import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { markAllNotificationsRead } from '@/lib/notifications';

export async function PATCH() {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await markAllNotificationsRead(userId);

        return NextResponse.json({ message: 'All notifications marked as read' }, { status: 200 });
    } catch (error) {
        console.error('Mark all notifications read error:', error);
        return NextResponse.json({ message: 'Something went wrong while marking notifications as read' }, { status: 500 });
    }
}
