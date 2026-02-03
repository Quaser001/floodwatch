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
            if (lastTelegramSent === sensorId) {
                setLastTelegramSent(null);
            }
        }
    };

    const getStatusColor = (level: number) => {
        if (level >= 70) return 'bg-red-500';
        if (level >= WATER_THRESHOLD) return 'bg-orange-500';
        if (level >= 30) return 'bg-yellow-500';
        return 'bg-emerald-500';
    };

    const getStatusLabel = (level: number) => {
        if (level >= 70) return { text: 'CRITICAL', color: 'text-red-400 bg-red-500/20' };
        if (level >= WATER_THRESHOLD) return { text: 'WARNING', color: 'text-orange-400 bg-orange-500/20' };
        if (level >= 30) return { text: 'ELEVATED', color: 'text-yellow-400 bg-yellow-500/20' };
        return { text: 'NORMAL', color: 'text-emerald-400 bg-emerald-500/20' };
    };

    return (
        <div className="space-y-2">
            {isSending && (
                <div className="text-xs text-blue-400 flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    Sending alert...
                </div>
            )}

            {sensors.map((sensor) => {
                const level = waterLevels[sensor.id] || 0;
                const isAboveThreshold = level >= WATER_THRESHOLD;
                const status = getStatusLabel(level);

                return (
                    <div
                        key={sensor.id}
                        className={`p-3 rounded-lg border transition-all ${isAboveThreshold
                                ? 'bg-red-500/10 border-red-500/40'
                                : 'bg-slate-800/40 border-slate-700/40'
                            }`}
                    >
                        {/* Compact Header Row */}
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className={`w-2 h-2 rounded-full ${getStatusColor(level)} shrink-0 ${isAboveThreshold ? 'animate-pulse' : ''}`} />
                                <span className="text-sm text-white font-medium truncate">{sensor.areaName}</span>
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${status.color}`}>
                                {status.text}
                            </span>
                        </div>

                        {/* Compact Level Display */}
                        <div className="flex items-center gap-3">
                            <div className="text-lg font-bold text-white">
                                {level.toFixed(0)}<span className="text-xs text-slate-500 ml-0.5">cm</span>
                            </div>

                            {/* Progress Bar (compact) */}
                            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden relative">
                                <div
                                    className={`h-full ${getStatusColor(level)} transition-all duration-200`}
                                    style={{ width: `${Math.min(level, 100)}%` }}
                                />
                                {/* Threshold marker */}
                                <div
                                    className="absolute top-0 bottom-0 w-px bg-yellow-400"
                                    style={{ left: `${WATER_THRESHOLD}%` }}
                                />
                            </div>
                        </div>

                        {/* Slider (only show on hover/focus for clean look) */}
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={level}
                            onChange={(e) => handleWaterLevelChange(sensor.id, Number(e.target.value))}
                            className="w-full h-1 mt-2 bg-slate-700 rounded appearance-none cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
                        />

                        {/* Threshold warning (compact) */}
                        {isAboveThreshold && (
                            <div className="mt-2 text-[10px] text-red-400">
                                ⚠️ Above threshold ({WATER_THRESHOLD}cm)
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Minimal legend */}
            <div className="flex items-center gap-2 pt-2 text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> OK</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500" /> Watch</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500" /> Warn</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Crit</span>
            </div>
        </div>
    );
}
