'use client';

import { useFloodStore } from '@/lib/store';
import { useState } from 'react';

type ForecastDay = {
    date: string;
    day: {
        avgtemp_c: number;
        totalprecip_mm: number;
        condition: {
            text: string;
            icon: string;
        };
    };
};

export default function WeatherWidget() {
    const { weather } = useFloodStore();
    const [showForecast, setShowForecast] = useState(false);
    const [forecast, setForecast] = useState<ForecastDay[] | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchForecast = async () => {
        if (showForecast) {
            setShowForecast(false);
            return;
        }

        if (forecast) {
            setShowForecast(true);
            return;
        }

        setLoading(true);
        setShowForecast(true);
        try {
            const res = await fetch('/api/weather/forecast');
            const data = await res.json();
            if (data.forecast?.forecastday) {
                setForecast(data.forecast.forecastday);
            }
        } catch (error) {
            console.error('Failed to fetch forecast', error);
        } finally {
            setLoading(false);
        }
    };

    const getFloodRisk = (precip: number) => {
        if (precip > 50) return { label: 'CRITICAL', color: 'text-red-500', bg: 'bg-red-500/20' };
        if (precip > 20) return { label: 'HIGH', color: 'text-orange-500', bg: 'bg-orange-500/20' };
        if (precip > 5) return { label: 'MODERATE', color: 'text-yellow-500', bg: 'bg-yellow-500/20' };
        return { label: 'LOW', color: 'text-emerald-500', bg: 'bg-emerald-500/20' };
    };

    return (
        <div className="relative z-[1001]">
            <div className={`
                glass-card px-4 py-2 flex items-center gap-3 transition-all duration-300 relative z-20
                ${weather.isRaining ? 'border-blue-500/30 shadow-blue-500/10' : 'border-slate-700/30'}
                ${showForecast ? 'bg-slate-800/80 ring-1 ring-blue-500/50' : ''}
            `}>
                {/* Weather Icon */}
                <div className={`
                    relative text-2xl transition-transform duration-300
                    ${weather.isRaining ? 'animate-float' : ''}
                `}>
                    {weather.isRaining ? '🌧️' : '⛅'}
                    {weather.isRaining && (
                        <div className="absolute -inset-2 bg-blue-500/10 rounded-full blur-md" />
                    )}
                </div>

                {/* Weather Info - Compact */}
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-white">{weather.temperature}°C</span>
                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">Guwahati</span>
                    </div>
                </div>

                {/* Expand Button */}
                <button
                    onClick={fetchForecast}
                    className={`
                        w-7 h-7 rounded-full flex items-center justify-center transition-all ml-1
                        ${showForecast ? 'bg-blue-500 text-white rotate-45' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}
                        border border-white/5
                    `}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>

            {/* Background Blur Overlay for Mobile - Only visible when open */}
            {showForecast && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-10 md:hidden" onClick={() => setShowForecast(false)} />
            )}

            {/* Forecast Dropdown */}
            {showForecast && (
                <div className="absolute top-[calc(100%+8px)] right-0 w-[300px] md:w-[320px] glass-card p-4 animate-in fade-in slide-in-from-top-2 z-30 border border-slate-600/50 shadow-2xl bg-slate-900/95 backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                            <span>📅</span> 3-Day Forecast
                        </h3>
                        <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded">Live Data</span>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-6 gap-2">
                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs text-slate-500">Loading forecast...</span>
                        </div>
                    ) : forecast ? (
                        <div className="space-y-2">
                            {forecast.map((day) => {
                                const date = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
                                const risk = getFloodRisk(day.day.totalprecip_mm);

                                return (
                                    <div key={day.date} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-white/5">
                                                <img src={`https:${day.day.condition.icon}`} alt="icon" className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-slate-200">{date}</div>
                                                <div className="text-[10px] text-slate-400 truncate max-w-[80px]">{day.day.condition.text}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${risk.bg} ${risk.color} inline-block mb-0.5 border border-white/5 shadow-sm`}>
                                                {risk.label}
                                            </div>
                                            <div className="text-[10px] text-slate-500">
                                                {day.day.totalprecip_mm}mm • {day.day.avgtemp_c}°C
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-4 text-xs text-red-400 bg-red-500/10 rounded-lg">
                            Unable to load forecast data.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
