'use client';

// Nominatim Reverse Geocoding Service
// Free OpenStreetMap-based geocoding - no API key required

export interface GeocodingResult {
    displayName: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    state?: string;
    country?: string;
    formatted: string; // Short formatted version
}

const NOMINATIM_API = 'https://nominatim.openstreetmap.org';
const CACHE = new Map<string, GeocodingResult>();

// Rate limiting - Nominatim requires max 1 request per second
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1100; // 1.1 seconds between requests

async function waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        await new Promise(resolve =>
            setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
        );
    }
    lastRequestTime = Date.now();
}

export async function reverseGeocode(
    lat: number,
    lng: number
): Promise<GeocodingResult | null> {
    // Check cache first
    const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    if (CACHE.has(cacheKey)) {
        return CACHE.get(cacheKey)!;
    }

    try {
        await waitForRateLimit();

        const response = await fetch(
            `${NOMINATIM_API}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'FloodWatch-Guwahati/1.0 (Hackathon Project)',
                    'Accept-Language': 'en'
                }
            }
        );

        if (!response.ok) {
            console.error('[Geocoding] API error:', response.status);
            return null;
        }

        const data = await response.json();

        if (data.error) {
            console.error('[Geocoding] Nominatim error:', data.error);
            return null;
        }

        const address = data.address || {};

        // Extract relevant parts
        const road = address.road || address.pedestrian || address.footway || address.path;
        const neighbourhood = address.neighbourhood || address.hamlet || address.village;
        const suburb = address.suburb || address.residential || address.quarter;
        const city = address.city || address.town || address.municipality || 'Guwahati';
        const state = address.state || 'Assam';
        const country = address.country || 'India';

        // Format a short, human-readable string
        const parts: string[] = [];
        if (road) parts.push(road);
        if (neighbourhood && neighbourhood !== road) parts.push(neighbourhood);
        if (suburb && suburb !== neighbourhood) parts.push(suburb);
        if (city && !parts.some(p => p.includes(city))) parts.push(city);

        const formatted = parts.slice(0, 3).join(', ') || data.display_name?.split(',').slice(0, 3).join(', ') || 'Unknown Location';

        const result: GeocodingResult = {
            displayName: data.display_name || '',
            road,
            neighbourhood,
            suburb,
            city,
            state,
            country,
            formatted
        };

        // Cache the result
        CACHE.set(cacheKey, result);

        return result;

    } catch (error) {
        console.error('[Geocoding] Error:', error);
        return null;
    }
}

// Format coordinates as a fallback
export function formatCoordinates(lat: number, lng: number): string {
    return `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`;
}

// Get a brief location string with geocoding
export async function getLocationName(lat: number, lng: number): Promise<string> {
    const result = await reverseGeocode(lat, lng);
    if (result) {
        return result.formatted;
    }
    return formatCoordinates(lat, lng);
}

// Hook for React components
import { useState, useEffect, useCallback } from 'react';

interface UseReverseGeocodeResult {
    address: string | null;
    details: GeocodingResult | null;
    isLoading: boolean;
    error: string | null;
}

export function useReverseGeocode(
    lat: number | null,
    lng: number | null
): UseReverseGeocodeResult {
    const [address, setAddress] = useState<string | null>(null);
    const [details, setDetails] = useState<GeocodingResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (lat === null || lng === null) {
            setAddress(null);
            setDetails(null);
            return;
        }

        let cancelled = false;

        const fetchAddress = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const result = await reverseGeocode(lat, lng);

                if (cancelled) return;

                if (result) {
                    setAddress(result.formatted);
                    setDetails(result);
                } else {
                    setAddress(formatCoordinates(lat, lng));
                    setError('Could not fetch address');
                }
            } catch (err) {
                if (cancelled) return;
                setError('Geocoding failed');
                setAddress(formatCoordinates(lat, lng));
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        fetchAddress();

        return () => {
            cancelled = true;
        };
    }, [lat, lng]);

    return { address, details, isLoading, error };
}
