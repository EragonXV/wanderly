'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, MapPin, Users, ArrowRight } from 'lucide-react';

export default function NewTripPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [destination, setDestination] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch('/api/trips', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title,
                    destination,
                    startDate,
                    endDate,
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
                                    onChange={(e) => setDestination(e.target.value)}
                                    className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                    <Calendar className="h-4 w-4 text-blue-500" />
                                    When?
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
