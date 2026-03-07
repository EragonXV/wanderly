export type PlaceSuggestion = {
    placeId: string;
    name: string;
    displayName: string;
    lat: number;
    lng: number;
};

type NominatimSearchResult = {
    osm_type: 'node' | 'way' | 'relation';
    osm_id: number;
    display_name: string;
    lat: string;
    lon: string;
    name?: string;
};

type NominatimLookupResult = NominatimSearchResult;

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

const toPlaceId = (osmType: 'node' | 'way' | 'relation', osmId: number) => {
    const prefix = osmType === 'node' ? 'N' : osmType === 'way' ? 'W' : 'R';
    return `${prefix}${osmId}`;
};

const parsePlaceId = (placeId: string): { osmType: 'node' | 'way' | 'relation'; osmId: number } | null => {
    if (!placeId || placeId.length < 2) {
        return null;
    }

    const prefix = placeId[0];
    const id = Number(placeId.slice(1));
    if (!Number.isInteger(id) || id <= 0) {
        return null;
    }

    if (prefix === 'N') {
        return { osmType: 'node', osmId: id };
    }
    if (prefix === 'W') {
        return { osmType: 'way', osmId: id };
    }
    if (prefix === 'R') {
        return { osmType: 'relation', osmId: id };
    }

    return null;
};

const getHeaders = () => ({
    Accept: 'application/json',
    // Nominatim usage policy requires a descriptive user-agent.
    'User-Agent': 'wanderly-app/1.0 (trip-planning)',
});

export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
        return [];
    }

    const url = new URL('/search', NOMINATIM_BASE_URL);
    url.searchParams.set('q', trimmedQuery);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '7');

    const response = await fetch(url.toString(), {
        headers: getHeaders(),
    });

    if (!response.ok) {
        throw new Error('Failed to search places');
    }

    const results = (await response.json()) as NominatimSearchResult[];

    return results
        .map((entry) => {
            const lat = Number(entry.lat);
            const lng = Number(entry.lon);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                return null;
            }

            return {
                placeId: toPlaceId(entry.osm_type, entry.osm_id),
                name: entry.name || entry.display_name.split(',')[0]?.trim() || entry.display_name,
                displayName: entry.display_name,
                lat,
                lng,
            } as PlaceSuggestion;
        })
        .filter((entry): entry is PlaceSuggestion => Boolean(entry));
}

export async function lookupPlaceById(placeId: string): Promise<PlaceSuggestion | null> {
    const parsed = parsePlaceId(placeId);
    if (!parsed) {
        return null;
    }

    const osmToken = `${parsed.osmType[0].toUpperCase()}${parsed.osmId}`;

    const url = new URL('/lookup', NOMINATIM_BASE_URL);
    url.searchParams.set('osm_ids', osmToken);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');

    const response = await fetch(url.toString(), {
        headers: getHeaders(),
    });

    if (!response.ok) {
        throw new Error('Failed to validate place');
    }

    const results = (await response.json()) as NominatimLookupResult[];
    const match = results[0];
    if (!match) {
        return null;
    }

    const lat = Number(match.lat);
    const lng = Number(match.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
    }

    return {
        placeId: toPlaceId(match.osm_type, match.osm_id),
        name: match.name || match.display_name.split(',')[0]?.trim() || match.display_name,
        displayName: match.display_name,
        lat,
        lng,
    };
}
