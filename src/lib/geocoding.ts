// Nominatim API for reverse geocoding
// Converts GPS coordinates to human-readable area names

import { Coordinates } from './types';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

interface GeocodingResult {
    areaName: string;
    fullAddress: string;
    locality?: string;
    suburb?: string;
    city: string;
}

/**
 * Reverse geocode coordinates to get area name
 */
export async function reverseGeocode(location: Coordinates): Promise<GeocodingResult> {
    try {
        const response = await fetch(
            `${NOMINATIM_URL}/reverse?lat=${location.lat}&lon=${location.lng}&format=json&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'FloodWatch-Guwahati/1.0 (hackathon-project)',
                },
            }
        );

        if (!response.ok) {
            console.error('[Nominatim] API error:', response.status);
            return fallbackGeocode(location);
        }

        const data = await response.json();
        const address = data.address || {};

        // Extract relevant area name
        const areaName =
            address.neighbourhood ||
            address.suburb ||
            address.locality ||
            address.quarter ||
            address.village ||
            address.town ||
            address.city_district ||
            'Unknown Area';

        const locality = address.suburb || address.locality;
        const suburb = address.neighbourhood || address.quarter;

        return {
            areaName,
            fullAddress: data.display_name || '',
            locality,
            suburb,
            city: address.city || address.town || 'Guwahati',
        };
    } catch (error) {
        console.error('[Nominatim] Error:', error);
        return fallbackGeocode(location);
    }
}

/**
 * Fallback geocoding using known Guwahati areas
 */
function fallbackGeocode(location: Coordinates): GeocodingResult {
    // Known areas in Guwahati with approximate centers
    const knownAreas = [
        { name: 'GS Road', center: { lat: 26.1445, lng: 91.7362 } },
        { name: 'Zoo Road', center: { lat: 26.1638, lng: 91.7674 } },
        { name: 'Panbazar', center: { lat: 26.1856, lng: 91.7451 } },
        { name: 'Fancy Bazar', center: { lat: 26.1872, lng: 91.7384 } },
        { name: 'Paltan Bazar', center: { lat: 26.1803, lng: 91.7538 } },
        { name: 'Chandmari', center: { lat: 26.1648, lng: 91.7741 } },
        { name: 'Beltola', center: { lat: 26.1298, lng: 91.7869 } },
        { name: 'Basistha', center: { lat: 26.1208, lng: 91.8024 } },
        { name: 'Dispur', center: { lat: 26.1402, lng: 91.7880 } },
        { name: 'Khanapara', center: { lat: 26.1323, lng: 91.8198 } },
        { name: 'Maligaon', center: { lat: 26.1879, lng: 91.7105 } },
        { name: 'Bharalumukh', center: { lat: 26.1723, lng: 91.7329 } },
        { name: 'Uzanbazar', center: { lat: 26.1902, lng: 91.7467 } },
        { name: 'Lachit Nagar', center: { lat: 26.1585, lng: 91.7552 } },
        { name: 'Hatigaon', center: { lat: 26.1412, lng: 91.7678 } },
        { name: 'Ganeshguri', center: { lat: 26.1389, lng: 91.7845 } },
        { name: 'Sixmile', center: { lat: 26.1267, lng: 91.8012 } },
        { name: 'Narengi', center: { lat: 26.1432, lng: 91.8234 } },
    ];

    // Find closest area
    let closestArea = knownAreas[0];
    let minDistance = Infinity;

    for (const area of knownAreas) {
        const distance = Math.sqrt(
            Math.pow(location.lat - area.center.lat, 2) +
            Math.pow(location.lng - area.center.lng, 2)
        );
        if (distance < minDistance) {
            minDistance = distance;
            closestArea = area;
        }
    }

    // If too far from any known area
    if (minDistance > 0.02) { // ~2km
        return {
            areaName: `Near ${closestArea.name}`,
            fullAddress: `Near ${closestArea.name}, Guwahati, Assam`,
            city: 'Guwahati',
        };
    }

    return {
        areaName: closestArea.name,
        fullAddress: `${closestArea.name}, Guwahati, Assam`,
        city: 'Guwahati',
    };
}

/**
 * Format location for display
 */
export function formatLocation(result: GeocodingResult): string {
    if (result.suburb && result.locality) {
        return `${result.suburb}, ${result.locality}`;
    }
    return result.areaName;
}
