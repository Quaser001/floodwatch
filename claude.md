# FloodWatch Guwahati

## Project Overview
FloodWatch Guwahati is a near-real-time urban flood alert prototype for Track 6: Urban Resilience (SDG-13). It combines citizen reports, weather data, AI photo verification, and simulated IoT sensors to generate localized flood alerts.

## Tech Stack
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind v4
- **State**: Zustand
- **Map**: Leaflet + react-leaflet
- **Database**: Supabase
- **Weather**: Open-Meteo API (free, no key required)
- **Photo Verification**: Gemini Vision API + Hugging Face
- **Notifications**: Telegram Bot API
- **ML Model**: XGBoost (simulated) for IoT sensor validation

## Project Structure
```
floodwatch/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── verify/route.ts    # Photo verification endpoint
│   │   │   └── weather/route.ts   # Weather data endpoint
│   │   ├── globals.css             # Premium design system
│   │   ├── layout.tsx
│   │   └── page.tsx                # Main dashboard
│   ├── components/
│   │   ├── Alerts/AlertFeed.tsx    # Alert list display
│   │   ├── Layout/Sidebar.tsx      # Navigation sidebar
│   │   ├── Map/FloodMap.tsx        # Leaflet map with markers
│   │   ├── ReportForm/             # Flood report submission
│   │   ├── Telegram/TelegramPreview.tsx  # Telegram bot preview
│   │   ├── UI/NotificationToast.tsx
│   │   └── Weather/WeatherWidget.tsx
│   └── lib/
│       ├── alertEngine.ts          # Rule-based alert logic
│       ├── gemini.ts               # Gemini Vision API
│       ├── geoUtils.ts             # Haversine, clustering
│       ├── huggingface.ts          # HF flood detection
│       ├── mlModel.ts              # XGBoost simulation
│       ├── openmeteo.ts            # Weather data fetching
│       ├── store.ts                # Zustand store
│       ├── supabase.ts             # Database client
│       ├── telegram.ts             # Alert broadcasting
│       └── types.ts                # TypeScript interfaces
└── .env.local                       # API keys
```

## Environment Variables
Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`
- `HUGGINGFACE_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `OPENWEATHERMAP_API_KEY` (backup)
- `WEATHERAPI_KEY` (backup)

## Key Features
1. **Citizen Flood Reporting** - GPS/map location, photo, description
2. **AI Photo Verification** - Gemini + HuggingFace flood detection
3. **Rule-Based Alert Engine** - Transparent confidence scoring
4. **Real Telegram Alerts** - Broadcasts to nearby users
5. **Interactive Map** - Flood pins, alert zones, heat visualization
6. **Simulated IoT Sensors** - XGBoost ML validation demo
7. **1-Minute Follow-Up Prompts** - "Is flooding still ongoing?"

## Commands
```bash
npm run dev     # Start development server
npm run build   # Production build
npm run start   # Production server
```

## Recent Fixes
- **CSS @import ordering** - Google Fonts import must precede Tailwind v4 import since it expands to CSS rules

## Demo Features
- "Simulate Report" button adds random flood reports
- "Simulate IoT Alert" triggers sensor events
- Pre-seeded demo data for GS Road, Zoo Road, Panbazar areas
