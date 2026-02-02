'use client';

import { useFloodStore } from '@/lib/store';
import { formatDistanceToNow } from 'date-fns';

export default function AlertFeed() {
    const { alerts, respondToFollowUp } = useFloodStore();
    const activeAlerts = alerts.filter((a) => a.isActive);

    if (activeAlerts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 flex items-center justify-center animate-float">
                        <span className="text-4xl">✅</span>
                    </div>
                    <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" style={{ animationDuration: '3s' }} />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">All Clear</h3>
                <p className="text-sm text-slate-400 max-w-[200px]">
                    No active flood alerts in Guwahati. The system is monitoring.
                </p>
                <div className="mt-6 flex items-center gap-2 text-xs text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Actively monitoring
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {activeAlerts.map((alert, index) => {
                const severityStyles = {
                    critical: {
                        border: 'border-l-red-500',
                        bg: 'bg-gradient-to-r from-red-500/15 to-red-500/5',
                        badge: 'badge-critical',
                        icon: '🔴',
                        glow: 'shadow-red-500/10',
                    },
                    high: {
                        border: 'border-l-orange-500',
                        bg: 'bg-gradient-to-r from-orange-500/15 to-orange-500/5',
                        badge: 'badge-high',
                        icon: '🟠',
                        glow: 'shadow-orange-500/10',
                    },
                    medium: {
                        border: 'border-l-yellow-500',
                        bg: 'bg-gradient-to-r from-yellow-500/15 to-yellow-500/5',
                        badge: 'badge-medium',
                        icon: '🟡',
                        glow: 'shadow-yellow-500/10',
                    },
                }[alert.severity];

                const typeIcon = {
                    flood: '🌊',
                    waterlogging: '💧',
                    drain_overflow: '🚰',
                }[alert.type];

                const timeAgo = formatDistanceToNow(new Date(alert.triggeredAt), { addSuffix: true });

                return (
                    <div
                        key={alert.id}
                        className={`
              stagger-item
              glass-card p-4 border-l-4 ${severityStyles.border} ${severityStyles.bg}
              hover:translate-x-1 transition-all cursor-pointer group
              shadow-lg ${severityStyles.glow}
            `}
                        style={{ animationDelay: `${index * 0.08}s` }}
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-800/80 flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
                                    {typeIcon}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white text-sm leading-tight">{alert.areaName}</h3>
                                    <p className="text-xs text-slate-400 capitalize mt-0.5">
                                        {alert.type.replace('_', ' ')}
                                    </p>
                                </div>
                            </div>
                            <span className={`badge ${severityStyles.badge} text-[10px]`}>
                                {severityStyles.icon} {alert.severity}
                            </span>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/30">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Reports</span>
                                <p className="text-white font-bold text-lg">{alert.reportCount}</p>
                            </div>
                            <div className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/30">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Confidence</span>
                                <div className="flex items-center gap-1">
                                    <p className="text-white font-bold text-lg">{alert.confidenceScore}</p>
                                    <span className="text-slate-500 text-sm">/10</span>
                                </div>
                            </div>
                        </div>

                        {/* Notification Status */}
                        <div className="flex items-center gap-2 text-xs text-emerald-400 mb-3 p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>{alert.notifiedUsers} users notified via Telegram</span>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-700/30">
                            <span className="text-slate-500 flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {timeAgo}
                            </span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    respondToFollowUp(alert.id, false);
                                }}
                                className="text-slate-400 hover:text-red-400 transition-colors font-medium flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-red-500/10"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Resolve
                            </button>
                        </div>

                        {/* Suggested Actions (expandable) */}
                        {alert.suggestedActions.length > 0 && (
                            <details className="mt-3 pt-3 border-t border-slate-700/30 group/details">
                                <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-300 transition-colors flex items-center gap-2 font-medium">
                                    <svg className="w-4 h-4 transition-transform group-open/details:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                    Suggested Actions ({alert.suggestedActions.length})
                                </summary>
                                <ul className="mt-3 space-y-2">
                                    {alert.suggestedActions.map((action, i) => (
                                        <li key={i} className="text-xs text-slate-300 pl-3 border-l-2 border-blue-500/50 py-1 hover:bg-slate-800/30 rounded-r-md transition-colors">
                                            {action}
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
