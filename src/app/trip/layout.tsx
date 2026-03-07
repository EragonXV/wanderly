'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function TripLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session, status } = useSession();
    const isLoading = status === 'loading';
    const router = useRouter();

    // In a real app, you would also check if the user has access to this specific trip ID
    useEffect(() => {
        if (!isLoading && !session?.user) {
            router.push('/login');
        }
    }, [session, isLoading, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!session?.user) {
        return null;
    }

    return <>{children}</>;
}
