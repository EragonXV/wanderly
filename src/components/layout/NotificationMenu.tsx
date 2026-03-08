'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';

type NotificationItem = {
    id: string;
    type:
        | 'INVITATION_RECEIVED'
        | 'INVITATION_ACCEPTED'
        | 'INVITATION_DECLINED'
        | 'TRIP_UPDATED'
        | 'ITINERARY_UPDATED'
        | 'BUDGET_UPDATED'
        | 'PARTICIPANTS_UPDATED'
        | 'ROLE_UPDATED';
    title: string;
    message: string;
    link: string | null;
    isRead: boolean;
    createdAt: string;
    invitationId: string | null;
    invitationStatus: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | null;
};

function formatRelativeDate(value: string) {
    const inputDate = new Date(value);
    const now = new Date();
    const diffMs = now.getTime() - inputDate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return 'gerade eben';
    if (diffMinutes < 60) return `vor ${diffMinutes} Min.`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `vor ${diffHours} Std.`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `vor ${diffDays} Tagen`;

    return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(inputDate);
}

export function NotificationMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const menuRef = useRef<HTMLDivElement | null>(null);

    const hasUnread = unreadCount > 0;

    const loadNotifications = async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await fetch('/api/notifications?limit=20', { cache: 'no-store' });
            const data = await response.json();
            if (!response.ok) {
                setError(data.message || 'Benachrichtigungen konnten nicht geladen werden.');
                return;
            }
            setItems((data.notifications as NotificationItem[]) ?? []);
            setUnreadCount(Number(data.unreadCount ?? 0));
        } catch {
            setError('Benachrichtigungen konnten nicht geladen werden.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadNotifications();
        const interval = setInterval(() => {
            void loadNotifications();
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const onClickOutside = (event: MouseEvent) => {
            if (!menuRef.current) return;
            if (!menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    const visibleItems = useMemo(() => items.slice(0, 12), [items]);

    const markAsRead = async (id: string) => {
        await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
        setItems((prev) => prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
        setUnreadCount((prev) => Math.max(0, prev - 1));
    };

    const markAllRead = async () => {
        await fetch('/api/notifications/read-all', { method: 'PATCH' });
        setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
        setUnreadCount(0);
    };

    const handleInvitationAction = async (
        notification: NotificationItem,
        action: 'accept' | 'decline'
    ) => {
        if (!notification.invitationId) {
            return;
        }

        const response = await fetch(`/api/trips/invitations/${notification.invitationId}/${action}`, {
            method: 'POST',
        });

        if (response.ok) {
            await markAsRead(notification.id);
            await loadNotifications();
        }
    };

    return (
        <div ref={menuRef} className="relative">
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                aria-label="Benachrichtigungen öffnen"
            >
                <Bell className="h-4 w-4" />
                {hasUnread && (
                    <span className="absolute -right-0.5 -top-0.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 z-50 mt-2 w-[360px] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                    <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900">Benachrichtigungen</p>
                        <button
                            type="button"
                            onClick={() => void markAllRead()}
                            className="text-xs font-medium text-blue-600 hover:text-blue-700"
                        >
                            Alle gelesen
                        </button>
                    </div>

                    {isLoading && <p className="px-1 py-3 text-sm text-slate-500">Lädt...</p>}
                    {!isLoading && error && <p className="px-1 py-3 text-sm text-red-600">{error}</p>}
                    {!isLoading && !error && visibleItems.length === 0 && (
                        <p className="px-1 py-3 text-sm text-slate-500">Keine Benachrichtigungen.</p>
                    )}

                    {!isLoading && !error && visibleItems.length > 0 && (
                        <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                            {visibleItems.map((item) => (
                                <div
                                    key={item.id}
                                    className={`rounded-xl border px-3 py-2 ${
                                        item.isRead ? 'border-slate-200 bg-slate-50/50' : 'border-blue-100 bg-blue-50/50'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                                            <p className="text-xs text-slate-600">{item.message}</p>
                                        </div>
                                        {!item.isRead && (
                                            <button
                                                type="button"
                                                onClick={() => void markAsRead(item.id)}
                                                className="shrink-0 text-[11px] font-medium text-blue-600 hover:text-blue-700"
                                            >
                                                Gelesen
                                            </button>
                                        )}
                                    </div>
                                    <div className="mt-2 flex items-center justify-between gap-2">
                                        <p className="text-[11px] text-slate-500">{formatRelativeDate(item.createdAt)}</p>
                                        {item.link && (
                                            <Link
                                                href={item.link}
                                                className="text-[11px] font-medium text-slate-600 hover:text-slate-900"
                                                onClick={() => {
                                                    if (!item.isRead) {
                                                        void markAsRead(item.id);
                                                    }
                                                    setIsOpen(false);
                                                }}
                                            >
                                                Öffnen
                                            </Link>
                                        )}
                                    </div>
                                    {item.type === 'INVITATION_RECEIVED' && item.invitationId && item.invitationStatus === 'PENDING' && (
                                        <div className="mt-2 flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => void handleInvitationAction(item, 'accept')}
                                                className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                                            >
                                                Annehmen
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void handleInvitationAction(item, 'decline')}
                                                className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                            >
                                                Ablehnen
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
