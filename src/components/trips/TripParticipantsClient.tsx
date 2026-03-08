'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserMinus } from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { getCountryLabel } from '@/lib/countries';

type Member = {
    userId: string;
    role: 'OWNER' | 'ADMIN' | 'MEMBER';
    name: string;
    email: string | null;
    image: string | null;
    age: number | null;
    country: string | null;
};

type Invitation = {
    id: string;
    userId: string;
    name: string;
    email: string | null;
    image: string | null;
    age: number | null;
    country: string | null;
    status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
    expiresAt: string;
    createdAt: string;
    invitedByName: string;
};

type Props = {
    tripId: string;
    currentUserId: string;
    ownerId: string;
    members: Member[];
    invitations: Invitation[];
    canManage: boolean;
    canManageRoles: boolean;
};

export default function TripParticipantsClient({
    tripId,
    currentUserId,
    ownerId,
    members,
    invitations,
    canManage,
    canManageRoles,
}: Props) {
    const router = useRouter();
    const [memberList, setMemberList] = useState<Member[]>(members);
    const [invitationList, setInvitationList] = useState<Invitation[]>(invitations);
    const [removingUserId, setRemovingUserId] = useState<string | null>(null);
    const [inviteEmail, setInviteEmail] = useState('');
    const [isInviting, setIsInviting] = useState(false);
    const [inviteSuccess, setInviteSuccess] = useState('');
    const [error, setError] = useState('');

    const removableMembers = useMemo(
        () => memberList.filter((member) => member.userId !== ownerId && member.role !== 'OWNER'),
        [memberList, ownerId]
    );

    const handleUpdateRole = async (targetUserId: string, role: 'ADMIN' | 'MEMBER') => {
        setError('');
        setInviteSuccess('');

        try {
            const response = await fetch(`/api/trips/${tripId}/members/${targetUserId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ role }),
            });

            const data = await response.json();
            if (!response.ok) {
                setError(data.message || 'Could not update role.');
                return;
            }

            setMemberList((prev) =>
                prev.map((member) =>
                    member.userId === targetUserId
                        ? {
                              ...member,
                              role: data.member.role as Member['role'],
                          }
                        : member
                )
            );
            setInviteSuccess('Role updated.');
            router.refresh();
        } catch {
            setError('Could not update role.');
        }
    };

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

            setInvitationList((prev) => [data.invitation as Invitation, ...prev]);
            setInviteEmail('');
            setInviteSuccess('Invitation sent successfully.');
            router.refresh();
        } catch {
            setError('Could not invite participant.');
        } finally {
            setIsInviting(false);
        }
    };

    const getInvitationStatusMeta = (status: Invitation['status']) => {
        if (status === 'PENDING') {
            return 'bg-amber-50 text-amber-700 border border-amber-200';
        }
        if (status === 'ACCEPTED') {
            return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
        }
        if (status === 'DECLINED') {
            return 'bg-rose-50 text-rose-700 border border-rose-200';
        }
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    };

    const formatDateTime = (value: string) =>
        new Intl.DateTimeFormat('de-DE', {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(new Date(value));

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
                        ? 'You can invite and remove members as owner/admin.'
                        : 'Only owner/admin can invite or remove members.'}
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
                            <div className="flex items-center gap-3">
                                <UserAvatar
                                    name={member.name}
                                    image={member.image}
                                    sizeClassName="h-9 w-9"
                                    textClassName="text-sm"
                                    className="ring-1 ring-slate-200"
                                />
                                <div>
                                <p className="text-sm font-semibold text-slate-900">
                                    {member.name}{' '}
                                    {member.userId === ownerId ? (
                                        <span className="ml-2 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                            Owner
                                        </span>
                                    ) : member.role === 'ADMIN' ? (
                                        <span className="ml-2 rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
                                            Admin
                                        </span>
                                    ) : (
                                        <span className="ml-2 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                                            Member
                                        </span>
                                    )}
                                </p>
                                {member.email && <p className="text-xs text-slate-500">{member.email}</p>}
                                <p className="text-xs text-slate-500">
                                    Alter: {member.age ?? 'nicht angegeben'}{' '}
                                    • Herkunftsland: {member.country ? getCountryLabel(member.country) : 'nicht angegeben'}
                                </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {canManageRoles && member.userId !== ownerId && member.role !== 'OWNER' && (
                                    <select
                                        value={member.role}
                                        onChange={(e) => handleUpdateRole(member.userId, e.target.value as 'ADMIN' | 'MEMBER')}
                                        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    >
                                        <option value="MEMBER">Member</option>
                                        <option value="ADMIN">Admin</option>
                                    </select>
                                )}
                                {canManage && member.userId !== ownerId && member.role !== 'OWNER' && member.userId !== currentUserId ? (
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
                        </div>
                    ))}
                </div>

                {canManage && removableMembers.length === 0 && (
                    <p className="mt-4 text-sm text-slate-500">No removable participants.</p>
                )}
            </section>

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Einladungen</h2>
                <p className="mt-1 text-sm text-slate-500">
                    Status von versendeten Einladungen.
                </p>

                {invitationList.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-500">Noch keine Einladungen vorhanden.</p>
                ) : (
                    <div className="mt-5 space-y-3">
                        {invitationList.map((invitation) => (
                            <div
                                key={invitation.id}
                                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
                            >
                                <div className="flex items-center gap-3">
                                    <UserAvatar
                                        name={invitation.name}
                                        image={invitation.image}
                                        sizeClassName="h-9 w-9"
                                        textClassName="text-sm"
                                        className="ring-1 ring-slate-200"
                                    />
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">{invitation.name}</p>
                                        {invitation.email && <p className="text-xs text-slate-500">{invitation.email}</p>}
                                        <p className="text-xs text-slate-500">
                                            Alter: {invitation.age ?? 'nicht angegeben'} • Herkunftsland:{' '}
                                            {invitation.country ? getCountryLabel(invitation.country) : 'nicht angegeben'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span
                                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${getInvitationStatusMeta(invitation.status)}`}
                                    >
                                        {invitation.status}
                                    </span>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Läuft ab: {formatDateTime(invitation.expiresAt)}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Von: {invitation.invitedByName} • Erstellt: {formatDateTime(invitation.createdAt)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
