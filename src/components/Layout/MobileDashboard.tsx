'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import AlertFeed from '@/components/Alerts/AlertFeed';
import { useFloodStore } from '@/lib/store';
import { whatsAppClient } from '@/lib/whatsapp/client';
import VoiceAssistant from '@/components/Voice/VoiceAssistant';
import WeatherWidget from '@/components/Weather/WeatherWidget';
import RoutingPanel, { RouteData } from '@/components/Routing/RoutingPanel';
import { Coordinates } from '@/lib/types';

// Dynamically import map
const FloodMap = dynamic(() => import('@/components/Map/FloodMap'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-slate-900/50">
            <div className="spinner" />
        </div>
    ),
});

interface MobileDashboardProps {
    onReportClick: () => void;
    onTelegramClick: () => void;
}

type MobileTab = 'map' | 'alerts' | 'report' | 'chat' | 'settings';

export default function MobileDashboard({ onReportClick, onTelegramClick }: MobileDashboardProps) {
    const [activeTab, setActiveTab] = useState<MobileTab>('map');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Feature: Navigation
    const [isRoutingOpen, setIsRoutingOpen] = useState(false);
    const [activeRoute, setActiveRoute] = useState<RouteData | null>(null);
    const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
    const [recenterTrigger, setRecenterTrigger] = useState(0); // For recenter button

    // Settings State
    const [language, setLanguage] = useState('English');
    const [textSize, setTextSize] = useState('M');
    const [theme, setTheme] = useState('dark');

    const { alerts, weather, simulateIncomingReport, addNotification } = useFloodStore();
    const activeAlerts = alerts.filter(a => a.isActive);

    // Live Location Tracking (Continuous)
    useEffect(() => {
        let watchId: number;

        if (navigator.geolocation) {
            watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    // TODO: In prod, smoothing algorithm here
                    setUserLocation({ lat: latitude, lng: longitude });
                },
                (err) => console.log('Location tracking error:', err),
                {
                    enableHighAccuracy: true,
                    maximumAge: 10000,
                    timeout: 5000
                }
            );
        } else {
            // Fallback for dev/browser without support
            setUserLocation({ lat: 26.1445, lng: 91.7362 });
        }

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, []);

    // Translations
    const translations: Record<string, Record<string, string>> = {
        'English': {
            'Alert Feed': 'Alert Feed',
            'Real-time community reports': 'Real-time community reports',
            'Report Hazard': 'Report Hazard',
            'Share location details': 'Share location & details to warn safe routes.',
            'Tap to Report': 'Tap to Report',
            'Connect': 'Connect',
            'Choose channel': 'Choose your preferred channel for updates.',
            'Settings': 'Settings',
            'Language': 'Language',
            'Text Size': 'Text Size',
            'Appearance': 'Appearance',
            'Navigate': 'Navigate',
            'Safe Route': 'Safe Route'
        },
        'Assamese': {
            'Alert Feed': 'সতৰ্কবাৰ্তা ফীড',
            'Real-time community reports': 'সময়মতে ৰাইজৰ তথ্য',
            'Report Hazard': 'বনিয়া ৰিপৰ্ট',
            'Share location details': 'সুৰক্ষিত পথৰ বাবে আপোনাৰ স্থান জনাওক',
            'Tap to Report': 'ৰিপৰ্ট কৰক',
            'Connect': 'সংযোগ',
            'Choose channel': 'আপোনাৰ পছন্দৰ মাধ্যমেৰে আপডেট লওক',
            'Settings': 'ছেটিং',
            'Language': 'ভাষা',
            'Text Size': 'আখৰৰ আকাৰ',
            'Appearance': 'ৰূপ',
            'Navigate': 'দিগদৰ্শন',
            'Safe Route': 'সুৰক্ষিত পথ'
        },
        'Hindi': {
            'Alert Feed': 'चेतावनी फीड',
            'Real-time community reports': 'रियल-टाइम सामुदायिक रिपोर्ट',
            'Report Hazard': 'बाढ़ की रिपोर्ट करें',
            'Share location details': 'सुरक्षित मार्गों के लिए स्थान साझा करें',
            'Tap to Report': 'रिपोर्ट करें',
            'Connect': 'संपर्क',
            'Choose channel': 'अपडेट के लिए अपना चैनल चुनें',
            'Settings': 'सेटिंग्स',
            'Language': 'भाषा',
            'Text Size': 'टेक्स्ट साइज़',
            'Appearance': 'दिखावट',
            'Navigate': 'नेविगेट',
            'Safe Route': 'सुरक्षित रास्ता'
        },
        'Bengali': {
            'Alert Feed': 'সতর্কতা ফিড',
            'Real-time community reports': 'রিয়েল-টাইম রিপোর্ট',
            'Report Hazard': 'বিপদ রিপোর্ট',
            'Share location details': 'নিরাপদ রুটের জন্য অবস্থান শেয়ার করুন',
            'Tap to Report': 'রিপোর্ট করুন',
            'Connect': 'সংযোগ',
            'Choose channel': 'আপডেটের জন্য চ্যানেল চয়ন করুন',
            'Settings': 'সেটিংস',
            'Language': 'ভাষা',
            'Text Size': 'পাঠ্য আকার',
            'Appearance': 'চেহারা',
            'Navigate': 'নেভিগেট',
            'Safe Route': 'নিরাপদ রুট'
        }
    };

    // Helper to get text
    const t = (key: string) => translations[language]?.[key] || key;

    // Font Size Class
    const getFontClass = (baseSize: string) => {
        // This is a simple scaler. In a real app we might use rem/em.
        // For demo, we will just rely on the 'textSize' selection affecting specific elements or root scale?
        // Let's affect the text classes directly.
        return '';
    };

    // Global Font Scale style
    const fontScale = {
        'S': 'text-xs',
        'M': 'text-sm',
        'L': 'text-base',
        'XL': 'text-lg'
    }[textSize];

    const headerScale = {
        'S': 'text-lg',
        'M': 'text-xl',
        'L': 'text-2xl',
        'XL': 'text-3xl'
    }[textSize];

    // Handle button click with event stopping
    const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
        e.stopPropagation();
        e.preventDefault();
        action();
    };

    const handleWhatsAppTest = async () => {
        try {
            addNotification('⏳ Sending WhatsApp Template...');
            await whatsAppClient.sendHelloWorld('test');
            addNotification('✅ WhatsApp Template Sent!');
        } catch (e) {
            console.error(e);
            addNotification('❌ WhatsApp Send Failed');
        }
    };

    return (
        <div className={`flex flex-col h-full bg-slate-950 mobile-dashboard rounded-[40px] overflow-hidden shadow-2xl border-[6px] border-slate-900 relative ${theme === 'light' ? 'invert' : ''}`} onClick={(e) => e.stopPropagation()}>

            {/* Header Overlay removed */}

            {/* Mobile Header Content */}
            <header className="absolute top-0 left-0 right-0 z-[1001] px-5 py-5 flex items-start justify-between">
                <div className="flex items-center gap-3">
                    {/* Hamburger Menu removed - available in bottom bar */}

                    {activeTab === 'map' && (
                        <div>
                            <h1 className={`${headerScale} font-black text-white tracking-tight drop-shadow-md`}>
                                Flood<span className="text-blue-500">Watch</span>
                            </h1>
                        </div>
                    )}
                </div>

                {/* Weather Widget - Inline with Header */}
                {activeTab === 'map' && (
                    <div className="transform scale-90 origin-right">
                        <WeatherWidget />
                    </div>
                )}
            </header>

            {/* Sidebar Drawer */}
            <div className={`absolute inset-0 z-[2000] transition-transform duration-300 ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {/* Backdrop */}
                <div
                    className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isDrawerOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => setIsDrawerOpen(false)}
                />

                {/* Drawer Content */}
                <div className="absolute top-0 left-0 bottom-0 w-3/4 bg-slate-900/95 backdrop-blur-xl border-r border-white/10 p-6 shadow-2xl">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className={`text-2xl font-bold text-white`}>{t('Settings')}</h2>
                        <button onClick={() => setIsDrawerOpen(false)} className="p-2 text-slate-400 hover:text-white">
                            ✕
                        </button>
                    </div>

                    <div className="space-y-2">
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 mb-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500" />
                                <div>
                                    <div className={`font-bold text-white ${fontScale}`}>Guest User</div>
                                    <div className={`text-xs text-slate-400 ${fontScale}`}>Guwahati Resident</div>
                                </div>
                            </div>
                        </div>

                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 mb-2">Dev Tools</div>

                        <button
                            onClick={(e) => { setIsDrawerOpen(false); handleButtonClick(e, simulateIncomingReport); }}
                            className="w-full flex items-center gap-3 p-4 rounded-xl bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 transition-colors text-left"
                        >
                            <span className="text-xl">⚡</span>
                            <span className={`font-semibold ${fontScale}`}>Simulate Flood Event</span>
                        </button>

                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 mt-6 mb-2">App</div>
                        <button
                            onClick={() => { setIsDrawerOpen(false); setActiveTab('settings'); }}
                            className="w-full flex items-center gap-3 p-4 rounded-xl text-slate-300 hover:bg-white/5 transition-colors text-left"
                        >
                            <span>⚙️</span>
                            <span className={fontScale}>{t('Settings')}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className={`flex-1 relative bg-slate-900 transition-transform duration-300 ${isDrawerOpen ? 'scale-95 opacity-80' : ''}`}>
                {activeTab === 'map' && (
                    <div className="h-full w-full relative">
                        <FloodMap
                            routeGeometry={activeRoute?.geometry}
                            userLocation={userLocation || undefined}
                            isMobile={true}
                            recenterTrigger={recenterTrigger}
                        />

                        {/* Weather Widget moved to header */}

                        {/* Recenter FAB - Single Smart Control */}
                        <button
                            onClick={() => setRecenterTrigger(prev => prev + 1)}
                            className="absolute bottom-28 right-4 z-[1001] w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-xl flex items-center justify-center active:scale-90 transition-transform"
                            title="Recenter on Me"
                        >
                            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>

                        {/* Floating Navigate Button */}
                        <div className="absolute bottom-28 left-4 z-[1001]">
                            <button
                                onClick={() => setIsRoutingOpen(true)}
                                className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-xl flex items-center justify-center active:scale-90 transition-transform"
                                title="Navigate"
                            >
                                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

                {/* Routing Bottom Sheet */}
                {isRoutingOpen && (
                    <div className="absolute bottom-0 left-0 right-0 z-[1005] bg-slate-900 border-t border-slate-700/50 rounded-t-[32px] shadow-2xl max-h-[70%] flex flex-col transition-transform animate-in slide-in-from-bottom">
                        <div className="w-full flex justify-center pt-3 pb-1">
                            <div className="w-12 h-1.5 bg-slate-700 rounded-full" />
                        </div>
                        <div className="p-5 overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className={`font-bold text-white ${headerScale}`}>{t('Safe Route')}</h3>
                                <button onClick={() => setIsRoutingOpen(false)} className="text-slate-400 p-2">✕</button>
                            </div>
                            <RoutingPanel
                                userLocation={userLocation}
                                onRouteCalculated={(route) => {
                                    setActiveRoute(route);
                                    setIsRoutingOpen(false); // Close panel to see map
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Alerts Tab */}
                {activeTab === 'alerts' && (
                    <div className="h-full overflow-y-auto w-full pt-24 pb-32 px-5 bg-gradient-to-b from-slate-900 to-black">
                        <div className="mb-6 mt-4">
                            <h2 className={`${headerScale} font-bold text-white mb-1`}>{t('Alert Feed')}</h2>
                            <p className={`${fontScale} text-slate-400`}>{t('Real-time community reports')}</p>
                        </div>
                        <AlertFeed />
                    </div>
                )}

                {/* Report Tab */}
                {activeTab === 'report' && (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-slate-900 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-[80px]" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]" />

                        <div className="relative z-10 glass-card p-8 rounded-[32px] border border-white/5 bg-white/5 backdrop-blur-xl">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-rose-500 to-orange-500 flex items-center justify-center mb-6 mx-auto shadow-xl shadow-rose-500/20">
                                <span className="text-4xl">🚨</span>
                            </div>
                            <h2 className={`${headerScale} font-bold text-white mb-2`}>{t('Report Hazard')}</h2>
                            <p className={`${fontScale} text-slate-400 mb-8 max-w-[240px] mx-auto leading-relaxed`}>
                                {t('Share location details')}
                            </p>
                            <button
                                onClick={(e) => handleButtonClick(e, onReportClick)}
                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 text-white font-bold text-lg shadow-lg shadow-rose-600/25 active:scale-95 transition-transform"
                            >
                                {t('Tap to Report')}
                            </button>
                        </div>
                    </div>
                )}

                {/* Chat Tab */}
                {activeTab === 'chat' && (
                    <div className="h-full flex flex-col justify-start pt-8 pb-32 px-5 bg-slate-900 relative">
                        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900 to-black pointer-events-none" />

                        <div className="relative z-10">
                            <h2 className={`text-3xl font-bold text-white mb-2 ${headerScale}`}>{t('Connect')}</h2>
                            <p className={`text-slate-400 mb-8 ${fontScale}`}>{t('Choose channel')}</p>

                            <div className="grid gap-4">
                                <button
                                    onClick={onTelegramClick}
                                    className="group relative overflow-hidden rounded-[24px] bg-[#229ED9]/10 border border-[#229ED9]/20 p-6 flex items-center gap-4 transition-all active:scale-95"
                                >
                                    <div className="w-12 h-12 rounded-full bg-[#229ED9] flex items-center justify-center text-white shadow-lg shadow-[#229ED9]/30">
                                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" /></svg>
                                    </div>
                                    <div className="text-left">
                                        <div className={`font-bold text-white text-lg group-hover:text-[#229ED9] transition-colors ${fontScale}`}>Telegram Bot</div>
                                        <div className={`text-xs text-slate-400 ${fontScale}`}>Automated reporting & alerts</div>
                                    </div>
                                </button>

                                <button
                                    onClick={handleWhatsAppTest}
                                    className="group relative overflow-hidden rounded-[24px] bg-[#25D366]/10 border border-[#25D366]/20 p-6 flex items-center gap-4 transition-all active:scale-95"
                                >
                                    <div className="w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center text-white shadow-lg shadow-[#25D366]/30">
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                        </svg>
                                    </div>
                                    <div className="text-left">
                                        <div className={`font-bold text-white text-lg group-hover:text-[#25D366] transition-colors ${fontScale}`}>WhatsApp</div>
                                        <div className={`text-xs text-slate-400 ${fontScale}`}>Join community alerts</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                    <div className="h-full pt-20 px-6 pb-32 bg-slate-900 overflow-y-auto">
                        <h2 className={`text-3xl font-bold text-white mb-6 ${headerScale}`}>{t('Settings')}</h2>

                        {/* Language */}
                        <div className="mb-8">
                            <label className="block text-sm text-slate-400 mb-3 uppercase tracking-wider font-semibold">{t('Language')}</label>
                            <div className="grid grid-cols-2 gap-3">
                                {['English', 'Assamese (অসমীয়া)', 'Bengali (বাংলা)', 'Hindi (हिंदी)'].map((lang) => (
                                    <button
                                        key={lang}
                                        onClick={() => setLanguage(lang.split(' ')[0])}
                                        className={`p-4 rounded-2xl border text-left transition-all ${language === lang.split(' ')[0]
                                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                                            : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                                            }`}
                                    >
                                        <span className={fontScale}>{lang}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Text Size */}
                        <div className="mb-8">
                            <label className="block text-sm text-slate-400 mb-3 uppercase tracking-wider font-semibold">{t('Text Size')}</label>
                            <div className="flex bg-slate-800 p-1 rounded-2xl">
                                {['S', 'M', 'L', 'XL'].map((size) => (
                                    <button
                                        key={size}
                                        onClick={() => setTextSize(size)}
                                        className={`flex-1 py-3 rounded-xl font-bold transition-all ${textSize === size
                                            ? 'bg-white text-slate-900 shadow-md transform scale-105'
                                            : 'text-slate-500 hover:text-white'
                                            }`}
                                    >
                                        <span className={size === 'S' ? 'text-xs' : size === 'M' ? 'text-sm' : size === 'L' ? 'text-lg' : 'text-xl'}>
                                            A
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Theme */}
                        <div className="mb-8">
                            <label className="block text-sm text-slate-400 mb-3 uppercase tracking-wider font-semibold">{t('Appearance')}</label>
                            <div className="flex bg-slate-800 p-1 rounded-2xl">
                                <button
                                    onClick={() => setTheme('dark')}
                                    className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${theme === 'dark'
                                        ? 'bg-slate-700 text-white shadow-md'
                                        : 'text-slate-500 hover:text-white'
                                        }`}
                                >
                                    <span>🌙</span> Dark
                                </button>
                                <button
                                    onClick={() => setTheme('light')}
                                    className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${theme === 'light'
                                        ? 'bg-white text-slate-900 shadow-md'
                                        : 'text-slate-500 hover:text-white'
                                        }`}
                                >
                                    <span>☀️</span> Light
                                </button>
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 text-center">
                            FloodWatch v1.0.0 (Hackathon Build)
                        </div>
                    </div>
                )}

                {/* Voice Assistant Overlay */}
                <VoiceAssistant position="absolute" className="bottom-44 right-4" />
            </div>

            {/* Floating Navigation Pill */}
            <div className="absolute bottom-6 left-6 right-6 z-[1002]">
                <nav className="h-[72px] bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-[28px] px-1 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] flex justify-between items-center relative">

                    {/* Map Tab */}
                    <button
                        onClick={(e) => { e.stopPropagation(); setActiveTab('map'); }}
                        className={`flex-1 flex flex-col items-center justify-center h-full transition-all duration-300 ${activeTab === 'map' ? 'text-blue-400 -translate-y-1' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <div className={`p-2 rounded-2xl transition-all ${activeTab === 'map' ? 'bg-blue-500/20' : 'bg-transparent'}`}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                        </div>
                    </button>

                    {/* Alerts Tab */}
                    <button
                        onClick={(e) => { e.stopPropagation(); setActiveTab('alerts'); }}
                        className={`flex-1 flex flex-col items-center justify-center h-full transition-all duration-300 ${activeTab === 'alerts' ? 'text-blue-400 -translate-y-1' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <div className={`p-2 rounded-2xl transition-all ${activeTab === 'alerts' ? 'bg-blue-500/20 relative' : 'bg-transparent relative'}`}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            {activeAlerts.length > 0 && (
                                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-slate-900" />
                            )}
                        </div>
                    </button>

                    {/* Main Action Button (Report) */}
                    <button
                        onClick={(e) => { e.stopPropagation(); setActiveTab('report'); }}
                        className="flex-1 -mt-8 flex justify-center"
                    >
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 border-4 border-slate-950 ${activeTab === 'report' ? 'bg-gradient-to-tr from-rose-500 to-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                            }`}>
                            <span className="text-2xl">🚨</span>
                        </div>
                    </button>

                    {/* Chat Tab */}
                    <button
                        onClick={(e) => { e.stopPropagation(); setActiveTab('chat'); }}
                        className={`flex-1 flex flex-col items-center justify-center h-full transition-all duration-300 ${activeTab === 'chat' ? 'text-blue-400 -translate-y-1' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <div className={`p-2 rounded-2xl transition-all ${activeTab === 'chat' ? 'bg-blue-500/20' : 'bg-transparent'}`}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                    </button>

                    {/* More/Menu Link */}
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsDrawerOpen(true); }}
                        className={`flex-1 flex flex-col items-center justify-center h-full transition-all duration-300 text-slate-500 hover:text-slate-300`}
                    >
                        <div className={`p-2 rounded-2xl bg-transparent`}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </div>
                    </button>
                </nav>
            </div>
        </div>
    );
}
