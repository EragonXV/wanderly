'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, MapPin, Users, ArrowRight } from 'lucide-react';

const TRIP_CATEGORIES = ['Ausflug', 'Kurztrip', 'Urlaub', 'Workation', 'Sonstiges'] as const;
const TRIP_TIME_MODES = [
    { value: 'FIXED', label: 'Fixed Time' },
    { value: 'FLEXIBLE', label: 'Flexible Time' },
] as const;
const TRIP_PARTICIPANT_MODES = [
    { value: 'NONE', label: 'No estimate' },
    { value: 'FIXED', label: 'Fixed number' },
    { value: 'RANGE', label: 'Range' },
] as const;

type PlaceSuggestion = {
    placeId: string;
    name: string;
    displayName: string;
    lat: number;
    lng: number;
};

export default function NewTripPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [destination, setDestination] = useState('');
    const [destinationPlaceId, setDestinationPlaceId] = useState('');
    const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
    const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
    const [placeError, setPlaceError] = useState<string | null>(null);
    const [category, setCategory] = useState<(typeof TRIP_CATEGORIES)[number]>('Sonstiges');
    const [description, setDescription] = useState('');
    const [coverImage, setCoverImage] = useState('');
    const [timeMode, setTimeMode] = useState<(typeof TRIP_TIME_MODES)[number]['value']>('FIXED');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [planningStartDate, setPlanningStartDate] = useState('');
    const [planningEndDate, setPlanningEndDate] = useState('');
    const [plannedDurationDays, setPlannedDurationDays] = useState('');
    const [participantMode, setParticipantMode] = useState<(typeof TRIP_PARTICIPANT_MODES)[number]['value']>('NONE');
    const [participantFixedCount, setParticipantFixedCount] = useState('');
    const [participantMinCount, setParticipantMinCount] = useState('');
    const [participantMaxCount, setParticipantMaxCount] = useState('');

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
                setPlaceError(null);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        if (!destinationPlaceId) {
            setError('Bitte wähle einen realen Ort aus den Vorschlägen aus.');
            setIsSubmitting(false);
            return;
        }

        if (timeMode === 'FIXED') {
            if (!startDate || !endDate) {
                setError('Bitte Start- und Enddatum angeben.');
                setIsSubmitting(false);
                return;
            }
            if (new Date(endDate) < new Date(startDate)) {
                setError('End date must be after start date.');
                setIsSubmitting(false);
                return;
            }
        } else {
            const parsedDuration = Number(plannedDurationDays);
            if (!planningStartDate || !planningEndDate || !Number.isInteger(parsedDuration) || parsedDuration < 1) {
                setError('Bitte Planungszeitraum und geplante Reisedauer angeben.');
                setIsSubmitting(false);
                return;
            }
            if (new Date(planningEndDate) < new Date(planningStartDate)) {
                setError('Planning period end must be after start.');
                setIsSubmitting(false);
                return;
            }
        }

        if (participantMode === 'FIXED') {
            const parsedFixed = Number(participantFixedCount);
            if (!Number.isInteger(parsedFixed) || parsedFixed < 1) {
                setError('Bitte eine gültige fixe Teilnehmerzahl angeben.');
                setIsSubmitting(false);
                return;
            }
        }
        if (participantMode === 'RANGE') {
            const parsedMin = Number(participantMinCount);
            const parsedMax = Number(participantMaxCount);
            if (!Number.isInteger(parsedMin) || !Number.isInteger(parsedMax) || parsedMin < 1 || parsedMax < parsedMin) {
                setError('Bitte eine gültige Teilnehmer-Range angeben.');
                setIsSubmitting(false);
                return;
            }
        }

        try {
            const response = await fetch('/api/trips', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title,
                    destination,
                    destinationPlaceId,
                    category,
                    description,
                    coverImage,
                    timeMode,
                    startDate,
                    endDate,
                    planningStartDate,
                    planningEndDate,
                    plannedDurationDays,
                    participantMode,
                    participantFixedCount,
                    participantMinCount,
                    participantMaxCount,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Could not create trip.');
                return;
            }

            router.push(`/trip/${data.trip.id}`);
        } catch {
            setError('Could not create trip. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="mb-10 text-center">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Plan a New Adventure</h1>
                <p className="text-slate-500 mt-2 max-w-xl mx-auto">
                    Set up the basics for your trip. You can always change these details later and invite friends to collaborate.
                </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-blue-500 to-cyan-400"></div>

                <form onSubmit={handleSubmit} className="p-8 sm:p-10 -mt-10">
                    <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-slate-100 flex gap-6 flex-col sm:flex-row">
                        <div className="flex-1 space-y-2 text-center sm:text-left">
                            <label htmlFor="title" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Trip Name
                            </label>
                            <input
                                id="title"
                                required
                                type="text"
                                placeholder="e.g. Summer in Kyoto"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full text-2xl font-bold text-slate-900 border-0 border-b-2 border-transparent hover:border-slate-200 focus:border-blue-500 focus:ring-0 px-0 py-2 transition-colors placeholder:text-slate-300 bg-transparent"
                            />
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label htmlFor="destination" className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                    <MapPin className="h-4 w-4 text-blue-500" />
                                    Where to?
                                </label>
                                <input
                                    id="destination"
                                    required
                                    type="text"
                                    placeholder="City, Country, or Region"
                                    value={destination}
                                    onChange={(e) => {
                                        setDestination(e.target.value);
                                        setDestinationPlaceId('');
                                    }}
                                    className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                                />
                                {isLoadingPlaces && (
                                    <p className="text-xs text-slate-500">Searching places...</p>
                                )}
                                {placeError && (
                                    <p className="text-xs text-red-600">{placeError}</p>
                                )}
                                {placeSuggestions.length > 0 && (
                                    <div className="max-h-52 overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
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
                                    <p className="text-xs text-amber-600">Bitte einen Vorschlag auswählen.</p>
                                )}
                            </div>

                            <div className="space-y-3">
                                <label htmlFor="category" className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                    Category
                                </label>
                                <select
                                    id="category"
                                    required
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value as (typeof TRIP_CATEGORIES)[number])}
                                    className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                                >
                                    {TRIP_CATEGORIES.map((entry) => (
                                        <option key={entry} value={entry}>
                                            {entry}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-3 sm:col-span-2">
                                <label htmlFor="description" className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                    Description
                                </label>
                                <textarea
                                    id="description"
                                    rows={3}
                                    placeholder="What is this trip about?"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                                />
                            </div>

                            <div className="space-y-3 sm:col-span-2">
                                <label htmlFor="coverImage" className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                    Cover Image URL
                                </label>
                                <input
                                    id="coverImage"
                                    type="url"
                                    placeholder="https://example.com/trip-cover.jpg"
                                    value={coverImage}
                                    onChange={(e) => setCoverImage(e.target.value)}
                                    className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                                />
                            </div>

                            <div className="space-y-3 sm:col-span-2">
                                <label htmlFor="timeMode" className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                    <Calendar className="h-4 w-4 text-blue-500" />
                                    Time mode
                                </label>
                                <select
                                    id="timeMode"
                                    required
                                    value={timeMode}
                                    onChange={(e) => setTimeMode(e.target.value as (typeof TRIP_TIME_MODES)[number]['value'])}
                                    className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                                >
                                    {TRIP_TIME_MODES.map((entry) => (
                                        <option key={entry.value} value={entry.value}>
                                            {entry.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {timeMode === 'FIXED' ? (
                                <div className="space-y-3 sm:col-span-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                    <Calendar className="h-4 w-4 text-blue-500" />
                                    Exact travel dates
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="date"
                                        required
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                                    />
                                    <span className="text-slate-400">to</span>
                                    <input
                                        type="date"
                                        required
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                                    />
                                </div>
                            </div>
                            ) : (
                                <>
                                    <div className="space-y-3">
                                        <label htmlFor="planningStartDate" className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                            Planning window start
                                        </label>
                                        <input
                                            id="planningStartDate"
                                            type="date"
                                            required
                                            value={planningStartDate}
                                            onChange={(e) => setPlanningStartDate(e.target.value)}
                                            className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label htmlFor="planningEndDate" className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                            Planning window end
                                        </label>
                                        <input
                                            id="planningEndDate"
                                            type="date"
                                            required
                                            value={planningEndDate}
                                            onChange={(e) => setPlanningEndDate(e.target.value)}
                                            className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                                        />
                                    </div>
                                    <div className="space-y-3 sm:col-span-2">
                                        <label htmlFor="plannedDurationDays" className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                            Planned travel duration (days)
                                        </label>
                                        <input
                                            id="plannedDurationDays"
                                            type="number"
                                            min={1}
                                            required
                                            value={plannedDurationDays}
                                            onChange={(e) => setPlannedDurationDays(e.target.value)}
                                            className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                                        />
                                    </div>
                                </>
                            )}

                            <div className="space-y-3 sm:col-span-2">
                                <label htmlFor="participantMode" className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                    Planned participants
                                </label>
                                <select
                                    id="participantMode"
                                    value={participantMode}
                                    onChange={(e) => setParticipantMode(e.target.value as (typeof TRIP_PARTICIPANT_MODES)[number]['value'])}
                                    className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                                >
                                    {TRIP_PARTICIPANT_MODES.map((entry) => (
                                        <option key={entry.value} value={entry.value}>
                                            {entry.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {participantMode === 'FIXED' && (
                                <div className="space-y-3 sm:col-span-2">
                                    <label htmlFor="participantFixedCount" className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                        Number of participants
                                    </label>
                                    <input
                                        id="participantFixedCount"
                                        type="number"
                                        min={1}
                                        required
                                        value={participantFixedCount}
                                        onChange={(e) => setParticipantFixedCount(e.target.value)}
                                        className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                                    />
                                </div>
                            )}

                            {participantMode === 'RANGE' && (
                                <>
                                    <div className="space-y-3">
                                        <label htmlFor="participantMinCount" className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                            Min participants
                                        </label>
                                        <input
                                            id="participantMinCount"
                                            type="number"
                                            min={1}
                                            required
                                            value={participantMinCount}
                                            onChange={(e) => setParticipantMinCount(e.target.value)}
                                            className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label htmlFor="participantMaxCount" className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                            Max participants
                                        </label>
                                        <input
                                            id="participantMaxCount"
                                            type="number"
                                            min={1}
                                            required
                                            value={participantMaxCount}
                                            onChange={(e) => setParticipantMaxCount(e.target.value)}
                                            className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="space-y-3">
                            <label htmlFor="invites" className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                <Users className="h-4 w-4 text-blue-500" />
                                Invite Friends (Optional)
                            </label>
                            <input
                                id="invites"
                                type="text"
                                placeholder="Enter email addresses separated by commas"
                                className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                            />
                            <p className="text-xs text-slate-500">You can also share a link later once the trip is created.</p>
                        </div>

                        <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                            {error && (
                                <p className="mr-auto text-sm text-red-600">{error}</p>
                            )}
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="px-6 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                                {isSubmitting ? 'Creating...' : 'Create Trip'}
                                {!isSubmitting && <ArrowRight className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
