'use client';

import { useState } from 'react';
import { useFloodStore } from '@/lib/store';
import { whatsAppClient } from '@/lib/whatsapp/client';

interface SidebarProps {
    onReportClick: () => void;
    onTelegramClick: () => void;
}

export default function Sidebar({ onReportClick, onTelegramClick }: SidebarProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const { simulateIncomingReport, simulateSensorEvent, alerts, reports, addNotification } = useFloodStore();

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

    const menuItems = [
        {
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
            ),
            label: 'Map View',
            active: true,
        },
        {
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            ),
            label: 'Report Flood',
            onClick: onReportClick,
            highlight: true,
        },
        {
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
            ),
            label: 'Alerts',
            badge: alerts.filter(a => a.isActive).length,
        },
        {
            icon: (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                </svg>
            ),
            label: 'Telegram',
            onClick: onTelegramClick,
        },
    ];

    return (
        <aside
            className={`
        ${isExpanded ? 'w-72' : 'w-20'}
        transition-all duration-300 ease-out
        bg-slate-900/90 backdrop-blur-xl border-r border-slate-700/30
        flex flex-col relative z-20
      `}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
        >
            {/* Premium Logo Section */}
            <div className="p-4 border-b border-slate-700/30">
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <div className="w-12 h-12 rounded-xl logo-gradient flex items-center justify-center text-2xl shadow-lg transition-transform group-hover:scale-105">
                            🌊
                        </div>
                        {/* Glow effect */}
                        <div className="absolute inset-0 rounded-xl bg-blue-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'w-40 opacity-100' : 'w-0 opacity-0'}`}>
                        <h2 className="font-bold text-white text-lg whitespace-nowrap">FloodWatch</h2>
                        <p className="text-xs text-slate-400 whitespace-nowrap">Guwahati • Live</p>
                    </div>
                </div>
            </div>

            {/* Menu Items */}
            <nav className="flex-1 p-3 space-y-1.5">
                {menuItems.map((item, index) => (
                    <button
                        key={index}
                        onClick={item.onClick}
                        className={`
              w-full flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 group relative
              ${item.active
                                ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/10 text-blue-400 border border-blue-500/30'
                                : item.highlight
                                    ? 'bg-gradient-to-r from-red-500/15 to-orange-500/10 text-red-400 border border-red-500/25 hover:from-red-500/25 hover:to-orange-500/15'
                                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white border border-transparent'
                            }
            `}
                    >
                        <div className="relative">
                            <span className={`transition-transform duration-200 ${isExpanded ? '' : 'group-hover:scale-110'}`}>
                                {item.icon}
                            </span>
                            {item.badge && item.badge > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold px-1 shadow-lg shadow-red-500/30">
                                    {item.badge}
                                </span>
                            )}
                        </div>
                        <span className={`font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
                            {item.label}
                        </span>

                        {/* Tooltip when collapsed */}
                        {!isExpanded && (
                            <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl border border-slate-700/50">
                                {item.label}
                                <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45 border-l border-b border-slate-700/50" />
                            </div>
                        )}
                    </button>
                ))}
            </nav>

            {/* Demo Controls Section */}
            <div className="p-3 border-t border-slate-700/30 space-y-3">
                <button
                    onClick={simulateIncomingReport}
                    className={`
            w-full flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 group relative
            bg-gradient-to-r from-emerald-500/15 to-cyan-500/10 text-emerald-400 border border-emerald-500/25 
            hover:from-emerald-500/25 hover:to-cyan-500/15 hover:border-emerald-500/40
          `}
                >
                    <svg className="w-6 h-6 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className={`font-medium text-sm whitespace-nowrap overflow-hidden transition-all duration-300 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
                        Simulate Report
                    </span>

                    {/* Tooltip */}
                    {!isExpanded && (
                        <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl border border-slate-700/50">
                            Simulate Report
                            <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45 border-l border-b border-slate-700/50" />
                        </div>
                    )}
                </button>

                {/* IoT Sensor Trigger */}
                <button
                    onClick={() => simulateSensorEvent('sensor-1')} // Trigger Zoo Road Sensor
                    className={`
            w-full flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 group relative
            bg-gradient-to-r from-violet-500/15 to-fuchsia-500/10 text-violet-400 border border-violet-500/25 
            hover:from-violet-500/25 hover:to-fuchsia-500/15 hover:border-violet-500/40
          `}
                >
                    <svg className="w-6 h-6 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                    </svg>
                    <span className={`font-medium text-sm whitespace-nowrap overflow-hidden transition-all duration-300 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
                        Simulate IoT Alert
                    </span>

                    {/* Tooltip */}
                    {!isExpanded && (
                        <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl border border-slate-700/50">
                            Simulate IoT Alert
                            <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45 border-l border-b border-slate-700/50" />
                        </div>
                    )}
                </button>

                {/* WhatsApp Test Button */}
                <button
                    onClick={handleWhatsAppTest}
                    className={`
            w-full flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 group relative
            bg-gradient-to-r from-green-500/15 to-emerald-600/10 text-green-400 border border-green-500/25 
            hover:from-green-500/25 hover:to-emerald-600/15 hover:border-green-500/40
          `}
                >
                    <svg className="w-6 h-6 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    <span className={`font-medium text-sm whitespace-nowrap overflow-hidden transition-all duration-300 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
                        WhatsApp Test
                    </span>

                    {/* Tooltip */}
                    {!isExpanded && (
                        <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl border border-slate-700/50">
                            WhatsApp Test
                            <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45 border-l border-b border-slate-700/50" />
                        </div>
                    )}
                </button>

                {/* Stats when expanded */}
                <div className={`transition-all duration-300 overflow-hidden ${isExpanded ? 'opacity-100 max-h-40' : 'opacity-0 max-h-0'}`}>
                    <div className="glass-card p-4">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-medium">Live Statistics</p>
                        <div className="space-y-2.5">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-400">Total Reports</span>
                                <span className="text-lg text-white font-bold">{reports.length}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-400">Active Alerts</span>
                                <span className="text-lg text-red-400 font-bold">{alerts.filter(a => a.isActive).length}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Version Footer */}
            <div className={`p-3 border-t border-slate-700/30 transition-all duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
                <div className="text-center">
                    <p className="text-[10px] text-slate-600 uppercase tracking-widest">Track 6 • Urban Resilience</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">v1.0.0 • Hackathon Demo</p>
                </div>
            </div>
        </aside>
    );
}
