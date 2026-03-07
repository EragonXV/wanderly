import Link from 'next/link';
import { Plus, MapPin, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma/client';

const DEFAULT_COVER_IMAGE =
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=800&auto=format&fit=crop';

export default async function Home() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    redirect('/login');
  }

  const trips = await prisma.trip.findMany({
    where: {
      members: {
        some: {
          userId,
        },
      },
    },
    include: {
      _count: {
        select: {
          members: true,
        },
      },
    },
    orderBy: {
      startDate: 'asc',
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Your Trips</h1>
          <p className="text-slate-500 mt-1">Manage and plan your upcoming adventures</p>
        </div>

        <Link
          href="/new"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
        >
          <Plus className="h-5 w-5" />
          Create New Trip
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trips.map((trip) => (
          <Link key={trip.id} href={`/trip/${trip.id}`} className="group">
            <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 h-full flex flex-col group-hover:-translate-y-1">
              <div className="h-48 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent z-10"></div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={trip.coverImage || DEFAULT_COVER_IMAGE}
                  alt={trip.destination}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <h3 className="absolute bottom-4 left-4 right-4 text-xl font-bold text-white z-20 truncate">
                  {trip.title}
                </h3>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
                    <span className="text-sm truncate">{trip.destination}</span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="h-4 w-4 text-blue-500 shrink-0" />
                    <span className="text-sm">
                      {format(trip.startDate, 'MMM d')} - {format(trip.endDate, 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                    <Users className="h-4 w-4" />
                    <span>{trip._count.members} collaborators</span>
                  </div>
                  <span className="text-blue-600 font-medium text-sm group-hover:underline">
                    View plan &rarr;
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}

        {trips.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <h2 className="text-lg font-semibold text-slate-800">No trips yet</h2>
            <p className="mt-2 text-sm text-slate-500">Create your first trip to start planning.</p>
          </div>
        )}

        {/* Empty State / Add New Card */}
        <Link href="/new" className="group">
          <div className="h-full min-h-[320px] rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-50 flex flex-col items-center justify-center p-6 transition-colors text-center group-hover:border-blue-300">
            <div className="h-14 w-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Plus className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Plan a new adventure</h3>
            <p className="text-sm text-slate-500 max-w-[200px]">Create a completely new trip and invite friends</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
