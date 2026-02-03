'use client';

import { useState } from 'react';
import { useFloodStore } from '@/lib/store';
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { Alert } from '@/lib/types';

export default function AlertFeed() {
    const { alerts, resolveAlert, weather } = useFloodStore();
    const activeAlerts = alerts.filter((a) => a.isActive);

    // Local interaction tracking
    const [interactions, setInteractions] = useState<Record<string, {
        userVote: 'confirm' | 'resolved' | null;
        expanded: boolean;
        localResolved: number;
        localConfirmed: number;
    }>>({});

    const [fullscreenPhoto, setFullscreenPhoto] = useState<{ url: string; area: string; severity: string; time: Date } | null>(null);

    const getInteraction = (alert: Alert) => {
        return interactions[alert.id] || {
            userVote: null,
            expanded: false,
            localResolved: alert.resolvedCount || 0,
            localConfirmed: alert.confirmedCount || 0
        };
    };

    const handleVote = (alert: Alert, type: 'confirm' | 'resolved') => {
        const current = getInteraction(alert);
        if (current.userVote === type) return; // No double voting

        let newResolved = current.localResolved;
        let newConfirmed = current.localConfirmed;

        // Remove previous vote
        if (current.userVote === 'confirm') newConfirmed--;
        if (current.userVote === 'resolved') newResolved--;

        // Apply new vote
        if (type === 'confirm') newConfirmed++;
        if (type === 'resolved') newResolved++;

        // Check for MONITORING threshold: ≥1 resolved + no recent confirms
        const minutesSinceLastConfirm = alert.lastConfirmedAt
            ? differenceInMinutes(new Date(), new Date(alert.lastConfirmedAt))
            : 999;
        const isLowRainfall = (weather?.rainfallMm || 0) < 5;

        // MONITORING: 1+ resolved, no confirms in 15min, low rainfall
        const shouldMonitor = newResolved >= 1 && minutesSinceLastConfirm > 15 && isLowRainfall;

        // NORMAL: 2+ resolved, very low rainfall, stable for 10min
        const shouldResolve = newResolved >= 2 && (weather?.rainfallMm || 0) < 2;

        if (shouldResolve) {
            setTimeout(() => resolveAlert(alert.id), 0);
        }

        setInteractions(prev => ({
            ...prev,
            [alert.id]: {
                ...current,
                userVote: type,
                localResolved: newResolved,
                localConfirmed: newConfirmed
            }
        }));
    };

    // Check if contextual actions should show
    const shouldShowAvoidArea = (alert: Alert) =>
        alert.severity === 'critical' || alert.severity === 'high';

    const shouldShowDelayTravel = (alert: Alert) => {
        const minutesSinceStart = differenceInMinutes(new Date(), new Date(alert.triggeredAt));
        return minutesSinceStart < 60 && (weather?.rainfallMm || 0) > 10;
    };

    const shouldShowRequestUpdate = (alert: Alert) => {
        const minutesSinceStart = differenceInMinutes(new Date(), new Date(alert.triggeredAt));
        return minutesSinceStart > 20;
    };

    // Get road state label
    const getRoadStateLabel = (alert: Alert, interaction: ReturnType<typeof getInteraction>) => {
        const hasMonitoringSignal = interaction.localResolved >= 1 && interaction.localConfirmed < interaction.localResolved;
        if (hasMonitoringSignal) {
            return { label: 'Recently flooded — use caution', color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
        }
        if (alert.roadState === 'flooded') {
            return { label: 'Road blocked', color: 'text-red-400', bg: 'bg-red-500/10' };
        }
        return null;
    };

    if (activeAlerts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 flex items-center justify-center animate-float">
                        <span className="text-4xl">✅</span>
                    </div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">All Clear</h3>
                <p className="text-sm text-slate-400 max-w-[200px]">
                    No active flood alerts.
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-4 pb-32">
                {activeAlerts.map((alert) => {
                    const interaction = getInteraction(alert);
                    const stateLabel = getRoadStateLabel(alert, interaction);
                    const showAvoid = shouldShowAvoidArea(alert);
                    const showDelay = shouldShowDelayTravel(alert);
                    const showRequestUpdate = shouldShowRequestUpdate(alert);

                    const severityStyles = {
                        critical: { border: 'border-l-red-500', bg: 'bg-red-500/5', color: 'text-red-500' },
                        high: { border: 'border-l-orange-500', bg: 'bg-orange-500/5', color: 'text-orange-500' },
                        medium: { border: 'border-l-yellow-500', bg: 'bg-yellow-500/5', color: 'text-yellow-500' },
                    }[alert.severity];

                    return (
                        <div
                            key={alert.id}
                            className={`glass-card p-0 overflow-hidden border-l-4 ${severityStyles.border} ${severityStyles.bg}`}
                        >
                            {/* Road State Banner */}
                            {stateLabel && (
                                <div className={`${stateLabel.bg} border-b border-white/10 px-4 py-2`}>
                                    <span className={`text-xs font-medium ${stateLabel.color}`}>
                                        🚧 {stateLabel.label}
                                    </span>
                                </div>
                            )}

                            {/* Photo Evidence (if available) */}
                            {alert.photoUrl && (
                                <div
                                    className="relative w-full cursor-pointer group"
                                    onClick={() => setFullscreenPhoto({
                                        url: alert.photoUrl!,
                                        area: alert.areaName,
                                        severity: alert.severity,
                                        time: alert.triggeredAt
                                    })}
                                >
                                    <img
                                        src={alert.photoUrl}
                                        alt={`Ground evidence from ${alert.areaName}`}
                                        className="w-full h-36 object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                                    <div className="absolute bottom-0 left-0 right-0 p-3">
                                        <span className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs text-white/90">
                                            📷 Latest Ground View
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Header */}
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-bold text-white text-lg">{alert.areaName}</h3>
                                        <p className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                                            <span>{alert.reportCount} reports</span>
                                            <span>•</span>
                                            <span>{Math.round(alert.confidenceScore * 100)}% confidence</span>
                                        </p>
                                    </div>
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${severityStyles.color} bg-white/5`}>
                                        {alert.severity}
                                    </span>
                                </div>

                                {/* Vote Counts (transparent, like you specified) */}
                                <div className="flex gap-3 text-[10px] text-slate-500 mb-3">
                                    <span>👍 {interaction.localConfirmed} confirmations</span>
                                    <span>✅ {interaction.localResolved} resolved</span>
                                </div>
                            </div>

                            {/* === CLEAN 3-ACTION UX === */}
                            <div className="px-4 pb-4 space-y-2">
                                {/* Primary Actions Row (always visible, max 3) */}
                                <div className="flex gap-2">
                                    {/* Find Safer Route - ALWAYS visible */}
                                    <button className="flex-1 py-2.5 px-3 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-medium hover:bg-blue-500/30 transition-colors flex items-center justify-center gap-1.5">
                                        <span>🛡️</span>
                                        <span>Find safer route</span>
                                    </button>

                                    {/* Mark Resolved */}
                                    <button
                                        onClick={() => handleVote(alert, 'resolved')}
                                        className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 border ${interaction.userVote === 'resolved'
                                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                                            : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600'
                                            }`}
                                    >
                                        <span>✅</span>
                                        <span>Cleared</span>
                                    </button>

                                    {/* Still Flooded */}
                                    <button
                                        onClick={() => handleVote(alert, 'confirm')}
                                        className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 border ${interaction.userVote === 'confirm'
                                            ? 'bg-red-500/20 border-red-500/50 text-red-400'
                                            : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600'
                                            }`}
                                    >
                                        <span>🚨</span>
                                        <span>Still flooded</span>
                                    </button>
                                </div>

                                {/* Contextual Actions (appear when relevant) */}
                                {(showAvoid || showDelay || showRequestUpdate) && (
                                    <div className="pt-2 border-t border-slate-700/30 space-y-1.5">
                                        {showAvoid && (
                                            <div className="flex items-center gap-2 text-xs text-orange-400 bg-orange-500/10 px-3 py-2 rounded-lg">
                                                <span>⚠️</span>
                                                <span>Avoid this area if possible</span>
                                            </div>
                                        )}
                                        {showDelay && (
                                            <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-500/10 px-3 py-2 rounded-lg">
                                                <span>⏳</span>
                                                <span>Consider delaying travel for 30–60 minutes</span>
                                            </div>
                                        )}
                                        {showRequestUpdate && !showAvoid && !showDelay && (
                                            <button className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 bg-slate-800/50 px-3 py-2 rounded-lg hover:text-white transition-colors">
                                                <span>📢</span>
                                                <span>Is this area still flooded?</span>
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* "Why am I seeing this alert?" Explanation Panel */}
                                <button
                                    onClick={() => setInteractions(prev => ({
                                        ...prev,
                                        [alert.id]: { ...getInteraction(alert), expanded: !interaction.expanded }
                                    }))}
                                    className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-300 transition-colors pt-2"
                                >
                                    <span className="flex items-center gap-1.5">
                                        <span>ℹ️</span>
                                        <span>Why am I seeing this alert?</span>
                                    </span>
                                    <span className={`transition-transform ${interaction.expanded ? 'rotate-180' : ''}`}>▼</span>
                                </button>

                                {interaction.expanded && (
                                    <div className="mt-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 space-y-3 animate-fadeIn">
                                        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Alert Explanation</h4>

                                        {/* Community Inputs */}
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Community Reports</p>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-500 rounded-full transition-all"
                                                        style={{ width: `${Math.min(alert.reportCount * 10, 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-blue-400 font-medium">{alert.reportCount} reports</span>
                                            </div>
                                            <p className="text-[10px] text-slate-500">
                                                {alert.reportCount >= 5
                                                    ? '✓ Strong community confirmation'
                                                    : alert.reportCount >= 2
                                                        ? '⚠ Moderate confirmation'
                                                        : '⏳ Few reports so far'}
                                            </p>
                                        </div>

                                        {/* Weather Factor */}
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Weather Conditions</p>
                                            <div className="flex items-center gap-3">
                                                <span className="text-lg">
                                                    {(weather?.rainfallMm || 0) > 10 ? '🌧️' :
                                                        (weather?.rainfallMm || 0) > 5 ? '🌦️' : '☁️'}
                                                </span>
                                                <div>
                                                    <p className="text-xs text-white font-medium">
                                                        {(weather?.rainfallMm || 0).toFixed(1)} mm/hr rainfall
                                                    </p>
                                                    <p className="text-[10px] text-slate-500">
                                                        {(weather?.rainfallMm || 0) > 10
                                                            ? 'Heavy rain increases flood risk'
                                                            : (weather?.rainfallMm || 0) > 5
                                                                ? 'Moderate rain contributing'
                                                                : 'Low rainfall currently'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Confidence Breakdown */}
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Confidence Score</p>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${alert.confidenceScore > 0.8 ? 'bg-emerald-500' :
                                                            alert.confidenceScore > 0.5 ? 'bg-yellow-500' : 'bg-orange-500'
                                                            }`}
                                                        style={{ width: `${alert.confidenceScore * 100}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-white font-bold">{Math.round(alert.confidenceScore * 100)}%</span>
                                            </div>
                                            <p className="text-[10px] text-slate-500">
                                                Based on: reports ({alert.reportCount}) + photo evidence ({alert.photoUrl ? 'provided' : 'none'}) + area history
                                            </p>
                                        </div>

                                        {/* Summary */}
                                        <div className="pt-2 border-t border-slate-700/50">
                                            <p className="text-xs text-slate-300">
                                                <span className="font-medium">Summary: </span>
                                                {alert.reportCount >= 3 && (weather?.rainfallMm || 0) > 5
                                                    ? `Multiple reports + active rainfall in ${alert.areaName}`
                                                    : alert.reportCount >= 3
                                                        ? `Community-confirmed flooding in ${alert.areaName}`
                                                        : `Reports of flooding in ${alert.areaName} being monitored`}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Fullscreen Photo Viewer */}
            {fullscreenPhoto && (
                <div
                    className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center animate-in fade-in"
                    onClick={() => setFullscreenPhoto(null)}
                >
                    <div className="relative max-w-full max-h-full p-4">
                        <img
                            src={fullscreenPhoto.url}
                            alt="Ground evidence"
                            className="max-w-full max-h-[80vh] object-contain rounded-lg"
                        />
                        <div className="absolute bottom-8 left-4 right-4 flex justify-between items-end">
                            <div>
                                <p className="text-lg font-bold text-white">{fullscreenPhoto.area}</p>
                                <p className="text-sm text-slate-400">
                                    {formatDistanceToNow(new Date(fullscreenPhoto.time), { addSuffix: true })}
                                </p>
                            </div>
                            <span className={`text-xs uppercase font-bold px-3 py-1 rounded-full ${fullscreenPhoto.severity === 'critical' ? 'bg-red-500/30 text-red-300' :
                                fullscreenPhoto.severity === 'high' ? 'bg-orange-500/30 text-orange-300' :
                                    'bg-yellow-500/30 text-yellow-300'
                                }`}>
                                {fullscreenPhoto.severity}
                            </span>
                        </div>
                        <button
                            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white text-xl hover:bg-white/20 transition-colors"
                            onClick={() => setFullscreenPhoto(null)}
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
