'use client';

import { useFloodStore } from '@/lib/store';
import { formatDistanceToNow } from 'date-fns';

export default function AlertHistory() {
    const { alertHistory } = useFloodStore();

    if (alertHistory.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-6 text-slate-500">
                <span className="text-2xl mb-2">📜</span>
                <p className="text-xs">No alert history available</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {alertHistory.map((alert) => (
                <div key={alert.id} className="relative pl-4 border-l border-slate-700/50">
                    {/* Timeline Dot */}
                    <div className="absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full bg-slate-600 border-2 border-slate-900" />

                    <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                        <div className="flex items-start justify-between mb-1">
                            <h4 className="text-sm font-medium text-slate-300">{alert.areaName}</h4>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${alert.severity === 'critical' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                    alert.severity === 'high' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' :
                                        'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                                }`}>
                                {alert.type.replace('_', ' ')}
                            </span>
                        </div>

                        <div className="text-xs text-slate-500 mb-2">
                            Resolved {formatDistanceToNow(alert.expiresAt, { addSuffix: true })}
                        </div>

                        <div className="flex items-center gap-3 text-[10px] text-slate-500">
                            <div className="flex items-center gap-1">
                                <span>👥</span>
                                <span>{alert.notifiedUsers} notified</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span>📝</span>
                                <span>{alert.reportCount} reports</span>
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            <div className="text-center pt-2">
                <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                    View Full History
                </button>
            </div>
        </div>
    );
}
