'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { UserAvatar } from '@/components/ui/UserAvatar';

type UserProfileImageFormProps = {
  name: string | null;
  currentImage: string | null;
};

export default function UserProfileImageForm({ name, currentImage }: UserProfileImageFormProps) {
  const router = useRouter();
  const { update } = useSession();
  const [imageInput, setImageInput] = useState(currentImage ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const previewImage = useMemo(() => {
    const value = imageInput.trim();
    return value.length > 0 ? value : null;
  }, [imageInput]);

  const validateImageUrl = (value: string) => {
    if (!value) {
      return true;
    }
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const saveImage = async (nextImage: string) => {
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      if (!validateImageUrl(nextImage)) {
        throw new Error('Bitte gib eine gueltige Bild-URL (http/https) an.');
      }

      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: nextImage.trim() || null,
        }),
      });

      const data = (await response.json()) as {
        message?: string;
        user?: { name: string | null; image: string | null };
      };

      if (!response.ok) {
        throw new Error(data.message || 'Profilbild konnte nicht gespeichert werden.');
      }

      await update({
        user: {
          name: data.user?.name ?? name ?? undefined,
          image: data.user?.image ?? null,
        },
      });
      router.refresh();
      setImageInput(data.user?.image ?? '');
      setSuccess('Profilbild gespeichert.');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Profilbild konnte nicht gespeichert werden.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await saveImage(imageInput);
  };

  const handleResetToDefault = async () => {
    await saveImage('');
  };

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-base font-semibold text-slate-900">Profilbild</h2>
      <p className="mt-1 text-sm text-slate-500">
        Standard ist dein Initial mit farbigem Hintergrund. Optional kannst du ein eigenes Bild per URL setzen.
      </p>

      <div className="mt-4 flex items-center gap-4">
        <UserAvatar
          name={name}
          image={previewImage}
          sizeClassName="h-14 w-14"
          textClassName="text-lg"
          className="ring-1 ring-slate-200"
        />
        <div>
          <p className="text-sm font-medium text-slate-800">{name || 'User'}</p>
          <p className="text-xs text-slate-500">Vorschau</p>
        </div>
      </div>

      <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="profile-image-url" className="block text-sm font-medium text-slate-700">
            Bild-URL
          </label>
          <input
            id="profile-image-url"
            type="url"
            value={imageInput}
            onChange={(event) => setImageInput(event.target.value)}
            placeholder="https://example.com/avatar.jpg"
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

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? 'Speichert...' : 'Speichern'}
          </button>
          <button
            type="button"
            onClick={handleResetToDefault}
            disabled={isSaving}
            className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Standard verwenden
          </button>
        </div>
      </form>
    </div>
  );
}
