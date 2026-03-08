import Link from 'next/link';
import { Calendar, MapPin, Users } from 'lucide-react';
import { format } from 'date-fns';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma/client';

const DEFAULT_COVER_IMAGE =
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=800&auto=format&fit=crop';

type ExplorePageProps = {
  searchParams: Promise<{
    q?: string;
    sort?: string;
  }>;
};

type SortKey = 'newest' | 'oldest' | 'start-soon' | 'most-members';

type ExploreTrip = {
  id: string;
  title: string;
  destination: string;
  category: string;
  timeMode: 'FIXED' | 'FLEXIBLE';
  startDate: Date;
  endDate: Date;
  planningStartDate: Date | null;
  planningEndDate: Date | null;
  plannedDurationDays: number | null;
  coverImage: string | null;
  _count: {
    members: number;
  };
};

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'start-soon', label: 'Start date (soonest)' },
  { value: 'most-members', label: 'Most collaborators' },
];

function resolveSort(sort: string | undefined): SortKey {
  if (sort === 'oldest' || sort === 'start-soon' || sort === 'most-members') {
    return sort;
  }
  return 'newest';
}

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const { q, sort } = await searchParams;
  const session = await getServerSession(authOptions);
  const query = q?.trim() || '';
  const sortKey = resolveSort(sort);

  const orderBy =
    sortKey === 'oldest'
      ? { createdAt: 'asc' as const }
      : sortKey === 'start-soon'
        ? { startDate: 'asc' as const }
        : sortKey === 'most-members'
          ? { members: { _count: 'desc' as const } }
          : { createdAt: 'desc' as const };

  const whereClause = query
    ? ({
        OR: [
          { title: { contains: query } },
          { destination: { contains: query } },
          { category: { contains: query } },
        ],
      } as unknown)
    : undefined;

  const trips = (await prisma.trip.findMany({
    where: whereClause as never,
    include: {
      _count: {
        select: {
          members: true,
        },
      },
    },
    orderBy,
  })) as unknown as ExploreTrip[];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Explore Trips</h1>
          <p className="text-slate-500 mt-1">Discover all trips created on Wanderly.</p>
        </div>
        {session?.user ? (
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors">
              Log in
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>

      <form className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_220px_auto]">
          <div>
            <label htmlFor="q" className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Search
            </label>
            <input
              id="q"
              name="q"
              defaultValue={query}
              placeholder="Search by trip title, destination, or category"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="sort" className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Sort by
            </label>
            <select
              id="sort"
              name="sort"
              defaultValue={sortKey}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Apply
            </button>
            {(query || sortKey !== 'newest') && (
              <Link
                href="/explore"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Reset
              </Link>
            )}
          </div>
        </div>
      </form>

      {trips.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <h2 className="text-lg font-semibold text-slate-800">No trips yet</h2>
          <p className="mt-2 text-sm text-slate-500">Be the first to create a trip.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <div key={trip.id} className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm h-full flex flex-col">
              <div className="h-48 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent z-10"></div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={trip.coverImage || DEFAULT_COVER_IMAGE}
                  alt={trip.destination}
                  className="w-full h-full object-cover"
                />
                <h3 className="absolute bottom-4 left-4 right-4 text-xl font-bold text-white z-20 truncate">
                  {trip.title}
                </h3>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {trip.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
                    <span className="text-sm truncate">{trip.destination}</span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="h-4 w-4 text-blue-500 shrink-0" />
                    <span className="text-sm">
                      {trip.timeMode === 'FLEXIBLE'
                        ? `Flexible: ${format(trip.planningStartDate || trip.startDate, 'MMM d')} - ${format(
                            trip.planningEndDate || trip.endDate,
                            'MMM d, yyyy'
                          )} (${trip.plannedDurationDays ?? 1} days)`
                        : `${format(trip.startDate, 'MMM d')} - ${format(trip.endDate, 'MMM d, yyyy')}`}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                    <Users className="h-4 w-4" />
                    <span>{trip._count.members} collaborators</span>
                  </div>
                  {session?.user ? (
                    <Link href={`/trip/${trip.id}`} className="text-blue-600 font-medium text-sm hover:underline">
                      Open trip &rarr;
                    </Link>
                  ) : (
                    <Link href="/login" className="text-blue-600 font-medium text-sm hover:underline">
                      Log in to open &rarr;
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
