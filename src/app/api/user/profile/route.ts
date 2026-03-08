import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma/client';
import { isValidCountryCode } from '@/lib/countries';

function isValidImageUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as {
      image?: string | null;
      name?: string;
      email?: string;
      birthDate?: string | null;
      country?: string | null;
      bio?: string | null;
    };
    const shouldUpdateImage = Object.prototype.hasOwnProperty.call(body, 'image');
    const shouldUpdateName = Object.prototype.hasOwnProperty.call(body, 'name');
    const shouldUpdateEmail = Object.prototype.hasOwnProperty.call(body, 'email');
    const shouldUpdateBirthDate = Object.prototype.hasOwnProperty.call(body, 'birthDate');
    const shouldUpdateCountry = Object.prototype.hasOwnProperty.call(body, 'country');
    const shouldUpdateBio = Object.prototype.hasOwnProperty.call(body, 'bio');
    const data: {
      image?: string | null;
      name?: string;
      email?: string;
      birthDate?: Date | null;
      country?: string | null;
      bio?: string | null;
    } = {};

    if (shouldUpdateImage) {
      const nextImageRaw = body.image;
      const nextImage = typeof nextImageRaw === 'string' ? nextImageRaw.trim() : null;

      if (nextImage && !isValidImageUrl(nextImage)) {
        return NextResponse.json(
          { message: 'Bitte eine gueltige Bild-URL (http/https) angeben.' },
          { status: 400 },
        );
      }

      let imageWithVersion: string | null = null;
      if (nextImage) {
        const parsed = new URL(nextImage);
        parsed.searchParams.set('v', Date.now().toString());
        imageWithVersion = parsed.toString();
      }
      data.image = imageWithVersion;
    }

    if (shouldUpdateName) {
      const nextName = typeof body.name === 'string' ? body.name.trim() : '';
      if (nextName.length < 2) {
        return NextResponse.json(
          { message: 'Der Name muss mindestens 2 Zeichen haben.' },
          { status: 400 },
        );
      }
      data.name = nextName;
    }

    if (shouldUpdateEmail) {
      const nextEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const hasBasicEmailShape = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail);
      if (!hasBasicEmailShape) {
        return NextResponse.json(
          { message: 'Bitte eine gueltige E-Mail-Adresse angeben.' },
          { status: 400 },
        );
      }
      data.email = nextEmail;
    }

    if (shouldUpdateBirthDate) {
      const nextBirthDateRaw = body.birthDate;
      const nextBirthDateValue = typeof nextBirthDateRaw === 'string' ? nextBirthDateRaw.trim() : '';
      if (!nextBirthDateValue) {
        data.birthDate = null;
      } else {
        const parsedDate = new Date(`${nextBirthDateValue}T00:00:00.000Z`);
        if (Number.isNaN(parsedDate.getTime())) {
          return NextResponse.json({ message: 'Bitte ein gueltiges Geburtsdatum angeben.' }, { status: 400 });
        }
        data.birthDate = parsedDate;
      }
    }

    if (shouldUpdateCountry) {
      const nextCountryRaw = typeof body.country === 'string' ? body.country.trim().toUpperCase() : '';
      if (nextCountryRaw && !isValidCountryCode(nextCountryRaw)) {
        return NextResponse.json({ message: 'Bitte ein gueltiges Heimatland aus der Liste waehlen.' }, { status: 400 });
      }
      data.country = nextCountryRaw || null;
    }

    if (shouldUpdateBio) {
      const nextBioRaw = typeof body.bio === 'string' ? body.bio.trim() : '';
      if (nextBioRaw.length > 500) {
        return NextResponse.json({ message: 'Die Beschreibung darf maximal 500 Zeichen haben.' }, { status: 400 });
      }
      data.bio = nextBioRaw || null;
    }

    if (!shouldUpdateImage && !shouldUpdateName && !shouldUpdateEmail && !shouldUpdateBirthDate && !shouldUpdateCountry && !shouldUpdateBio) {
      return NextResponse.json({ message: 'Keine aenderbaren Felder uebergeben.' }, { status: 400 });
    }

    let updatedUser: {
      name: string | null;
      email: string | null;
      image: string | null;
      birthDate: Date | null;
      country: string | null;
      bio: string | null;
    };
    try {
      updatedUser = await prisma.user.update({
        where: { id: userId },
        data,
        select: {
          name: true,
          email: true,
          image: true,
          birthDate: true,
          country: true,
          bio: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return NextResponse.json({ message: 'Diese E-Mail ist bereits vergeben.' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Failed to update user profile image:', error);
    return NextResponse.json({ message: 'Interner Serverfehler' }, { status: 500 });
  }
}
