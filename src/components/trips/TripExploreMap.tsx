'use client';

import { useEffect } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';

type ExploreMapPoint = {
    location: string;
    dayNumber: number;
    lat: number;
    lng: number;
};

type Props = {
    points: ExploreMapPoint[];
};

function FitBounds({ points }: { points: ExploreMapPoint[] }) {
    const map = useMap();

    useEffect(() => {
        if (points.length === 0) {
            return;
        }

        if (points.length === 1) {
            map.setView([points[0].lat, points[0].lng], 11);
            return;
        }

        const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng] as [number, number]));
        map.fitBounds(bounds, { padding: [36, 36] });
    }, [map, points]);

    return null;
}

const createNumberedIcon = (index: number) =>
    L.divIcon({
        className: '',
        html: `<div style="height:24px;width:24px;border-radius:9999px;background:#2563eb;border:2px solid #ffffff;box-shadow:0 2px 8px rgba(15,23,42,0.3);display:flex;align-items:center;justify-content:center;color:#ffffff;font-size:11px;font-weight:700;">${index}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
    });

export function TripExploreMap({ points }: Props) {
    const routePositions = points.map((point) => [point.lat, point.lng] as [number, number]);
    const defaultCenter =
        points.length > 0 ? ([points[0].lat, points[0].lng] as [number, number]) : ([51.1657, 10.4515] as [number, number]);

    return (
        <div className="h-[420px] w-full overflow-hidden rounded-xl">
            <MapContainer
                center={defaultCenter}
                zoom={6}
                scrollWheelZoom
                className="h-full w-full"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {routePositions.length > 1 && (
                    <Polyline positions={routePositions} pathOptions={{ color: '#2563eb', weight: 3, opacity: 0.75 }} />
                )}
                {points.map((point, index) => (
                    <Marker key={`${point.location}-${point.dayNumber}`} position={[point.lat, point.lng]} icon={createNumberedIcon(index + 1)}>
                        <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                            {`${index + 1}. ${point.location} (ab Tag ${point.dayNumber})`}
                        </Tooltip>
                    </Marker>
                ))}
                <FitBounds points={points} />
            </MapContainer>
        </div>
    );
}
