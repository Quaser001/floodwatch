'use client';

import { useState, useEffect } from 'react';
import { useFloodStore } from '@/lib/store';

const WATER_THRESHOLD = 50; // cm - threshold for triggering alerts

interface IoTSensorPanelProps {
    onThresholdExceeded?: (sensorId: string, level: number) => void;
}

export default function IoTSensorPanel({ onThresholdExceeded }: IoTSensorPanelProps) {
    const { sensors, addNotification } = useFloodStore();
    const [waterLevels, setWaterLevels] = useState<Record<string, number>>({});
    const [isSending, setIsSending] = useState(false);
    const [lastTelegramSent, setLastTelegramSent] = useState<string | null>(null);

    // Initialize water levels from sensors
    useEffect(() => {
        const initial: Record<string, number> = {};
        sensors.forEach(s => {
            initial[s.id] = s.lastReading?.waterLevelCm || 0;
        });
        setWaterLevels(initial);
    }, [sensors]);

    // Handle water level change
    const handleWaterLevelChange = async (sensorId: string, level: number) => {
        setWaterLevels(prev => ({ ...prev, [sensorId]: level }));

        // Check if threshold exceeded
        if (level >= WATER_THRESHOLD) {
            const sensor = sensors.find(s => s.id === sensorId);
            if (sensor) {
                onThresholdExceeded?.(sensorId, level);

                // Send real Telegram notification
                if (!isSending && lastTelegramSent !== sensorId) {
                    setIsSending(true);
                    try {
                        const response = await fetch('/api/telegram/send-alert', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                sensorId,
                                areaName: sensor.areaName,
                                waterLevel: level,
                                threshold: WATER_THRESHOLD,
                            }),
                        });

                        if (response.ok) {
                            addNotification(`📱 Telegram alert sent for ${sensor.areaName}!`);
                            setLastTelegramSent(sensorId);
                        }
                    } catch (error) {
                        console.error('Failed to send Telegram alert:', error);
                    } finally {
                        setIsSending(false);
                    }
                }
            }
        } else {
            // Reset threshold tracking when below threshold
            if (lastTelegramSent === sensorId) {
                setLastTelegramSent(null);
            }
        }
    };

    const getStatusColor = (level: number) => {
        if (level >= 70) return 'from-red-500 to-rose-600';
        if (level >= WATER_THRESHOLD) return 'from-orange-500 to-amber-600';
        if (level >= 30) return 'from-yellow-500 to-amber-500';
        return 'from-emerald-500 to-green-600';
    };

    const getStatusLabel = (level: number) => {
        if (level >= 70) return 'CRITICAL';
        if (level >= WATER_THRESHOLD) return 'WARNING';
        if (level >= 30) return 'ELEVATED';
        return 'NORMAL';
    };

    return (
        <div>
            {isSending && (
                <div className="badge badge-info animate-pulse mb-3">
                    <span className="spinner w-3 h-3 mr-2" />
                    Sending Telegram...
                </div>
            )}

            <div className="space-y-4">
                {sensors.map((sensor) => {
                    const level = waterLevels[sensor.id] || 0;
                    const isAboveThreshold = level >= WATER_THRESHOLD;
                    const statusColor = getStatusColor(level);
                    const statusLabel = getStatusLabel(level);

                    return (
                        <div
                            key={sensor.id}
                            className={`p-4 rounded-xl border transition-all ${isAboveThreshold
                                ? 'bg-red-500/10 border-red-500/50 animate-pulse'
                                : 'bg-slate-800/50 border-slate-700/50'
                                }`}
                        >
                            {/* Sensor Header */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${statusColor} ${isAboveThreshold ? 'animate-ping' : ''}`} />
                                    <div>
                                        <span className="text-white font-medium text-sm">{sensor.areaName}</span>
                                        <p className="text-xs text-slate-500">{sensor.id}</p>
                                    </div>
                                </div>
                                <div className={`badge text-[10px] ${isAboveThreshold ? 'badge-critical' : 'badge-info'
                                    }`}>
                                    {statusLabel}
                                </div>
                            </div>

                            {/* Water Level Display */}
                            <div className="flex items-center gap-4 mb-3">
                                <div className="flex-1">
                                    <div className="flex items-baseline gap-1 mb-1">
                                        <span className="text-2xl font-bold text-white">{level.toFixed(0)}</span>
                                        <span className="text-sm text-slate-400">cm</span>
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        Threshold: {WATER_THRESHOLD}cm
                                    </div>
                                </div>

                                {/* Visual Water Tank */}
                                <div className="w-12 h-20 rounded-lg border-2 border-slate-600 bg-slate-900 relative overflow-hidden">
                                    <div
                                        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${statusColor} transition-all duration-300`}
                                        style={{ height: `${Math.min(level, 100)}%` }}
                                    />
                                    {/* Threshold Line */}
                                    <div
                                        className="absolute left-0 right-0 border-t-2 border-dashed border-yellow-400"
                                        style={{ bottom: `${WATER_THRESHOLD}%` }}
                                    />
                                </div>
                            </div>

                            {/* Slider */}
                            <div className="relative">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={level}
                                    onChange={(e) => handleWaterLevelChange(sensor.id, Number(e.target.value))}
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                                    style={{
                                        background: `linear-gradient(to right, ${level >= 70 ? '#ef4444' : level >= 50 ? '#f97316' : level >= 30 ? '#eab308' : '#10b981'
                                            } 0%, ${level >= 70 ? '#ef4444' : level >= 50 ? '#f97316' : level >= 30 ? '#eab308' : '#10b981'
                                            } ${level}%, #334155 ${level}%, #334155 100%)`,
                                    }}
                                />
                                {/* Threshold Marker */}
                                <div
                                    className="absolute top-0 w-0.5 h-full bg-yellow-400/50"
                                    style={{ left: `${WATER_THRESHOLD}%` }}
                                />
                            </div>

                            {/* Alert Warning */}
                            {isAboveThreshold && (
                                <div className="mt-3 flex items-center gap-2 text-xs text-red-400 font-medium">
                                    <span className="animate-bounce">⚠️</span>
                                    Water level exceeded threshold! Telegram alert triggered.
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="mt-4 pt-4 border-t border-slate-700/50">
                <p className="text-xs text-slate-500 mb-2">Water Level Zones:</p>
                <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-green-600" />
                        <span className="text-[10px] text-slate-400">0-29cm Normal</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500" />
                        <span className="text-[10px] text-slate-400">30-49cm Elevated</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-orange-500 to-amber-600" />
                        <span className="text-[10px] text-slate-400">50-69cm Warning</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-500 to-rose-600" />
                        <span className="text-[10px] text-slate-400">70+cm Critical</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
