// Open-Meteo Weather Service for FloodWatch Guwahati
// Free, reliable weather API with no API key required

import { fetchWeatherApi } from 'openmeteo';
import { Coordinates, WeatherData } from './types';

// Guwahati default coordinates
const GUWAHATI_COORDS = {
    lat: 26.1445,
    lng: 91.7362,
};

interface OpenMeteoResult {
    success: boolean;
    weather: WeatherData;
    error?: string;
}

/**
 * Fetch current weather and rainfall data from Open-Meteo
 */
export async function fetchWeatherOpenMeteo(
    location: Coordinates = GUWAHATI_COORDS
): Promise<OpenMeteoResult> {
    try {
        const params = {
            latitude: location.lat,
            longitude: location.lng,
            current: ['precipitation', 'rain', 'showers', 'temperature_2m', 'relative_humidity_2m', 'weather_code'],
            hourly: ['precipitation', 'rain'],
            past_hours: 3, // Get last 3 hours for rainfall validation
            forecast_hours: 1,
            timezone: 'Asia/Kolkata',
        };

        const url = 'https://api.open-meteo.com/v1/forecast';
        const responses = await fetchWeatherApi(url, params);

        if (!responses || responses.length === 0) {
            console.error('[Open-Meteo] No response received');
            return fallbackWeather();
        }

        const response = responses[0];
        const current = response.current();
        const hourly = response.hourly();

        if (!current) {
            console.error('[Open-Meteo] No current data');
            return fallbackWeather();
        }

        // Get current values
        const precipitation = current.variables(0)?.value() || 0;
        const rain = current.variables(1)?.value() || 0;
        const showers = current.variables(2)?.value() || 0;
        const temperature = current.variables(3)?.value() || 28;
        const humidity = current.variables(4)?.value() || 75;
        const weatherCode = current.variables(5)?.value() || 0;

        // Calculate total rainfall in last few hours from hourly data
        let totalRainfall = precipitation + rain + showers;
        if (hourly) {
            const hourlyRain = hourly.variables(0)?.valuesArray();
            const hourlyPrecip = hourly.variables(1)?.valuesArray();
            if (hourlyRain && hourlyPrecip) {
                for (let i = 0; i < Math.min(3, hourlyRain.length); i++) {
                    totalRainfall += (hourlyRain[i] || 0) + (hourlyPrecip[i] || 0);
                }
            }
        }

        // Determine if it's raining based on weather code and precipitation
        // Weather codes 51-67, 80-82 are rain-related
        const rainCodes = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82];
        const isRaining = rainCodes.includes(weatherCode) || totalRainfall > 0.1;

        // Get description from weather code
        const description = getWeatherDescription(weatherCode);

        const weather: WeatherData = {
            isRaining,
            rainfallMm: Math.round(totalRainfall * 10) / 10,
            temperature: Math.round(temperature),
            humidity: Math.round(humidity),
            description,
            lastUpdated: new Date(),
        };

        return {
            success: true,
            weather,
        };
    } catch (error) {
        console.error('[Open-Meteo] Error fetching weather:', error);
        return fallbackWeather(String(error));
    }
}

/**
 * Fallback weather data when API fails
 */
function fallbackWeather(error?: string): OpenMeteoResult {
    return {
        success: false,
        weather: {
            isRaining: true, // Assume raining for safety
            rainfallMm: 10,
            temperature: 27,
            humidity: 80,
            description: 'Weather data unavailable - using estimate',
            lastUpdated: new Date(),
        },
        error,
    };
}

/**
 * Get human-readable weather description from WMO weather code
 */
function getWeatherDescription(code: number): string {
    const descriptions: Record<number, string> = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Foggy',
        48: 'Depositing rime fog',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        56: 'Light freezing drizzle',
        57: 'Dense freezing drizzle',
        61: 'Slight rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        66: 'Light freezing rain',
        67: 'Heavy freezing rain',
        71: 'Slight snow',
        73: 'Moderate snow',
        75: 'Heavy snow',
        77: 'Snow grains',
        80: 'Slight rain showers',
        81: 'Moderate rain showers',
        82: 'Violent rain showers',
        85: 'Slight snow showers',
        86: 'Heavy snow showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with slight hail',
        99: 'Thunderstorm with heavy hail',
    };

    return descriptions[code] || 'Unknown conditions';
}

/**
 * Check if current weather indicates flood risk
 */
export function assessFloodRisk(weather: WeatherData): {
    risk: 'low' | 'medium' | 'high' | 'critical';
    reason: string;
} {
    if (weather.rainfallMm >= 50) {
        return { risk: 'critical', reason: 'Very heavy rainfall detected (>50mm)' };
    }
    if (weather.rainfallMm >= 20) {
        return { risk: 'high', reason: 'Heavy rainfall detected (>20mm)' };
    }
    if (weather.rainfallMm >= 5 || weather.isRaining) {
        return { risk: 'medium', reason: 'Moderate rainfall - monitor conditions' };
    }
    return { risk: 'low', reason: 'No significant rainfall' };
}
