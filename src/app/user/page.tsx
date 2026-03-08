import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma/client';
import UserProfilePanel from '@/components/user/UserProfilePanel';

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(value);
}

export default async function UserPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      image: true,
      birthDate: true,
      country: true,
      bio: true,
      createdAt: true,
      _count: {
        select: {
          tripMemberships: true,
        },
      },
    },
  });

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurueck zum Dashboard
      </Link>

      <UserProfilePanel
        initialName={user.name}
        initialEmail={user.email}
        initialImage={user.image}
        initialBirthDate={user.birthDate ? user.birthDate.toISOString().slice(0, 10) : null}
        initialCountry={user.country}
        initialBio={user.bio}
        memberSinceLabel={formatDate(user.createdAt)}
        tripCount={user._count.tripMemberships}
      />
    </div>
  );
}
