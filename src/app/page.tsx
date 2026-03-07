import Link from 'next/link';
import { Plane, Users, CalendarDays, MapPin, ArrowRight } from 'lucide-react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/authOptions';

export default async function LandingPage() {
    const session = await getServerSession(authOptions);

    if (session?.user) {
        redirect('/dashboard');
    }

    return (
        <div className="bg-slate-50">
            {/* Hero Section */}
            <div className="relative overflow-hidden pt-16 pb-32 lg:pb-40">
                <div className="absolute top-0 left-1/2 -ml-[39rem] w-[163.125rem] max-w-none transform-gpu opacity-40 blur-3xl sm:-ml-[42.75rem]">
                    <div className="aspect-[1097/845] w-[68.5625rem] bg-gradient-to-tr from-[#ff4694] to-[#776fff] opacity-20" />
                </div>

                <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
                    <div className="mx-auto max-w-2xl text-center">
                        <div className="mb-8 flex justify-center">
                            <div className="relative rounded-full px-3 py-1 text-sm leading-6 text-slate-600 ring-1 ring-slate-900/10 hover:ring-slate-900/20 shadow-sm bg-white/50 backdrop-blur-sm">
                                Announcing the Wanderly MVP Phase.{' '}
                                <Link href="/register" className="font-semibold text-blue-600">
                                    <span className="absolute inset-0" aria-hidden="true" />
                                    Try it out <span aria-hidden="true">&rarr;</span>
                                </Link>
                            </div>
                        </div>

                        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl mb-6">
                            Plan your next <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">adventure</span>, together.
                        </h1>

                        <p className="mt-6 text-lg leading-8 text-slate-600">
                            Wanderly is the collaborative trip planner that brings your friends, itineraries, and budgets together in one beautiful place. No more messy spreadsheets.
                        </p>

                        <div className="mt-10 flex items-center justify-center gap-x-6">
                            <Link
                                href="/register"
                                className="rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 hover:shadow-md hover:-translate-y-0.5 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 flex items-center gap-2"
                            >
                                Start Planning for Free
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link href="/login" className="text-sm font-semibold leading-6 text-slate-900 hover:text-blue-600 transition-colors">
                                Sign in to your account <span aria-hidden="true">→</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Feature Section */}
            <div className="py-24 sm:py-32 bg-white relative z-20 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.05)]">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl lg:text-center mb-16">
                        <h2 className="text-base font-semibold leading-7 text-blue-600 uppercase tracking-wide">Everything you need</h2>
                        <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                            Travel planning made delightfully simple.
                        </p>
                    </div>

                    <div className="mx-auto max-w-2xl lg:max-w-none">
                        <div className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">

                            <div className="flex flex-col items-start bg-slate-50 p-8 rounded-3xl border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                                <div className="rounded-xl bg-blue-100 p-3 mb-6">
                                    <CalendarDays className="h-6 w-6 text-blue-600" aria-hidden="true" />
                                </div>
                                <h3 className="text-xl font-semibold leading-7 text-slate-900 mb-3">Sync Your Itinerary</h3>
                                <p className="text-base leading-7 text-slate-600 flex-auto">
                                    Build a timeline of your trip day-by-day. Add flights, hotels, and activities so everyone knows exactly what's happening and when.
                                </p>
                            </div>

                            <div className="flex flex-col items-start bg-slate-50 p-8 rounded-3xl border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                                <div className="rounded-xl bg-green-100 p-3 mb-6">
                                    <Users className="h-6 w-6 text-green-600" aria-hidden="true" />
                                </div>
                                <h3 className="text-xl font-semibold leading-7 text-slate-900 mb-3">Collaborate in Real-time</h3>
                                <p className="text-base leading-7 text-slate-600 flex-auto">
                                    Invite your friends to the trip. Everyone can add suggestions, vote on activities, and leave comments on the plans.
                                </p>
                            </div>

                            <div className="flex flex-col items-start bg-slate-50 p-8 rounded-3xl border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                                <div className="rounded-xl bg-amber-100 p-3 mb-6">
                                    <MapPin className="h-6 w-6 text-amber-600" aria-hidden="true" />
                                </div>
                                <h3 className="text-xl font-semibold leading-7 text-slate-900 mb-3">Store Your Places</h3>
                                <p className="text-base leading-7 text-slate-600 flex-auto">
                                    Keep all your must-see spots, restaurant recommendations, and accommodation links organized on one central map.
                                </p>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
