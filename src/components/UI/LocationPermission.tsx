'use client';

import { useState, useEffect } from 'react';
import { useFloodStore } from '@/lib/store';
import {
    startWatching,
    stopWatching,
    subscribeToLocation,
    getAlertsNearUser,
    formatDistance,
} from '@/lib/userLocationService';
import { useReverseGeocode } from '@/lib/geocodingService';

interface LocationPermissionProps {
    onLocationGranted?: (coords: { lat: number; lng: number }) => void;
}

export default function LocationPermission({ onLocationGranted }: LocationPermissionProps) {
    const { updateUserLocation, currentUser, alerts } = useFloodStore();
    const [status, setStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable'>('idle');
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [accuracy, setAccuracy] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);
    const [nearbyAlertCount, setNearbyAlertCount] = useState(0);
    const [isWatching, setIsWatching] = useState(false);

    // Reverse geocoding hook
    const { address, details, isLoading: isGeocoding } = useReverseGeocode(
        coords?.lat ?? null,
        coords?.lng ?? null
    );

    // Subscribe to location updates
    useEffect(() => {
        const unsubscribe = subscribeToLocation((state) => {
            if (state.coords) {
                setCoords(state.coords);
                setAccuracy(state.accuracy);
                setStatus('granted');
                updateUserLocation(state.coords);
                onLocationGranted?.(state.coords);

                // Check nearby alerts
                const nearby = getAlertsNearUser(state.coords, alerts, 2000);
                setNearbyAlertCount(nearby.length);
            }
            if (state.error) {
                setError(state.error);
                setStatus('denied');
            }
            setIsWatching(state.isWatching);
        });

        return () => {
            unsubscribe();
        };
    }, [alerts, updateUserLocation, onLocationGranted]);

    const requestLocation = async () => {
        setStatus('requesting');
        setError(null);

        if (!navigator.geolocation) {
            setStatus('unavailable');
            setError('Geolocation is not supported by your browser');
            return;
        }

        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                });
            });

            const location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            setCoords(location);
            setAccuracy(position.coords.accuracy);
            setStatus('granted');
            updateUserLocation(location);
            onLocationGranted?.(location);

            // Start continuous watching
            if (currentUser?.id) {
                startWatching(currentUser.id, { saveToSupabase: true });
            }

        } catch (err: any) {
            setStatus('denied');
            if (err.code === 1) {
                setError('Location permission denied. Please enable location access.');
            } else if (err.code === 2) {
                setError('Unable to determine your location. Please try again.');
            } else if (err.code === 3) {
                setError('Location request timed out. Please try again.');
            } else {
                setError('Failed to get location.');
            }
        }
    };

    // Auto-request on mount
    useEffect(() => {
        if (status === 'idle') {
            requestLocation();
        }

        return () => {
            stopWatching();
        };
    }, []);

    // Update nearby alerts when alerts change
    useEffect(() => {
        if (coords) {
            const nearby = getAlertsNearUser(coords, alerts, 2000);
            setNearbyAlertCount(nearby.length);
        }
    }, [alerts, coords]);

    return (
        <div>
            {/* Nearby alerts indicator */}
            {nearbyAlertCount > 0 && (
                <div className="badge badge-critical text-[10px] animate-pulse mb-3">
                    ⚠️ {nearbyAlertCount} alerts within 2km
                </div>
            )}

            {status === 'granted' && coords ? (
                <div className="bg-slate-800/50 rounded-lg p-3 mb-3">
                    {/* Human-readable address */}
                    <div className="mb-3">
                        <p className="text-xs text-slate-500 mb-1">📍 Your Location</p>
                        {isGeocoding ? (
                            <div className="flex items-center gap-2">
                                <span className="spinner w-3 h-3" />
                                <span className="text-xs text-slate-400">Finding address...</span>
                            </div>
                        ) : (
                            <p className="text-sm text-white font-medium leading-tight">
                                {address || `${coords.lat.toFixed(4)}°N, ${coords.lng.toFixed(4)}°E`}
                            </p>
                        )}
                        {details?.city && (
                            <p className="text-[10px] text-slate-500 mt-1">
                                {details.city}, {details.state || 'Assam'}
                            </p>
                        )}
                    </div>

                    {/* Compact coordinates row */}
                    <div className="flex items-center justify-between text-[10px] pt-2 border-t border-slate-700/50">
                        <span className="text-slate-500 font-mono">
                            {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                        </span>
                        {accuracy > 0 && (
                            <span className="text-slate-500">
                                ±{formatDistance(accuracy)}
                            </span>
                        )}
                    </div>
                </div>
            ) : null}

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-3">
                    <p className="text-xs text-red-400">{error}</p>
                </div>
            )}

            {status !== 'granted' ? (
                <button
                    onClick={requestLocation}
                    disabled={status === 'requesting'}
                    className="w-full btn btn-primary text-sm"
                >
                    {status === 'requesting' ? (
                        <>
                            <span className="spinner w-4 h-4" />
                            <span>Getting Location...</span>
                        </>
                    ) : (
                        <>
                            <span>📍</span>
                            <span>Enable Location</span>
                        </>
                    )}
                </button>
            ) : (
                <button onClick={requestLocation} className="w-full btn btn-ghost text-xs">
                    🔄 Refresh Location
                </button>
            )}
        </div>
    );
}

