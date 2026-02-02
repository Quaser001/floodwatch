import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const q = req.nextUrl.searchParams.get('q') || 'Guwahati';
    const days = req.nextUrl.searchParams.get('days') || '3';

    // 1. Try WeatherAPI.com (User's Key)
    try {
        const apiKey = process.env.WEATHERAPI_KEY;
        if (apiKey) {
            const url = `http://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${q}&days=${days}&aqi=no&alerts=yes`;
            const res = await fetch(url);

            if (res.ok) {
                const data = await res.json();
                return NextResponse.json(data);
            }
            console.warn(`WeatherAPI failed: ${res.statusText}. Falling back to Open-Meteo.`);
        }
    } catch (error) {
        console.error('WeatherAPI fetch error:', error);
    }

    // 2. Fallback: Open-Meteo (No Key)
    try {
        console.log('Using Open-Meteo fallback...');
        // Guwahati coordinates
        const lat = 26.1445;
        const lon = 91.7362;

        const omUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,precipitation_sum,weathercode&timezone=auto&forecast_days=${days}`;

        const res = await fetch(omUrl);
        if (!res.ok) throw new Error('Open-Meteo failed');

        const omData = await res.json();

        // Transform Open-Meteo format to match WeatherAPI format expected by frontend
        const transformedData = {
            forecast: {
                forecastday: omData.daily.time.map((date: string, index: number) => ({
                    date: date,
                    day: {
                        avgtemp_c: omData.daily.temperature_2m_max[index],
                        totalprecip_mm: omData.daily.precipitation_sum[index],
                        condition: {
                            text: getWeatherDescription(omData.daily.weathercode[index]),
                            icon: getWeatherIcon(omData.daily.weathercode[index])
                        }
                    }
                }))
            }
        };

        return NextResponse.json(transformedData);

    } catch (fallbackError: any) {
        console.error('Fallback Error:', fallbackError);
        return NextResponse.json({ error: 'Failed to fetch weather data from all sources.' }, { status: 500 });
    }
}

// Helpers for Open-Meteo mapping
function getWeatherDescription(code: number): string {
    if (code <= 3) return 'Clear/Cloudy';
    if (code <= 67) return 'Rainy';
    if (code <= 77) return 'Snow';
    if (code <= 82) return 'Heavy Rain';
    if (code <= 99) return 'Thunderstorm';
    return 'Unknown';
}

function getWeatherIcon(code: number): string {
    // Return relative URL or standard CDN icon matching WeatherAPI style roughly
    // Using WeatherAPI's CDN pattern for consistency if possible, or just generic placeholders
    // For now, mapping to WeatherAPI codes roughly
    if (code <= 3) return '//cdn.weatherapi.com/weather/64x64/day/116.png'; // Cloudy
    if (code <= 67) return '//cdn.weatherapi.com/weather/64x64/day/308.png'; // Rain
    if (code <= 99) return '//cdn.weatherapi.com/weather/64x64/day/200.png'; // Storm
    return '//cdn.weatherapi.com/weather/64x64/day/113.png'; // Sunny
}
