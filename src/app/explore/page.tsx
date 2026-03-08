import Link from 'next/link';
import { Calendar, MapPin, Users, UserRoundPlus } from 'lucide-react';
import { format } from 'date-fns';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma/client';
import { UserAvatar } from '@/components/ui/UserAvatar';

const DEFAULT_COVER_IMAGE =
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=800&auto=format&fit=crop';

type ExplorePageProps = {
  searchParams: Promise<{
    q?: string;
    sort?: string;
    view?: string;
  }>;
};

type SortKey = 'newest' | 'oldest' | 'start-soon' | 'most-members';
type ViewMode = 'cards' | 'list';

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
  participantMode: 'NONE' | 'FIXED' | 'RANGE';
  participantFixedCount: number | null;
  participantMinCount: number | null;
  participantMaxCount: number | null;
  coverImage: string | null;
  members: {
    role: 'OWNER' | 'ADMIN' | 'MEMBER';
    user: {
      name: string | null;
      email: string | null;
      image: string | null;
    };
  }[];
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

function resolveView(view: string | undefined): ViewMode {
  if (view === 'list') {
    return 'list';
  }
  return 'cards';
}

function formatKnownPlannedParticipants(trip: ExploreTrip) {
  if (trip.participantMode === 'FIXED' && trip.participantFixedCount != null) {
    return String(trip.participantFixedCount);
  }
  if (
    trip.participantMode === 'RANGE'
    && trip.participantMinCount != null
    && trip.participantMaxCount != null
  ) {
    return `${trip.participantMinCount}-${trip.participantMaxCount}`;
  }
  return null;
}

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const { q, sort, view } = await searchParams;
  const session = await getServerSession(authOptions);
  const query = q?.trim() || '';
  const sortKey = resolveSort(sort);
  const viewMode = resolveView(view);

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
      members: {
        where: {
          role: 'OWNER',
        },
        select: {
          role: true,
          user: {
            select: {
              name: true,
              email: true,
              image: true,
            },
          },
        },
        take: 1,
      },
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
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
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

      <form className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
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
          <input type="hidden" name="view" value={viewMode} />
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Apply
            </button>
            {(query || sortKey !== 'newest') && (
              <Link
                href={`/explore?view=${viewMode}`}
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Reset
              </Link>
            )}
          </div>
        </div>
      </form>

      <div className="mb-6 inline-flex rounded-xl border border-slate-200 bg-white p-1">
        <Link
          href={`/explore?q=${encodeURIComponent(query)}&sort=${sortKey}&view=cards`}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'cards' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          Cards
        </Link>
        <Link
          href={`/explore?q=${encodeURIComponent(query)}&sort=${sortKey}&view=list`}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          List
        </Link>
      </div>

      {trips.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <h2 className="text-lg font-semibold text-slate-800">No trips found</h2>
          <p className="mt-2 text-sm text-slate-500">Try changing your filters or search query.</p>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => {
            const owner = trip.members[0];
            const ownerName = owner?.user.name || owner?.user.email || 'Unknown';
            const additionalMembersCount = Math.max(0, trip._count.members - 1);
            const knownPlannedParticipants = formatKnownPlannedParticipants(trip);

            return (
              <div key={trip.id} className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm h-full flex flex-col">
                <div className="h-48 overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent z-10" />
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
                  <div className="space-y-2.5 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {trip.category}
                        </span>
                        {knownPlannedParticipants && (
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 tabular-nums">
                            <UserRoundPlus className="mr-1 h-3.5 w-3.5" />
                            {knownPlannedParticipants}
                          </span>
                        )}
                      </div>
                      <div className="inline-flex max-w-[48%] items-center gap-1.5">
                        <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                          <UserAvatar
                            name={owner?.user.name}
                            image={owner?.user.image}
                            sizeClassName="h-5 w-5"
                            textClassName="text-[10px]"
                          />
                          <span className="truncate">{ownerName}</span>
                        </span>
                        {additionalMembersCount > 0 && (
                          <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 shrink-0">
                            +{additionalMembersCount}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-slate-600 text-sm">
                      <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
                      <span className="truncate">{trip.destination}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-600 text-sm">
                      <Calendar className="h-4 w-4 text-blue-500 shrink-0" />
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 shrink-0">
                          {trip.timeMode === 'FLEXIBLE' ? 'Flexible' : 'Fixed'}
                        </span>
                        <span className="truncate">
                          {trip.timeMode === 'FLEXIBLE'
                            ? `${format(trip.planningStartDate || trip.startDate, 'MMM d')} - ${format(
                                trip.planningEndDate || trip.endDate,
                                'MMM d, yyyy'
                              )} (${trip.plannedDurationDays ?? 1} days)`
                            : `${format(trip.startDate, 'MMM d')} - ${format(trip.endDate, 'MMM d, yyyy')}`}
                        </span>
                      </span>
                    </div>

                    <div className="pt-2 mt-1 border-t border-slate-100">
                      <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                        <Users className="h-4 w-4" />
                        {trip._count.members} collaborators
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    {session?.user ? (
                      <Link
                        href={`/trip/${trip.id}`}
                        className="inline-flex w-full items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        Trip öffnen
                      </Link>
                    ) : (
                      <Link
                        href="/login"
                        className="inline-flex w-full items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        Log in to open
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => {
            const owner = trip.members[0];
            const ownerName = owner?.user.name || owner?.user.email || 'Unknown';
            const additionalMembersCount = Math.max(0, trip._count.members - 1);
            const knownPlannedParticipants = formatKnownPlannedParticipants(trip);

            return (
              <div
                key={trip.id}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-3 sm:px-4"
              >
                <div className="flex items-start gap-3 md:grid md:grid-cols-[auto_minmax(0,1.1fr)_minmax(0,1.9fr)_auto] md:items-center md:gap-3">
                  <div className="hidden sm:block h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={trip.coverImage || DEFAULT_COVER_IMAGE}
                      alt={trip.destination}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1 md:min-w-0">
                    <p className="truncate text-base font-semibold text-slate-900">{trip.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {trip.category}
                      </span>
                      {knownPlannedParticipants && (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 tabular-nums">
                          <UserRoundPlus className="mr-1 h-3.5 w-3.5" />
                          {knownPlannedParticipants}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_220px] md:items-center md:gap-2 md:w-full">
                    <div className="min-w-0 space-y-1">
                      <span className="inline-flex w-full items-center justify-start gap-1.5 text-sm text-slate-600 min-w-0">
                        <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
                        <span className="truncate">{trip.destination}</span>
                      </span>
                      <span className="inline-flex w-full items-center justify-start gap-1.5 text-sm text-slate-600 min-w-0">
                        <Calendar className="h-4 w-4 text-blue-500 shrink-0" />
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 shrink-0">
                          {trip.timeMode === 'FLEXIBLE' ? 'Flexible' : 'Fixed'}
                        </span>
                        <span className="truncate">
                          {trip.timeMode === 'FLEXIBLE'
                            ? `${format(trip.planningStartDate || trip.startDate, 'MMM d')} - ${format(
                                trip.planningEndDate || trip.endDate,
                                'MMM d, yyyy'
                              )}`
                            : `${format(trip.startDate, 'MMM d')} - ${format(trip.endDate, 'MMM d, yyyy')}`}
                        </span>
                      </span>
                    </div>
                    <span className="inline-grid w-[220px] grid-cols-[180px_28px] items-center gap-2 text-xs font-medium text-slate-700 tabular-nums min-w-0 md:pr-2">
                      <span className="inline-flex max-w-[180px] items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 min-w-0 place-self-end">
                        <UserAvatar
                          name={owner?.user.name}
                          image={owner?.user.image}
                          sizeClassName="h-5 w-5"
                          textClassName="text-[10px]"
                        />
                        <span className="max-w-[140px] truncate">{ownerName}</span>
                      </span>
                      {additionalMembersCount > 0 ? (
                        <span className="inline-flex items-center justify-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 shrink-0">
                          +{additionalMembersCount}
                        </span>
                      ) : (
                        <span />
                      )}
                    </span>
                  </div>

                  <div className="hidden md:flex md:items-center md:gap-2 md:shrink-0">
                    {session?.user ? (
                      <Link
                        href={`/trip/${trip.id}`}
                        className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        Trip öffnen
                      </Link>
                    ) : (
                      <Link
                        href="/login"
                        className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        Log in
                      </Link>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 md:hidden">
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1.5 min-w-0">
                        <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
                        <span className="truncate">{trip.destination}</span>
                      </span>
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-blue-500 shrink-0" />
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 shrink-0">
                          {trip.timeMode === 'FLEXIBLE' ? 'Flexible' : 'Fixed'}
                        </span>
                        <span className="truncate">
                          {trip.timeMode === 'FLEXIBLE'
                            ? `${format(trip.planningStartDate || trip.startDate, 'MMM d')} - ${format(
                                trip.planningEndDate || trip.endDate,
                                'MMM d, yyyy'
                              )}`
                            : `${format(trip.startDate, 'MMM d')} - ${format(trip.endDate, 'MMM d, yyyy')}`}
                        </span>
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 sm:hidden">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-700 tabular-nums">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1">
                          <UserAvatar
                            name={owner?.user.name}
                            image={owner?.user.image}
                            sizeClassName="h-5 w-5"
                            textClassName="text-[10px]"
                          />
                          <span className="max-w-[140px] truncate">{ownerName}</span>
                        </span>
                        {additionalMembersCount > 0 && (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                            +{additionalMembersCount}
                          </span>
                        )}
                      </div>
                      {session?.user ? (
                        <Link
                          href={`/trip/${trip.id}`}
                          className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          Trip öffnen
                        </Link>
                      ) : (
                        <Link
                          href="/login"
                          className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          Log in
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
