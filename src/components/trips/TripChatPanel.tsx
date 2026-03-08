'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';

type ChatMessage = {
    id: string;
    type: 'USER' | 'SYSTEM';
    content: string;
    createdAt: string;
    user: {
        id: string;
        name: string | null;
        email: string | null;
        image: string | null;
    } | null;
};

type Props = {
    tripId: string;
    currentUserId: string;
    initialMessages: ChatMessage[];
};

function formatTimestamp(value: string) {
    return new Intl.DateTimeFormat('de-DE', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

export default function TripChatPanel({ tripId, currentUserId, initialMessages }: Props) {
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
    const [content, setContent] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const listRef = useRef<HTMLDivElement | null>(null);

    const sortedMessages = useMemo(
        () => [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
        [messages]
    );

    const loadMessages = async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await fetch(`/api/trips/${tripId}/chat-messages`, { cache: 'no-store' });
            const data = await response.json();
            if (!response.ok) {
                setError(data.message || 'Chat konnte nicht geladen werden.');
                return;
            }
            setMessages(Array.isArray(data.messages) ? data.messages : []);
        } catch {
            setError('Chat konnte nicht geladen werden.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const interval = setInterval(() => {
            void loadMessages();
        }, 15000);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tripId]);

    useEffect(() => {
        if (!listRef.current) return;
        listRef.current.scrollTop = listRef.current.scrollHeight;
    }, [sortedMessages.length]);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        const trimmed = content.trim();
        if (!trimmed) {
            return;
        }

        setIsSending(true);
        setError('');

        try {
            const response = await fetch(`/api/trips/${tripId}/chat-messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content: trimmed }),
            });
            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Nachricht konnte nicht gesendet werden.');
                return;
            }

            if (data.message) {
                setMessages((prev) => [...prev, data.message as ChatMessage]);
            }
            setContent('');
        } catch {
            setError('Nachricht konnte nicht gesendet werden.');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-xl font-bold text-slate-800">Chat</h2>
                <p className="mt-1 text-sm text-slate-500">
                    Austausch zur Reise. Systemmeldungen erscheinen automatisch im Verlauf.
                </p>
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div
                ref={listRef}
                className="max-h-[60vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 space-y-3"
            >
                {isLoading && sortedMessages.length === 0 && (
                    <p className="text-sm text-slate-500">Lade Chat...</p>
                )}

                {!isLoading && sortedMessages.length === 0 && (
                    <p className="text-sm text-slate-500">Noch keine Nachrichten vorhanden.</p>
                )}

                {sortedMessages.map((message) => {
                    if (message.type === 'SYSTEM') {
                        return (
                            <div key={message.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">System</p>
                                <p className="mt-1 text-sm text-slate-700">{message.content}</p>
                                <p className="mt-1 text-[11px] text-slate-500">{formatTimestamp(message.createdAt)}</p>
                            </div>
                        );
                    }

                    const senderName = message.user?.name || message.user?.email || 'User';
                    const isOwn = message.user?.id === currentUserId;

                    return (
                        <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${isOwn ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-900'}`}>
                                <div className="mb-1 flex items-center gap-2">
                                    {!isOwn && (
                                        <UserAvatar
                                            name={senderName}
                                            image={message.user?.image ?? null}
                                            sizeClassName="h-5 w-5"
                                            textClassName="text-[10px]"
                                            className="ring-1 ring-slate-300"
                                        />
                                    )}
                                    <p className={`text-xs ${isOwn ? 'text-blue-100' : 'text-slate-600'}`}>{senderName}</p>
                                </div>
                                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                                <p className={`mt-1 text-[11px] ${isOwn ? 'text-blue-100' : 'text-slate-500'}`}>
                                    {formatTimestamp(message.createdAt)}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="flex items-end gap-2">
                    <textarea
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                        placeholder="Nachricht schreiben..."
                        className="min-h-[44px] max-h-36 w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                        type="submit"
                        disabled={isSending || !content.trim()}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="Nachricht senden"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </div>
            </form>
        </div>
    );
}
