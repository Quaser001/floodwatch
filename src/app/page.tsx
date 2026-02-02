'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import map component to avoid SSR issues with Leaflet
const FloodMap = dynamic(() => import('@/components/Map/FloodMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-900/50 rounded-2xl">
      <div className="spinner" />
    </div>
  ),
});

import Sidebar from '@/components/Layout/Sidebar';
import MobileDashboard from '@/components/Layout/MobileDashboard';
import AlertFeed from '@/components/Alerts/AlertFeed';
import AlertHistory from '@/components/Alerts/AlertHistory';
import ReportForm from '@/components/ReportForm/FloodReportForm';
import WeatherWidget from '@/components/Weather/WeatherWidget';
import TelegramPreview from '@/components/Telegram/TelegramPreview';
import NotificationToast from '@/components/UI/NotificationToast';
import IoTSensorPanel from '@/components/IoT/IoTSensorPanel';
import LocationPermission from '@/components/UI/LocationPermission';
import RoutingPanel, { RouteData } from '@/components/Routing/RoutingPanel';
import CollapsiblePanel from '@/components/UI/CollapsiblePanel';
import TelegramManager from '@/components/Telegram/TelegramManager';
import VoiceAssistant from '@/components/Voice/VoiceAssistant';
import { useFloodStore } from '@/lib/store';
import { Coordinates } from '@/lib/types';

// View mode context
type ViewMode = 'desktop' | 'mobile';
const ViewModeContext = createContext<{ viewMode: ViewMode; setViewMode: (mode: ViewMode) => void }>({
  viewMode: 'desktop',
  setViewMode: () => { },
});

export const useViewMode = () => useContext(ViewModeContext);

export default function Dashboard() {
  const [showReportForm, setShowReportForm] = useState(false);
  const [showTelegramPreview, setShowTelegramPreview] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteData | null>(null);
  const { initializeUser, seedDemoData, alerts } = useFloodStore();

  useEffect(() => {
    initializeUser();
    seedDemoData();
  }, [initializeUser, seedDemoData]);

  // Live clock
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const criticalCount = alerts.filter(a => a.isActive && a.severity === 'critical').length;
  const highCount = alerts.filter(a => a.isActive && a.severity === 'high').length;
  const mediumCount = alerts.filter(a => a.isActive && a.severity === 'medium').length;
  const totalActive = alerts.filter(a => a.isActive).length;

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode }}>
      <TelegramManager />
      {/* Device Toggle */}
      <div className={`fixed ${viewMode === 'mobile' ? 'top-6' : 'bottom-6'} right-6 z-[9999] flex items-center gap-2`}>
        <div className="glass-card px-4 py-2 flex items-center gap-3 shadow-2xl border border-slate-600/50">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">View</span>
          <div className="flex items-center bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('desktop')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'desktop' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:text-white'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Desktop
            </button>
            <button
              onClick={() => setViewMode('mobile')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'mobile' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:text-white'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Mobile
            </button>
          </div>
        </div>
      </div>

      {/* Desktop View */}
      {viewMode === 'desktop' && (
        <div className="min-h-screen bg-slate-950 flex relative">
          <Sidebar
            onReportClick={() => setShowReportForm(true)}
            onTelegramClick={() => setShowTelegramPreview(true)}
          />
          <main className="flex-1 p-4 lg:p-6 overflow-hidden relative z-10">
            <div className="h-full flex flex-col gap-4">
              {/* Header */}
              <header className="glass-card p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl logo-gradient flex items-center justify-center text-2xl shadow-lg">🌊</div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      </div>
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-gradient">FloodWatch Guwahati</h1>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-sm text-slate-400">Community-driven flood alert system</p>
                        <span className="badge badge-live text-xs">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          Live
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <WeatherWidget />
                    <div className="glass-card px-4 py-2 text-center hide-mobile">
                      <div className="text-xs text-slate-500 uppercase tracking-wider">Local Time</div>
                      <div className="text-lg font-semibold text-white font-mono">{currentTime}</div>
                    </div>
                    <button onClick={() => setShowReportForm(true)} className="btn btn-danger group">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-semibold">Report Flood</span>
                    </button>
                  </div>
                </div>
              </header>

              {/* Main Grid */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
                <div className="lg:col-span-3 glass-card overflow-hidden">
                  <FloodMap routeGeometry={activeRoute?.geometry} />
                </div>
                <div className="lg:col-span-1 flex flex-col gap-2 overflow-auto max-h-[calc(100vh-220px)]">
                  {/* Location Permission */}
                  <CollapsiblePanel
                    title="Your Location"
                    subtitle="Real coordinates"
                    icon="📍"
                    badge={<span className="badge badge-success text-xs">LIVE</span>}
                  >
                    <LocationPermission onLocationGranted={setUserLocation} />
                  </CollapsiblePanel>

                  {/* Safe Routing */}
                  <CollapsiblePanel
                    title="Safe Routing"
                    subtitle="Avoid flood zones"
                    icon="🧭"
                  >
                    <RoutingPanel userLocation={userLocation} onRouteCalculated={setActiveRoute} />
                  </CollapsiblePanel>

                  {/* Alert Feed */}
                  <CollapsiblePanel
                    title="Active Alerts"
                    subtitle="Real-time flood reports"
                    icon="🚨"
                    badge={totalActive > 0 ? (
                      <span className="badge badge-critical">
                        <span className="status-dot critical" />
                        {totalActive} Active
                      </span>
                    ) : undefined}
                    defaultExpanded={true}
                  >
                    <div className="max-h-[200px] overflow-auto">
                      <AlertFeed />
                    </div>
                  </CollapsiblePanel>

                  {/* Alert History */}
                  <CollapsiblePanel
                    title="Alert History"
                    subtitle="Past resolved incidents"
                    icon="📜"
                  >
                    <div className="max-h-[200px] overflow-auto">
                      <AlertHistory />
                    </div>
                  </CollapsiblePanel>

                  {/* IoT Sensor Panel */}
                  <CollapsiblePanel
                    title="IoT Sensors"
                    subtitle="Water level monitoring"
                    icon="📡"
                  >
                    <IoTSensorPanel />
                  </CollapsiblePanel>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="glass-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                      <div className="status-dot critical" />
                      <div>
                        <span className="text-2xl font-bold text-white">{criticalCount}</span>
                        <span className="text-sm text-slate-400 ml-2">Critical</span>
                      </div>
                    </div>
                    <div className="w-px h-8 bg-slate-700/50" />
                    <div className="flex items-center gap-3">
                      <div className="status-dot high" />
                      <div>
                        <span className="text-2xl font-bold text-white">{highCount}</span>
                        <span className="text-sm text-slate-400 ml-2">High</span>
                      </div>
                    </div>
                    <div className="w-px h-8 bg-slate-700/50" />
                    <div className="flex items-center gap-3">
                      <div className="status-dot medium" />
                      <div>
                        <span className="text-2xl font-bold text-white">{mediumCount}</span>
                        <span className="text-sm text-slate-400 ml-2">Medium</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-slate-400">System Operational</span>
                    </div>
                    <div className="text-slate-500 text-sm">Updated: {currentTime}</div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* Mobile View */}
      {viewMode === 'mobile' && (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>

          {/* Phone Frame */}
          <div className="relative">
            <div className="w-[400px] h-[850px] bg-slate-800 rounded-[52px] p-3 shadow-2xl border border-slate-700/50 relative">
              <div className="absolute -right-1 top-28 w-1 h-16 bg-slate-700 rounded-r-lg" />
              <div className="absolute -left-1 top-24 w-1 h-8 bg-slate-700 rounded-l-lg" />
              <div className="absolute -left-1 top-36 w-1 h-12 bg-slate-700 rounded-l-lg" />

              <div className="w-full h-full rounded-[42px] overflow-hidden flex flex-col relative" style={{ background: 'linear-gradient(180deg, #030712 0%, #0f172a 100%)' }}>
                {/* Status bar */}
                <div className="flex items-center justify-between px-6 py-2 text-white/70 text-xs bg-black/30 backdrop-blur-sm relative z-10">
                  <span className="font-medium">9:41</span>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2c-3.87-3.86-10.14-3.86-14 0z" />
                    </svg>
                    <div className="w-6 h-3 rounded-sm border border-white/50 flex items-center p-0.5">
                      <div className="w-4 h-full bg-emerald-400 rounded-sm"></div>
                    </div>
                  </div>
                </div>

                {/* Mobile Dashboard Content */}
                <div className="flex-1 overflow-hidden">
                  <MobileDashboard
                    onReportClick={() => setShowReportForm(true)}
                    onTelegramClick={() => setShowTelegramPreview(true)}
                  />
                </div>

                {/* Home indicator */}
                <div className="py-2 flex justify-center bg-black/30 backdrop-blur-sm">
                  <div className="w-32 h-1 bg-white/20 rounded-full"></div>
                </div>
              </div>
            </div>

            <div className="absolute top-5 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-10" />
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2">
              <span className="text-slate-500 text-sm font-medium">Android Mobile Preview</span>
              <span className="badge badge-info text-[10px]">375×812</span>
            </div>
          </div>
        </div>
      )}

      {/* Report Form Modal */}
      {showReportForm && <ReportForm onClose={() => setShowReportForm(false)} />}

      {/* Telegram Preview Modal */}
      {showTelegramPreview && <TelegramPreview onClose={() => setShowTelegramPreview(false)} />}

      {/* Voice Assistant Overlay - Only for Desktop view (Mobile has its own) */}
      {viewMode === 'desktop' && <VoiceAssistant />}

      {/* Notification Toasts */}
      <NotificationToast />
    </ViewModeContext.Provider>
  );
}
