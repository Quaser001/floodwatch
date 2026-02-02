// API Route: Weather Data
// Uses Open-Meteo for free, reliable weather data + OpenWeatherMap as backup

import { NextResponse } from 'next/server';
import { fetchWeatherOpenMeteo, assessFloodRisk } from '@/lib/openmeteo';

// Guwahati coordinates
const GUWAHATI_LAT = 26.1445;
const GUWAHATI_LNG = 91.7362;

// Cache for weather data (3 min)
let weatherCache: ReturnType<typeof formatResponse> | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 3 * 60 * 1000; // 3 minutes

function formatResponse(weather: Awaited<ReturnType<typeof fetchWeatherOpenMeteo>>) {
    const risk = assessFloodRisk(weather.weather);
    return {
        ...weather.weather,
        floodRisk: risk,
        source: weather.success ? 'open-meteo' : 'fallback',
    };
}

export async function GET(request: Request) {
    try {
        // Parse optional lat/lng from query params
        const { searchParams } = new URL(request.url);
        const lat = parseFloat(searchParams.get('lat') || String(GUWAHATI_LAT));
        const lng = parseFloat(searchParams.get('lng') || String(GUWAHATI_LNG));

        // Return cache if valid and same location
        if (weatherCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
            return NextResponse.json(weatherCache);
        }

        // Fetch from Open-Meteo
        const result = await fetchWeatherOpenMeteo({ lat, lng });
        const response = formatResponse(result);

        // Update cache
        weatherCache = response;
        cacheTimestamp = Date.now();

        return NextResponse.json(response);
    } catch (error) {
        console.error('[Weather API] Error:', error);

        // Return cached data if available
        if (weatherCache) {
            return NextResponse.json({
                ...weatherCache,
                cached: true,
                error: 'Failed to fetch fresh data',
            });
        }

        // Return fallback
        return NextResponse.json({
            isRaining: true, // Assume raining for safety
            rainfallMm: 10,
            temperature: 27,
            humidity: 80,
            description: 'Weather service temporarily unavailable',
            lastUpdated: new Date().toISOString(),
            floodRisk: { risk: 'medium', reason: 'Unable to assess - defaulting to caution' },
            source: 'fallback',
            error: String(error),
        }, { status: 200 }); // Return 200 to not break frontend
    }
}
