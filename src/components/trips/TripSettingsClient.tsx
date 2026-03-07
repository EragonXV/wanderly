'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2 } from 'lucide-react';

const TRIP_CATEGORIES = ['Ausflug', 'Kurztrip', 'Urlaub', 'Workation', 'Sonstiges'] as const;

type PlaceSuggestion = {
    placeId: string;
    name: string;
    displayName: string;
    lat: number;
    lng: number;
};

type Props = {
    tripId: string;
    tripTitle: string;
    initialDestination: string;
    initialDestinationPlaceId: string | null;
    initialCategory: string;
    initialDescription: string | null;
    initialStartDate: string;
    initialEndDate: string;
    initialCoverImage: string | null;
};

export default function TripSettingsClient({
    tripId,
    tripTitle,
    initialDestination,
    initialDestinationPlaceId,
    initialCategory,
    initialDescription,
    initialStartDate,
    initialEndDate,
    initialCoverImage,
}: Props) {
    const router = useRouter();
    const [title, setTitle] = useState(tripTitle);
    const [destination, setDestination] = useState(initialDestination);
    const [destinationPlaceId, setDestinationPlaceId] = useState(initialDestinationPlaceId || '');
    const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
    const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
    const [placeError, setPlaceError] = useState('');
    const [category, setCategory] = useState(initialCategory);
    const [description, setDescription] = useState(initialDescription || '');
    const [startDate, setStartDate] = useState(initialStartDate);
    const [endDate, setEndDate] = useState(initialEndDate);
    const [coverImage, setCoverImage] = useState(initialCoverImage || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeletingTrip, setIsDeletingTrip] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (destinationPlaceId) {
            setPlaceSuggestions([]);
            setIsLoadingPlaces(false);
            return;
        }

        const query = destination.trim();
        if (query.length < 2) {
            setPlaceSuggestions([]);
            setIsLoadingPlaces(false);
            return;
        }

        const controller = new AbortController();
        const timeout = setTimeout(async () => {
            try {
                setIsLoadingPlaces(true);
                setPlaceError('');
                const response = await fetch(`/api/places/search?q=${encodeURIComponent(query)}`, {
                    signal: controller.signal,
                });
                const data = await response.json();
                if (!response.ok) {
                    setPlaceError(data.message || 'Could not load place suggestions.');
                    return;
                }
                setPlaceSuggestions(Array.isArray(data.places) ? data.places : []);
            } catch {
                if (!controller.signal.aborted) {
                    setPlaceError('Could not load place suggestions.');
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoadingPlaces(false);
                }
            }
        }, 250);

        return () => {
            controller.abort();
            clearTimeout(timeout);
        };
    }, [destination, destinationPlaceId]);

    const handleSaveTrip = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setPlaceError('');

        if (new Date(endDate) < new Date(startDate)) {
            setError('End date must be after start date.');
            return;
        }

        if (!destinationPlaceId) {
            setError('Please select a real place from suggestions.');
            return;
        }

        setIsSaving(true);

        try {
            const response = await fetch(`/api/trips/${tripId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title,
                    destination,
                    destinationPlaceId,
                    category,
                    description,
                    startDate,
                    endDate,
                    coverImage,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Could not update trip.');
                return;
            }

            setTitle(data.trip.title);
            setDestination(data.trip.destination);
            setDestinationPlaceId(data.trip.destinationPlaceId || '');
            setCategory(data.trip.category);
            setDescription(data.trip.description || '');
            setStartDate(String(data.trip.startDate).slice(0, 10));
            setEndDate(String(data.trip.endDate).slice(0, 10));
            setCoverImage(data.trip.coverImage || '');
            setSuccess('Trip settings saved.');
            router.refresh();
        } catch {
            setError('Could not update trip.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteTrip = async () => {
        const confirmed = window.confirm(`Delete "${tripTitle}" permanently? This cannot be undone.`);
        if (!confirmed) {
            return;
        }

        setError('');
        setSuccess('');
        setIsDeletingTrip(true);

        try {
            const response = await fetch(`/api/trips/${tripId}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Could not delete trip.');
                return;
            }

            router.push('/dashboard');
            router.refresh();
        } catch {
            setError('Could not delete trip.');
        } finally {
            setIsDeletingTrip(false);
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
                <h1 className="mt-4 text-3xl font-bold text-slate-900">Trip Settings</h1>
                <p className="mt-1 text-slate-500">Manage this trip.</p>
            </div>

            {error && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {success}
                </div>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Trip Properties</h2>
                <p className="mt-1 text-sm text-slate-500">Update name, description, timeframe, and image.</p>

                <form className="mt-5 space-y-5" onSubmit={handleSaveTrip}>
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-slate-700">
                            Name
                        </label>
                        <input
                            id="title"
                            required
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                    </div>

                    <div>
                        <label htmlFor="destination" className="block text-sm font-medium text-slate-700">
                            Destination
                        </label>
                        <input
                            id="destination"
                            required
                            type="text"
                            value={destination}
                            onChange={(e) => {
                                setDestination(e.target.value);
                                setDestinationPlaceId('');
                            }}
                            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                        {isLoadingPlaces && (
                            <p className="mt-1 text-xs text-slate-500">Searching places...</p>
                        )}
                        {placeError && (
                            <p className="mt-1 text-xs text-red-600">{placeError}</p>
                        )}
                        {placeSuggestions.length > 0 && (
                            <div className="mt-2 max-h-52 overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                                {placeSuggestions.map((place) => (
                                    <button
                                        key={place.placeId}
                                        type="button"
                                        onClick={() => {
                                            setDestination(place.name);
                                            setDestinationPlaceId(place.placeId);
                                            setPlaceSuggestions([]);
                                        }}
                                        className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 last:border-b-0"
                                    >
                                        <span className="font-medium text-slate-900">{place.name}</span>
                                        <span className="mt-0.5 block text-xs text-slate-500">{place.displayName}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        {!destinationPlaceId && destination.trim().length > 0 && !isLoadingPlaces && (
                            <p className="mt-1 text-xs text-amber-600">Please select a suggestion.</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-slate-700">
                            Description
                        </label>
                        <textarea
                            id="description"
                            rows={4}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            placeholder="Describe this trip..."
                        />
                    </div>

                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-slate-700">
                            Category
                        </label>
                        <select
                            id="category"
                            required
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        >
                            {TRIP_CATEGORIES.map((entry) => (
                                <option key={entry} value={entry}>
                                    {entry}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="start-date" className="block text-sm font-medium text-slate-700">
                                Start date
                            </label>
                            <input
                                id="start-date"
                                required
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                        </div>
                        <div>
                            <label htmlFor="end-date" className="block text-sm font-medium text-slate-700">
                                End date
                            </label>
                            <input
                                id="end-date"
                                required
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="cover-image" className="block text-sm font-medium text-slate-700">
                            Image URL
                        </label>
                        <input
                            id="cover-image"
                            type="text"
                            value={coverImage}
                            onChange={(e) => setCoverImage(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            placeholder="https://example.com/image.jpg"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSaving}
                        className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSaving ? 'Saving...' : 'Save changes'}
                    </button>
                </form>
            </section>

            <section className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6">
                <h2 className="text-lg font-semibold text-red-800">Danger Zone</h2>
                <p className="mt-1 text-sm text-red-700">
                    Deleting the trip permanently removes all associated members and data.
                </p>
                <button
                    type="button"
                    onClick={handleDeleteTrip}
                    disabled={isDeletingTrip}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                >
                    <Trash2 className="h-4 w-4" />
                    {isDeletingTrip ? 'Deleting trip...' : 'Delete trip'}
                </button>
            </section>
        </div>
    );
}
