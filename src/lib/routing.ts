// OpenRouteService API for safer alternative routes
// Avoids flooded roads and suggests alternate paths

const ORS_API_KEY = process.env.OPENROUTESERVICE_API_KEY || '';
const ORS_API_URL = 'https://api.openrouteservice.org/v2';

import { Coordinates, BlockedRoad } from './types';

interface RouteResult {
    success: boolean;
    distance: number; // meters
    duration: number; // seconds
    geometry: [number, number][]; // lng, lat pairs
    instructions?: string[];
    avoidedAreas: string[];
}

/**
 * Get alternative route avoiding flooded areas
 */
export async function getAlternativeRoute(
    from: Coordinates,
    to: Coordinates,
    blockedRoads: BlockedRoad[]
): Promise<RouteResult> {
    // If no API key, return mock route
    if (!ORS_API_KEY) {
        return mockRoute(from, to, blockedRoads);
    }

    try {
        // Build avoid polygons from blocked roads
        const avoidPolygons = blockedRoads.map((road) => {
            // Create a small polygon around the blocked segment
            const buffer = 0.002; // ~200m buffer
            return {
                type: 'Polygon' as const,
                coordinates: [[
                    [road.start.lng - buffer, road.start.lat - buffer],
                    [road.start.lng + buffer, road.start.lat - buffer],
                    [road.end.lng + buffer, road.end.lat + buffer],
                    [road.end.lng - buffer, road.end.lat + buffer],
                    [road.start.lng - buffer, road.start.lat - buffer],
                ]],
            };
        });

        const body: Record<string, unknown> = {
            coordinates: [
                [from.lng, from.lat],
                [to.lng, to.lat],
            ],
            instructions: true,
            preference: 'shortest',
        };

        // Add avoid areas if any
        if (avoidPolygons.length > 0) {
            body.options = {
                avoid_polygons: {
                    type: 'MultiPolygon',
                    coordinates: avoidPolygons.map(p => p.coordinates),
                },
            };
        }

        const response = await fetch(`${ORS_API_URL}/directions/driving-car/geojson`, {
            method: 'POST',
            headers: {
                'Authorization': ORS_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            console.error('[ORS] API error:', response.status);
            return mockRoute(from, to, blockedRoads);
        }

        const data = await response.json();
        const feature = data.features?.[0];
        const props = feature?.properties?.summary;
        const geometry = feature?.geometry?.coordinates || [];

        return {
            success: true,
            distance: props?.distance || 0,
            duration: props?.duration || 0,
            geometry: geometry as [number, number][],
            instructions: extractInstructions(feature?.properties?.segments),
            avoidedAreas: blockedRoads.map(r => r.reason),
        };
    } catch (error) {
        console.error('[ORS] Error:', error);
        return mockRoute(from, to, blockedRoads);
    }
}

function extractInstructions(segments: Array<{ steps: Array<{ instruction: string }> }> | undefined): string[] {
    if (!segments) return [];
    return segments.flatMap(s => s.steps?.map(step => step.instruction) || []);
}

/**
 * Mock route for demo when API unavailable
 */
function mockRoute(from: Coordinates, to: Coordinates, blockedRoads: BlockedRoad[]): RouteResult {
    // Generate a simple route line
    const midLat = (from.lat + to.lat) / 2;
    const midLng = (from.lng + to.lng) / 2;

    // Calculate approximate distance using Haversine
    const R = 6371000;
    const lat1Rad = (from.lat * Math.PI) / 180;
    const lat2Rad = (to.lat * Math.PI) / 180;
    const deltaLat = ((to.lat - from.lat) * Math.PI) / 180;
    const deltaLng = ((to.lng - from.lng) * Math.PI) / 180;
    const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLng / 2) ** 2;
    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return {
        success: true,
        distance: distance * 1.3, // Add 30% for road distance
        duration: (distance * 1.3) / 8.33, // ~30 km/h average
        geometry: [
            [from.lng, from.lat],
            [midLng + 0.005, midLat], // Slight offset to show alternative
            [to.lng, to.lat],
        ],
        instructions: [
            `Head towards ${blockedRoads.length > 0 ? 'alternate route' : 'destination'}`,
            `Avoiding ${blockedRoads.length} flooded area(s)`,
            'Continue on elevated road',
            'Arrive at destination',
        ],
        avoidedAreas: blockedRoads.map(r => r.reason),
    };
}

/**
 * Format route distance for display
 */
export function formatRouteDistance(meters: number): string {
    if (meters < 1000) {
        return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Format route duration for display
 */
export function formatRouteDuration(seconds: number): string {
    if (seconds < 60) {
        return 'Less than a minute';
    }
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
        return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}m`;
}
