'use client';

import { useState, useEffect } from 'react';
import { useFloodStore } from '@/lib/store';
import { Coordinates, GUWAHATI_AREAS } from '@/lib/types';
import {
    getRouteAvoidingFloods,
    formatRouteDistance,
    formatRouteDuration,
    RouteResult as OSRMRouteResult
} from '@/lib/routingService';

interface RoutingPanelProps {
    userLocation: Coordinates | null;
    onRouteCalculated?: (route: RouteData) => void;
}

export interface RouteData {
    from: Coordinates;
    to: Coordinates;
    geometry: [number, number][]; // [[lng, lat], ...]
    distance: number;
    duration: number;
    avoidedAreas: string[];
    isDetour: boolean;
    summary: string;
    steps: { instruction: string; distance: number; name: string }[];
}

const POPULAR_DESTINATIONS = [
    { name: 'Guwahati Railway Station', coords: GUWAHATI_AREAS['Guwahati Railway Station'] },
    { name: 'Fancy Bazar', coords: GUWAHATI_AREAS['Fancy Bazar'] },
    { name: 'Dispur', coords: GUWAHATI_AREAS['Dispur'] },
    { name: 'Zoo Road', coords: GUWAHATI_AREAS['Zoo Road'] },
];

export default function RoutingPanel({ userLocation, onRouteCalculated }: RoutingPanelProps) {
    const { alerts, blockedRoads, recentlyResolved } = useFloodStore();
    const [destination, setDestination] = useState<Coordinates | null>(null);
    const [destinationName, setDestinationName] = useState('');
    const [route, setRoute] = useState<RouteData | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSteps, setShowSteps] = useState(false);

    const calculateSafeRoute = async () => {
        if (!userLocation || !destination) return;

        setIsCalculating(true);
        setError(null);

        try {
            // Get active flood zones to avoid
            const floodZones = alerts
                .filter(a => a.isActive)
                .map(a => ({ center: a.location, radius: a.radius }));

            console.log('[RoutingPanel] Calculating route avoiding', floodZones.length, 'flood zones');

            // Use real OSRM routing with flood avoidance
            const osrmResult = await getRouteAvoidingFloods(
                userLocation,
                destination,
                floodZones,
                'driving'
            );

            if (!osrmResult.success) {
                throw new Error(osrmResult.error || 'Routing failed');
            }

            const result: RouteData = {
                from: userLocation,
                to: destination,
                geometry: osrmResult.geometry,
                distance: osrmResult.distance,
                duration: osrmResult.duration,
                avoidedAreas: osrmResult.avoidedAreas,
                isDetour: osrmResult.isDetour,
                summary: osrmResult.summary,
                steps: osrmResult.steps.map(s => ({
                    instruction: s.instruction,
                    distance: s.distance,
                    name: s.name
                }))
            };

            setRoute(result);
            onRouteCalculated?.(result);

        } catch (err) {
            console.error('[RoutingPanel] Error:', err);
            setError(err instanceof Error ? err.message : 'Routing failed');
        } finally {
            setIsCalculating(false);
        }
    };

    const selectDestination = (name: string, coords: Coordinates) => {
        setDestinationName(name);
        setDestination(coords);
        setRoute(null);
        setError(null);
    };

    return (
        <div>
            {/* User Location Status */}
            <div className="mb-3">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className={`w-2 h-2 rounded-full ${userLocation ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                    <span>From: {userLocation ? 'Your Location' : 'Enable location first'}</span>
                </div>
            </div>

            {/* Quick Destinations */}
            <div className="mb-4">
                <p className="text-xs text-slate-500 mb-2">Select Destination:</p>
                <div className="grid grid-cols-2 gap-2">
                    {POPULAR_DESTINATIONS.map(dest => (
                        <button
                            key={dest.name}
                            onClick={() => selectDestination(dest.name, dest.coords)}
                            className={`text-xs px-3 py-2 rounded-lg border transition-all ${destinationName === dest.name
                                ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                                : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600'
                                }`}
                        >
                            {dest.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Calculate Route Button */}
            <button
                onClick={calculateSafeRoute}
                disabled={!userLocation || !destination || isCalculating}
                className="w-full btn btn-primary text-sm mb-4"
            >
                {isCalculating ? (
                    <>
                        <span className="spinner w-4 h-4" />
                        <span>Computing Route...</span>
                    </>
                ) : (
                    <>
                        <span>🛡️</span>
                        <span>Find Safe Route</span>
                    </>
                )}
            </button>

            {/* Error Message */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                    <p className="text-xs text-red-400">❌ {error}</p>
                </div>
            )}

            {/* Route Result */}
            {route && (
                <div className={`rounded-lg p-3 border ${!route.isDetour
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-orange-500/10 border-orange-500/30'
                    }`}>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{!route.isDetour ? '✅' : '⚠️'}</span>
                        <span className={`text-sm font-semibold ${!route.isDetour ? 'text-emerald-400' : 'text-orange-400'}`}>
                            {!route.isDetour ? 'Direct Route Safe' : 'Rerouted Around Floods'}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                        <div>
                            <p className="text-slate-500">Distance</p>
                            <p className="text-white font-medium">{formatRouteDistance(route.distance)}</p>
                        </div>
                        <div>
                            <p className="text-slate-500">Est. Time</p>
                            <p className="text-white font-medium">{formatRouteDuration(route.duration)}</p>
                        </div>
                    </div>

                    {/* Route Summary */}
                    <div className="text-xs text-slate-400 mb-2">
                        📍 {route.summary}
                    </div>

                    {/* Avoided Areas - with specific messaging */}
                    {route.avoidedAreas.length > 0 && (
                        <div className="pt-2 border-t border-slate-700/50 mb-2">
                            <p className="text-xs text-orange-400 mb-1">🚧 Avoiding due to flooding:</p>
                            <div className="flex flex-wrap gap-1">
                                {route.avoidedAreas.map(area => (
                                    <span key={area} className="badge badge-critical text-[10px]">
                                        {area}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Turn-by-Turn Directions Toggle */}
                    <button
                        onClick={() => setShowSteps(!showSteps)}
                        className="w-full text-xs text-slate-400 hover:text-white py-2 flex items-center justify-center gap-1"
                    >
                        <span>{showSteps ? '▼' : '▶'}</span>
                        <span>{showSteps ? 'Hide' : 'Show'} Directions ({route.steps.length} steps)</span>
                    </button>

                    {/* Turn-by-Turn Steps */}
                    {showSteps && (
                        <div className="mt-2 max-h-[200px] overflow-auto space-y-1">
                            {route.steps.slice(0, 10).map((step, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs p-2 bg-slate-800/50 rounded">
                                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] flex-shrink-0">
                                        {i + 1}
                                    </span>
                                    <div className="flex-1">
                                        <p className="text-slate-300">{step.instruction}</p>
                                        <p className="text-slate-500 text-[10px]">{formatRouteDistance(step.distance)}</p>
                                    </div>
                                </div>
                            ))}
                            {route.steps.length > 10 && (
                                <p className="text-xs text-slate-500 text-center py-1">
                                    + {route.steps.length - 10} more steps
                                </p>
                            )}
                        </div>
                    )}

                    {/* Algorithm Info */}
                    <div className="mt-3 pt-2 border-t border-slate-700/50">
                        <p className="text-[10px] text-slate-500 italic">
                            🔬 Route computed via Dijkstra/A* on OSM road graph (OSRM)
                        </p>
                    </div>
                </div>
            )}

            {/* Recently Reopened Roads (shows after resolution) */}
            {recentlyResolved.length > 0 && (
                <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <p className="text-xs text-emerald-400 font-medium mb-1">🟢 Roads Reopened:</p>
                    <div className="flex flex-wrap gap-1">
                        {recentlyResolved.map((item) => (
                            <span key={item.alertId} className="text-xs text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                                {item.areaName} — route updated
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Blocked Roads Info */}
            {blockedRoads.length > 0 && !route && (
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                    <p className="text-xs text-slate-500">
                        ⛔ {blockedRoads.length} roads currently blocked due to flooding
                    </p>
                </div>
            )}
        </div>
    );
}
