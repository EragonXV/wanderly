'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Calendar, Mail, User, Globe, Cake, FileText } from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { COUNTRY_OPTIONS, getCountryLabel, isValidCountryCode } from '@/lib/countries';

type UserProfilePanelProps = {
  initialName: string | null;
  initialEmail: string | null;
  initialImage: string | null;
  initialBirthDate: string | null;
  initialCountry: string | null;
  initialBio: string | null;
  memberSinceLabel: string;
  tripCount: number;
};

function isValidImageUrl(value: string) {
  if (!value) {
    return true;
  }
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function UserProfilePanel({
  initialName,
  initialEmail,
  initialImage,
  initialBirthDate,
  initialCountry,
  initialBio,
  memberSinceLabel,
  tripCount,
}: UserProfilePanelProps) {
  const router = useRouter();
  const { update } = useSession();

  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [name, setName] = useState(initialName ?? '');
  const [email, setEmail] = useState(initialEmail ?? '');
  const [image, setImage] = useState(initialImage ?? '');
  const [birthDate, setBirthDate] = useState(initialBirthDate ?? '');
  const [country, setCountry] = useState(
    initialCountry && isValidCountryCode(initialCountry) ? initialCountry : ''
  );
  const [bio, setBio] = useState(initialBio ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const previewImage = useMemo(() => {
    const value = image.trim();
    return value.length > 0 ? value : null;
  }, [image]);

  const handleCancel = () => {
    setName(initialName ?? '');
    setEmail(initialEmail ?? '');
    setImage(initialImage ?? '');
    setBirthDate(initialBirthDate ?? '');
    setCountry(initialCountry && isValidCountryCode(initialCountry) ? initialCountry : '');
    setBio(initialBio ?? '');
    setError('');
    setSuccess('');
    setMode('view');
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const nextName = name.trim();
    const nextEmail = email.trim().toLowerCase();
    const nextImage = image.trim();
    const nextBirthDate = birthDate.trim();
    const nextCountry = country.trim().toUpperCase();
    const nextBio = bio.trim();

    if (nextName.length < 2) {
      setError('Der Name muss mindestens 2 Zeichen haben.');
      return;
    }
    if (!isValidEmail(nextEmail)) {
      setError('Bitte gib eine gueltige E-Mail-Adresse ein.');
      return;
    }
    if (!isValidImageUrl(nextImage)) {
      setError('Bitte gib eine gueltige Bild-URL (http/https) an.');
      return;
    }
    if (nextCountry && !isValidCountryCode(nextCountry)) {
      setError('Bitte waehle ein gueltiges Heimatland aus der Liste.');
      return;
    }
    if (nextBio.length > 500) {
      setError('Die Beschreibung darf maximal 500 Zeichen haben.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: nextName,
          email: nextEmail,
          image: nextImage || null,
          birthDate: nextBirthDate || null,
          country: nextCountry || null,
          bio: nextBio || null,
        }),
      });

      const data = (await response.json()) as {
        message?: string;
        user?: {
          name: string | null;
          email: string | null;
          image: string | null;
          birthDate: string | null;
          country: string | null;
          bio: string | null;
        };
      };

      if (!response.ok) {
        throw new Error(data.message || 'Profil konnte nicht gespeichert werden.');
      }

      const savedName = data.user?.name ?? nextName;
      const savedEmail = data.user?.email ?? nextEmail;
      const savedImage = data.user?.image ?? null;
      const savedBirthDate = data.user?.birthDate ? data.user.birthDate.slice(0, 10) : null;
      const savedCountry = data.user?.country ?? null;
      const savedBio = data.user?.bio ?? null;

      setName(savedName);
      setEmail(savedEmail);
      setImage(savedImage ?? '');
      setBirthDate(savedBirthDate ?? '');
      setCountry(savedCountry ?? '');
      setBio(savedBio ?? '');

      await update({
        user: {
          name: savedName,
          email: savedEmail,
          image: savedImage,
        },
      });

      router.refresh();
      setSuccess('Profil gespeichert.');
      setMode('view');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Profil konnte nicht gespeichert werden.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <UserAvatar
            name={name}
            image={previewImage}
            sizeClassName="h-14 w-14"
            textClassName="text-lg"
            className="ring-1 ring-slate-200"
          />
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Dein Profil</h1>
        </div>

        {mode === 'view' ? (
          <button
            type="button"
            onClick={() => {
              setError('');
              setSuccess('');
              setMode('edit');
            }}
            className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Bearbeiten
          </button>
        ) : null}
      </div>

      {mode === 'view' ? (
        <>
          {success ? (
            <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {success}
            </p>
          ) : null}
          <div className="mt-6 grid grid-cols-1 gap-4">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <User className="h-4 w-4 text-slate-500" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</p>
                <p className="text-sm font-medium text-slate-900">{name || 'Nicht gesetzt'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Mail className="h-4 w-4 text-slate-500" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">E-Mail</p>
                <p className="text-sm font-medium text-slate-900">{email || 'Nicht gesetzt'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Calendar className="h-4 w-4 text-slate-500" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mitglied seit</p>
                <p className="text-sm font-medium text-slate-900">{memberSinceLabel}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Cake className="h-4 w-4 text-slate-500" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Geburtstag</p>
                <p className="text-sm font-medium text-slate-900">{birthDate || 'Nicht gesetzt'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Globe className="h-4 w-4 text-slate-500" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Heimatland</p>
                <p className="text-sm font-medium text-slate-900">
                  {country ? getCountryLabel(country) : 'Nicht gesetzt'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <FileText className="h-4 w-4 text-slate-500 mt-0.5" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kurzbeschreibung</p>
                <p className="text-sm font-medium text-slate-900 whitespace-pre-wrap">
                  {bio || 'Nicht gesetzt'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <p className="text-sm font-medium text-blue-900">
              Trips mit Beteiligung: {tripCount}
            </p>
          </div>
        </>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={handleSave}>
          <div>
            <label htmlFor="profile-name" className="block text-sm font-medium text-slate-700">
              Name
            </label>
            <input
              id="profile-name"
              type="text"
              minLength={2}
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <div>
            <label htmlFor="profile-email" className="block text-sm font-medium text-slate-700">
              E-Mail
            </label>
            <input
              id="profile-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <div>
            <label htmlFor="profile-image-url" className="block text-sm font-medium text-slate-700">
              Profilbild-URL
            </label>
            <input
              id="profile-image-url"
              type="url"
              value={image}
              onChange={(event) => setImage(event.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <p className="mt-1 text-xs text-slate-500">
              Leer lassen fuer Standard-Avatar mit Initial.
            </p>
          </div>

          <div>
            <label htmlFor="profile-birthdate" className="block text-sm font-medium text-slate-700">
              Geburtstag
            </label>
            <input
              id="profile-birthdate"
              type="date"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
              className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <div>
            <label htmlFor="profile-country" className="block text-sm font-medium text-slate-700">
              Heimatland
            </label>
            <select
              id="profile-country"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="">Bitte waehlen</option>
              {COUNTRY_OPTIONS.map((entry) => (
                <option key={entry.code} value={entry.code}>
                  {entry.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="profile-bio" className="block text-sm font-medium text-slate-700">
              Kurzbeschreibung
            </label>
            <textarea
              id="profile-bio"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Erzaehle kurz etwas ueber dich..."
              className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <p className="mt-1 text-xs text-slate-500">{bio.length}/500</p>
          </div>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
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
              onClick={handleCancel}
              disabled={isSaving}
              className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
