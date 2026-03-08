'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

type UserProfileNameFormProps = {
  initialName: string | null;
  currentImage: string | null;
  variant?: 'card' | 'embedded';
};

export default function UserProfileNameForm({
  initialName,
  currentImage,
  variant = 'card',
}: UserProfileNameFormProps) {
  const router = useRouter();
  const { update } = useSession();
  const [name, setName] = useState(initialName ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      const data = (await response.json()) as {
        message?: string;
        user?: { name: string | null; image: string | null };
      };

      if (!response.ok) {
        throw new Error(data.message || 'Name konnte nicht gespeichert werden.');
      }

      const nextName = data.user?.name ?? name.trim();
      setName(nextName);
      await update({
        user: {
          name: nextName,
          image: currentImage,
        },
      });
      router.refresh();
      setSuccess('Name gespeichert.');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Name konnte nicht gespeichert werden.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const isEmbedded = variant === 'embedded';

  return (
    <div className={isEmbedded ? 'w-full' : 'mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6'}>
      {!isEmbedded ? (
        <>
          <h2 className="text-base font-semibold text-slate-900">Name</h2>
          <p className="mt-1 text-sm text-slate-500">Passe deinen Anzeigenamen an.</p>
        </>
      ) : null}

      <form className={isEmbedded ? 'space-y-2' : 'mt-4 space-y-3'} onSubmit={handleSubmit}>
        <div>
          <label htmlFor="profile-name" className="block text-sm font-medium text-slate-700">
            Dein Name
          </label>
          <input
            id="profile-name"
            type="text"
            required
            minLength={2}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Max Mustermann"
            className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        {success ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {success}
          </p>
        ) : null}

        <div>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? 'Speichert...' : 'Speichern'}
          </button>
        </div>
      </form>
    </div>
  );
}
