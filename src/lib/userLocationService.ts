// Real-time User Location Service for FloodWatch
// Handles browser geolocation, Supabase persistence, and nearby alert detection

import { Coordinates, Alert } from './types';
import { supabase, isSupabaseConfigured, updateUserLocation as updateUserLocationDb } from './supabase';

// Store watch ID for cleanup
let watchId: number | null = null;
let currentUserId: string | null = null;

interface LocationState {
    coords: Coordinates | null;
    accuracy: number;
    timestamp: Date;
    error: string | null;
    isWatching: boolean;
}

type LocationCallback = (state: LocationState) => void;
type AlertCallback = (alerts: Alert[]) => void;

const subscribers: Set<LocationCallback> = new Set();
const alertSubscribers: Set<AlertCallback> = new Set();

let lastKnownState: LocationState = {
    coords: null,
    accuracy: 0,
    timestamp: new Date(),
    error: null,
    isWatching: false
};

/**
 * Check if geolocation is supported
 */
export function isGeolocationSupported(): boolean {
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
}

/**
 * Get current position once
 */
export async function getCurrentPosition(): Promise<Coordinates> {
    if (!isGeolocationSupported()) {
        throw new Error('Geolocation not supported');
    }

    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            },
            (error) => {
                reject(new Error(getErrorMessage(error)));
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}

/**
 * Start watching user location continuously
 */
export function startWatching(
    userId: string,
    options?: {
        highAccuracy?: boolean;
        saveToSupabase?: boolean;
        minDistanceMeters?: number;
    }
): void {
    if (!isGeolocationSupported() || watchId !== null) return;

    currentUserId = userId;
    const { highAccuracy = true, saveToSupabase = true, minDistanceMeters = 10 } = options || {};

    let lastSavedCoords: Coordinates | null = null;

    watchId = navigator.geolocation.watchPosition(
        async (position) => {
            const coords: Coordinates = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            const newState: LocationState = {
                coords,
                accuracy: position.coords.accuracy,
                timestamp: new Date(),
                error: null,
                isWatching: true
            };

            lastKnownState = newState;
            notifySubscribers(newState);

            // Save to Supabase if distance changed significantly
            if (saveToSupabase && isSupabaseConfigured()) {
                const shouldSave = !lastSavedCoords ||
                    calculateDistance(lastSavedCoords, coords) >= minDistanceMeters;

                if (shouldSave) {
                    await updateUserLocationDb(userId, coords);
                    lastSavedCoords = coords;
                    console.log('[Location] Saved to Supabase:', coords);
                }
            }
        },
        (error) => {
            const newState: LocationState = {
                ...lastKnownState,
                error: getErrorMessage(error),
                isWatching: true
            };
            lastKnownState = newState;
            notifySubscribers(newState);
        },
        {
            enableHighAccuracy: highAccuracy,
            timeout: 30000,
            maximumAge: 5000
        }
    );

    console.log('[Location] Started watching');
}

/**
 * Stop watching location
 */
export function stopWatching(): void {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
        currentUserId = null;

        lastKnownState = {
            ...lastKnownState,
            isWatching: false
        };
        notifySubscribers(lastKnownState);

        console.log('[Location] Stopped watching');
    }
}

/**
 * Subscribe to location updates
 */
export function subscribeToLocation(callback: LocationCallback): () => void {
    subscribers.add(callback);
    // Immediately send current state
    callback(lastKnownState);

    return () => {
        subscribers.delete(callback);
    };
}

/**
 * Get alerts within radius of user location
 */
export function getAlertsNearUser(
    userLocation: Coordinates,
    alerts: Alert[],
    radiusMeters: number = 1000
): Alert[] {
    return alerts.filter(alert => {
        if (!alert.isActive) return false;
        const distance = calculateDistance(userLocation, alert.location);
        return distance <= radiusMeters;
    });
}

/**
 * Check for new alerts and notify via callback
 */
export function checkNearbyAlerts(
    userLocation: Coordinates,
    alerts: Alert[],
    radiusMeters: number = 1000
): Alert[] {
    const nearbyAlerts = getAlertsNearUser(userLocation, alerts, radiusMeters);

    // Notify alert subscribers
    alertSubscribers.forEach(callback => callback(nearbyAlerts));

    return nearbyAlerts;
}

/**
 * Subscribe to nearby alert notifications
 */
export function subscribeToNearbyAlerts(callback: AlertCallback): () => void {
    alertSubscribers.add(callback);
    return () => {
        alertSubscribers.delete(callback);
    };
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371000; // Earth's radius in meters
    const lat1Rad = (coord1.lat * Math.PI) / 180;
    const lat2Rad = (coord2.lat * Math.PI) / 180;
    const deltaLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
    const deltaLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;

    const a =
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1Rad) * Math.cos(lat2Rad) *
        Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
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

/**
 * Get current state
 */
export function getLocationState(): LocationState {
    return lastKnownState;
}

// Internal helpers
function notifySubscribers(state: LocationState): void {
    subscribers.forEach(callback => callback(state));
}

function getErrorMessage(error: GeolocationPositionError): string {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            return 'Location permission denied';
        case error.POSITION_UNAVAILABLE:
            return 'Location unavailable';
        case error.TIMEOUT:
            return 'Location request timed out';
        default:
            return 'Unknown location error';
    }
}
