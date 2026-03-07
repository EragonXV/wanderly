import { NextResponse } from 'next/server';
import { searchPlaces } from '@/lib/places/nominatim';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const q = searchParams.get('q') || '';

        const places = await searchPlaces(q);
        return NextResponse.json({ places }, { status: 200 });
    } catch (error) {
        console.error('Place search error:', error);
        return NextResponse.json({ message: 'Could not search places' }, { status: 500 });
    }
}
