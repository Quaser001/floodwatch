// Real Routing Service using OSRM (Open Source Routing Machine)
// Uses Dijkstra/A* on OSM road graphs internally

import { Coordinates } from './types';

export interface RouteStep {
    instruction: string;
    distance: number;  // meters
    duration: number;  // seconds
    name: string;      // road name
    maneuver: {
        type: string;
        modifier?: string;
        location: [number, number]; // [lng, lat]
    };
}

export interface RouteResult {
    success: boolean;
    distance: number;       // total meters
    duration: number;       // total seconds
    geometry: [number, number][]; // [[lng, lat], ...] - GeoJSON format
    steps: RouteStep[];
    summary: string;
    error?: string;
}

// OSRM public demo server (for prototyping - use your own for production)
const OSRM_API = 'https://router.project-osrm.org';

// Alternative: OpenRouteService (needs free API key for avoid areas)
const ORS_API = 'https://api.openrouteservice.org/v2';

/**
 * Get route between two points using OSRM
 * Internally uses Dijkstra's algorithm on OSM road graph
 */
export async function getRoute(
    origin: Coordinates,
    destination: Coordinates,
    profile: 'driving' | 'walking' | 'cycling' = 'driving'
): Promise<RouteResult> {
    try {
        const profileMap = {
            driving: 'car',
            walking: 'foot',
            cycling: 'bike'
        };

        const url = `${OSRM_API}/route/v1/${profileMap[profile]}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true&annotations=true`;

        console.log('[Routing] Fetching route from OSRM...');

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`OSRM API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
            return {
                success: false,
                distance: 0,
                duration: 0,
                geometry: [],
                steps: [],
                summary: '',
                error: data.message || 'No route found'
            };
        }

        const route = data.routes[0];
        const leg = route.legs[0];

        // Extract steps with human-readable instructions
        const steps: RouteStep[] = leg.steps.map((step: any) => ({
            instruction: buildInstruction(step),
            distance: step.distance,
            duration: step.duration,
            name: step.name || 'unnamed road',
            maneuver: {
                type: step.maneuver.type,
                modifier: step.maneuver.modifier,
                location: step.maneuver.location
            }
        }));

        // Build summary (main roads used)
        const mainRoads = leg.steps
            .filter((s: any) => s.name && s.distance > 100)
            .map((s: any) => s.name)
            .filter((name: string, i: number, arr: string[]) => arr.indexOf(name) === i)
            .slice(0, 3);

        const summary = mainRoads.length > 0
            ? `Via ${mainRoads.join(', ')}`
            : 'Direct route';

        console.log('[Routing] Route found:', {
            distance: route.distance,
            duration: route.duration,
            steps: steps.length
        });

        return {
            success: true,
            distance: route.distance,
            duration: route.duration,
            geometry: route.geometry.coordinates,
            steps,
            summary
        };

    } catch (error) {
        console.error('[Routing] Error:', error);
        return {
            success: false,
            distance: 0,
            duration: 0,
            geometry: [],
            steps: [],
            summary: '',
            error: error instanceof Error ? error.message : 'Routing failed'
        };
    }
}

/**
 * Get route avoiding flood zones
 * Strategy: Get normal route, then get alternative if it passes through flood areas
 */
export async function getRouteAvoidingFloods(
    origin: Coordinates,
    destination: Coordinates,
    floodZones: { center: Coordinates; radius: number }[],
    profile: 'driving' | 'walking' | 'cycling' = 'driving'
): Promise<RouteResult & { avoidedAreas: string[]; isDetour: boolean }> {

    // First, get the normal route
    const normalRoute = await getRoute(origin, destination, profile);

    if (!normalRoute.success) {
        return { ...normalRoute, avoidedAreas: [], isDetour: false };
    }

    // Check if route passes through any flood zones
    const intersectedZones = floodZones.filter(zone =>
        routePassesThroughZone(normalRoute.geometry, zone)
    );

    if (intersectedZones.length === 0) {
        console.log('[Routing] Route is clear of flood zones');
        return { ...normalRoute, avoidedAreas: [], isDetour: false };
    }

    console.log('[Routing] Route passes through', intersectedZones.length, 'flood zones, finding alternative...');

    // Find alternative route by adding via points around flood zones
    const alternativeRoute = await findAlternativeRoute(
        origin,
        destination,
        intersectedZones,
        profile
    );

    if (alternativeRoute.success) {
        const avoidedAreas = intersectedZones.map((zone, i) =>
            `Flood Zone ${i + 1} (${zone.radius}m radius)`
        );

        return {
            ...alternativeRoute,
            avoidedAreas,
            isDetour: true
        };
    }

    // Fallback to original route with warning
    return {
        ...normalRoute,
        avoidedAreas: [],
        isDetour: false
    };
}

/**
 * Check if route geometry passes through a circular zone
 */
function routePassesThroughZone(
    geometry: [number, number][],
    zone: { center: Coordinates; radius: number }
): boolean {
    for (const point of geometry) {
        const [lng, lat] = point;
        const distance = haversineDistance(
            { lat, lng },
            zone.center
        );
        if (distance < zone.radius) {
            return true;
        }
    }
    return false;
}

/**
 * Find alternative route avoiding specified zones
 * Uses via points to route around blocked areas
 */
async function findAlternativeRoute(
    origin: Coordinates,
    destination: Coordinates,
    avoidZones: { center: Coordinates; radius: number }[],
    profile: 'driving' | 'walking' | 'cycling'
): Promise<RouteResult> {

    // Calculate detour points around each flood zone
    const viaPoints: Coordinates[] = [];

    for (const zone of avoidZones) {
        // Add a point that goes around the flood zone
        const bearing = calculateBearing(origin, destination);
        const perpendicularBearing = bearing + 90; // Go perpendicular to avoid

        const detourPoint = offsetPoint(
            zone.center,
            zone.radius * 1.5, // Go 1.5x the radius away
            perpendicularBearing
        );

        viaPoints.push(detourPoint);
    }

    // Build waypoints string for OSRM
    const profileMap = { driving: 'car', walking: 'foot', cycling: 'bike' };
    const waypoints = [
        `${origin.lng},${origin.lat}`,
        ...viaPoints.map(p => `${p.lng},${p.lat}`),
        `${destination.lng},${destination.lat}`
    ].join(';');

    try {
        const url = `${OSRM_API}/route/v1/${profileMap[profile]}/${waypoints}?overview=full&geometries=geojson&steps=true`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.code !== 'Ok' || !data.routes?.[0]) {
            throw new Error('No alternative route found');
        }

        const route = data.routes[0];

        // Combine all leg steps
        const allSteps: RouteStep[] = [];
        for (const leg of route.legs) {
            for (const step of leg.steps) {
                allSteps.push({
                    instruction: buildInstruction(step),
                    distance: step.distance,
                    duration: step.duration,
                    name: step.name || 'unnamed road',
                    maneuver: {
                        type: step.maneuver.type,
                        modifier: step.maneuver.modifier,
                        location: step.maneuver.location
                    }
                });
            }
        }

        return {
            success: true,
            distance: route.distance,
            duration: route.duration,
            geometry: route.geometry.coordinates,
            steps: allSteps,
            summary: 'Alternative route avoiding flood zones'
        };

    } catch (error) {
        console.error('[Routing] Alternative route failed:', error);
        return {
            success: false,
            distance: 0,
            duration: 0,
            geometry: [],
            steps: [],
            summary: '',
            error: 'Could not find alternative route'
        };
    }
}

/**
 * Build human-readable instruction from OSRM step
 */
function buildInstruction(step: any): string {
    const { type, modifier } = step.maneuver;
    const name = step.name || 'the road';

    const instructions: Record<string, string> = {
        'depart': `Start on ${name}`,
        'arrive': `Arrive at destination`,
        'turn-left': `Turn left onto ${name}`,
        'turn-right': `Turn right onto ${name}`,
        'turn-slight left': `Slight left onto ${name}`,
        'turn-slight right': `Slight right onto ${name}`,
        'turn-sharp left': `Sharp left onto ${name}`,
        'turn-sharp right': `Sharp right onto ${name}`,
        'continue': `Continue on ${name}`,
        'merge-left': `Merge left onto ${name}`,
        'merge-right': `Merge right onto ${name}`,
        'roundabout': `At roundabout, take exit onto ${name}`,
        'fork-left': `Keep left onto ${name}`,
        'fork-right': `Keep right onto ${name}`,
    };

    const key = modifier ? `${type}-${modifier}` : type;
    return instructions[key] || instructions[type] || `Continue to ${name}`;
}

/**
 * Haversine distance between two coordinates (meters)
 */
function haversineDistance(a: Coordinates, b: Coordinates): number {
    const R = 6371000; // Earth radius in meters
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);

    const x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));

    return R * c;
}

/**
 * Calculate bearing between two points (degrees)
 */
function calculateBearing(from: Coordinates, to: Coordinates): number {
    const dLon = toRad(to.lng - from.lng);
    const lat1 = toRad(from.lat);
    const lat2 = toRad(to.lat);

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Offset a point by distance and bearing
 */
function offsetPoint(origin: Coordinates, distance: number, bearing: number): Coordinates {
    const R = 6371000; // Earth radius in meters
    const d = distance / R;
    const brng = toRad(bearing);
    const lat1 = toRad(origin.lat);
    const lon1 = toRad(origin.lng);

    const lat2 = Math.asin(
        Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
    );
    const lon2 = lon1 + Math.atan2(
        Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
        Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );

    return { lat: toDeg(lat2), lng: toDeg(lon2) };
}

function toRad(deg: number): number { return deg * Math.PI / 180; }
function toDeg(rad: number): number { return rad * 180 / Math.PI; }

/**
 * Format distance for display
 */
export function formatRouteDistance(meters: number): string {
    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Format duration for display
 */
export function formatRouteDuration(seconds: number): string {
    if (seconds < 60) {
        return `${Math.round(seconds)} sec`;
    }
    const mins = Math.round(seconds / 60);
    if (mins < 60) {
        return `${mins} min`;
    }
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hours}h ${remainMins}m`;
}
