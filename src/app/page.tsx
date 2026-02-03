'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

import MobileDashboard from '@/components/Layout/MobileDashboard';
import ReportForm from '@/components/ReportForm/FloodReportForm';
import TelegramPreview from '@/components/Telegram/TelegramPreview';
import NotificationToast from '@/components/UI/NotificationToast';
import TelegramManager from '@/components/Telegram/TelegramManager';
import { useFloodStore } from '@/lib/store';

export default function Dashboard() {
  const [showReportForm, setShowReportForm] = useState(false);
  const [showTelegramPreview, setShowTelegramPreview] = useState(false);
  const { initializeUser, seedDemoData } = useFloodStore();

  useEffect(() => {
    initializeUser();
    seedDemoData();
  }, [initializeUser, seedDemoData]);

  return (
    <>
      <TelegramManager />

      {/* Mobile-First Field Application */}
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        {/* Phone Frame */}
        <div className="relative">
          <div className="w-[400px] h-[850px] bg-slate-800 rounded-[52px] p-3 shadow-2xl border border-slate-700/50 relative">
            {/* Physical buttons */}
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

              {/* Report Form Modal */}
              {showReportForm && <ReportForm onClose={() => setShowReportForm(false)} />}

              {/* Telegram Preview Modal */}
              {showTelegramPreview && <TelegramPreview onClose={() => setShowTelegramPreview(false)} />}

              {/* Notification Toasts */}
              <NotificationToast />
            </div>
          </div>

          {/* Dynamic notch removed */}
        </div>
      </div>
    </>
  );
}
