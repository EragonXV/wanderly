'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserMinus } from 'lucide-react';

type Member = {
    userId: string;
    role: 'OWNER' | 'MEMBER';
    name: string;
    email: string | null;
};

type Props = {
    tripId: string;
    ownerId: string;
    members: Member[];
    canManage: boolean;
};

export default function TripParticipantsClient({ tripId, ownerId, members, canManage }: Props) {
    const router = useRouter();
    const [memberList, setMemberList] = useState<Member[]>(members);
    const [removingUserId, setRemovingUserId] = useState<string | null>(null);
    const [inviteEmail, setInviteEmail] = useState('');
    const [isInviting, setIsInviting] = useState(false);
    const [inviteSuccess, setInviteSuccess] = useState('');
    const [error, setError] = useState('');

    const removableMembers = useMemo(
        () => memberList.filter((member) => member.userId !== ownerId && member.role !== 'OWNER'),
        [memberList, ownerId]
    );

    const handleRemoveMember = async (targetUserId: string) => {
        const confirmed = window.confirm('Remove this participant from the trip?');
        if (!confirmed) {
            return;
        }

        setError('');
        setInviteSuccess('');
        setRemovingUserId(targetUserId);

        try {
            const response = await fetch(`/api/trips/${tripId}/members/${targetUserId}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Could not remove participant.');
                return;
            }

            setMemberList((prev) => prev.filter((member) => member.userId !== targetUserId));
            router.refresh();
        } catch {
            setError('Could not remove participant.');
        } finally {
            setRemovingUserId(null);
        }
    };

    const handleInviteMember = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setInviteSuccess('');
        setIsInviting(true);

        try {
            const response = await fetch(`/api/trips/${tripId}/members`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: inviteEmail,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Could not invite participant.');
                return;
            }

            setMemberList((prev) => [...prev, data.member as Member]);
            setInviteEmail('');
            setInviteSuccess('Participant added successfully.');
            router.refresh();
        } catch {
            setError('Could not invite participant.');
        } finally {
            setIsInviting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-8">
                <Link
                    href={`/trip/${tripId}`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to trip
                </Link>
                <h1 className="mt-4 text-3xl font-bold text-slate-900">Participant Management</h1>
                <p className="mt-1 text-slate-500">
                    {canManage ? 'Invite and remove trip participants.' : 'View trip participants.'}
                </p>
            </div>

            {error && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {inviteSuccess && (
                <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {inviteSuccess}
                </div>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Participants</h2>
                <p className="mt-1 text-sm text-slate-500">
                    {canManage
                        ? 'You can invite and remove members as trip owner.'
                        : 'Only the trip owner can invite or remove members.'}
                </p>

                {canManage && (
                    <form onSubmit={handleInviteMember} className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <label htmlFor="invite-email" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Invite by email
                        </label>
                        <div className="mt-2 flex flex-col sm:flex-row gap-2">
                            <input
                                id="invite-email"
                                type="email"
                                required
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="participant@example.com"
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                            <button
                                type="submit"
                                disabled={isInviting}
                                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                            >
                                {isInviting ? 'Inviting...' : 'Invite'}
                            </button>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                            The user must already have an account.
                        </p>
                    </form>
                )}

                <div className="mt-6 space-y-3">
                    {memberList.map((member) => (
                        <div
                            key={member.userId}
                            className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
                        >
                            <div>
                                <p className="text-sm font-semibold text-slate-900">
                                    {member.name}{' '}
                                    {member.userId === ownerId ? (
                                        <span className="ml-2 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                            Owner
                                        </span>
                                    ) : (
                                        <span className="ml-2 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                                            Member
                                        </span>
                                    )}
                                </p>
                                {member.email && <p className="text-xs text-slate-500">{member.email}</p>}
                            </div>

                            {canManage && member.userId !== ownerId && member.role !== 'OWNER' ? (
                                <button
                                    type="button"
                                    onClick={() => handleRemoveMember(member.userId)}
                                    disabled={removingUserId === member.userId}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                >
                                    <UserMinus className="h-3.5 w-3.5" />
                                    {removingUserId === member.userId ? 'Removing...' : 'Remove'}
                                </button>
                            ) : null}
                        </div>
                    ))}
                </div>

                {canManage && removableMembers.length === 0 && (
                    <p className="mt-4 text-sm text-slate-500">No removable participants.</p>
                )}
            </section>
        </div>
    );
}
