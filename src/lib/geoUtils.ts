// Geo Utilities for FloodWatch Guwahati

import { Coordinates, GUWAHATI_AREAS } from './types';

/**
 * Calculate the Haversine distance between two coordinates in meters
 */
export function haversineDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371000; // Earth's radius in meters
    const lat1Rad = (coord1.lat * Math.PI) / 180;
    const lat2Rad = (coord2.lat * Math.PI) / 180;
    const deltaLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
    const deltaLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;

    const a =
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Check if a point is within a given radius of another point
 */
export function isWithinRadius(
    center: Coordinates,
    point: Coordinates,
    radiusMeters: number
): boolean {
    return haversineDistance(center, point) <= radiusMeters;
}

/**
 * Find the nearest known area name for a given coordinate
 */
export function findNearestArea(location: Coordinates): string {
    let nearestArea = 'Unknown Area';
    let minDistance = Infinity;

    for (const [areaName, areaCoords] of Object.entries(GUWAHATI_AREAS)) {
        const distance = haversineDistance(location, areaCoords);
        if (distance < minDistance) {
            minDistance = distance;
            nearestArea = areaName;
        }
    }

    // If the nearest area is more than 2km away, return a generic name
    if (minDistance > 2000) {
        return `Near ${nearestArea}`;
    }

    return nearestArea;
}

/**
 * Group coordinates by proximity (clustering)
 */
export function groupByProximity<T extends { location: Coordinates }>(
    items: T[],
    radiusMeters: number
): T[][] {
    const groups: T[][] = [];
    const assigned = new Set<number>();

    for (let i = 0; i < items.length; i++) {
        if (assigned.has(i)) continue;

        const group: T[] = [items[i]];
        assigned.add(i);

        for (let j = i + 1; j < items.length; j++) {
            if (assigned.has(j)) continue;

            if (isWithinRadius(items[i].location, items[j].location, radiusMeters)) {
                group.push(items[j]);
                assigned.add(j);
            }
        }

        groups.push(group);
    }

    return groups;
}

/**
 * Calculate the centroid of a group of coordinates
 */
export function calculateCentroid(coords: Coordinates[]): Coordinates {
    if (coords.length === 0) {
        return { lat: 0, lng: 0 };
    }

    const sum = coords.reduce(
        (acc, coord) => ({
            lat: acc.lat + coord.lat,
            lng: acc.lng + coord.lng,
        }),
        { lat: 0, lng: 0 }
    );

    return {
        lat: sum.lat / coords.length,
        lng: sum.lng / coords.length,
    };
}

/**
 * Estimate population density for notification count simulation
 * Higher values for central areas, lower for outskirts
 */
export function estimatePopulationDensity(location: Coordinates): number {
    // Central Guwahati areas have higher density
    const centralAreas = ['Fancy Bazar', 'Panbazar', 'Paltan Bazar', 'GS Road'];
    const nearestArea = findNearestArea(location);

    if (centralAreas.includes(nearestArea)) {
        return Math.floor(Math.random() * 50) + 40; // 40-90 users
    }

    return Math.floor(Math.random() * 30) + 15; // 15-45 users
}

/**
 * Generate a random offset for demo purposes (simulating multiple reports)
 */
export function generateRandomOffset(baseLocation: Coordinates, maxMeters: number): Coordinates {
    // Convert meters to approximate degrees (at Guwahati's latitude)
    const metersPerDegreeLat = 111000;
    const metersPerDegreeLng = 111000 * Math.cos((baseLocation.lat * Math.PI) / 180);

    const offsetLat = ((Math.random() - 0.5) * 2 * maxMeters) / metersPerDegreeLat;
    const offsetLng = ((Math.random() - 0.5) * 2 * maxMeters) / metersPerDegreeLng;

    return {
        lat: baseLocation.lat + offsetLat,
        lng: baseLocation.lng + offsetLng,
    };
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
    if (meters < 1000) {
        return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
}
