'use client';

import { useFloodStore } from '@/lib/store';
import { formatAlertMessage, formatFollowUpPrompt } from '@/lib/telegram';
import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface TelegramPreviewProps {
    onClose: () => void;
}

export default function TelegramPreview({ onClose }: TelegramPreviewProps) {
    const { alerts, respondToFollowUp } = useFloodStore();
    const [messages, setMessages] = useState<Array<{
        id: string;
        type: 'alert' | 'followup' | 'user';
        content: string;
        timestamp: Date;
        alertId?: string;
    }>>([]);

    // Generate messages from alerts
    useEffect(() => {
        const newMessages: typeof messages = [];

        alerts.forEach((alert) => {
            if (!alert.isActive) return;

            // Alert message
            newMessages.push({
                id: `alert-${alert.id}`,
                type: 'alert',
                content: formatAlertMessage(alert),
                timestamp: new Date(alert.triggeredAt),
                alertId: alert.id,
            });

            // Follow-up prompt (after 1 minute)
            const alertAge = Date.now() - new Date(alert.triggeredAt).getTime();
            if (alertAge > 60000) {
                newMessages.push({
                    id: `followup-${alert.id}`,
                    type: 'followup',
                    content: formatFollowUpPrompt(alert),
                    timestamp: new Date(new Date(alert.triggeredAt).getTime() + 60000),
                    alertId: alert.id,
                });
            }
        });

        // Sort by timestamp
        newMessages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setMessages(newMessages);
    }, [alerts]);

    const handleFollowUpResponse = (alertId: string, stillOngoing: boolean) => {
        respondToFollowUp(alertId, stillOngoing);
        // Add user response to messages
        setMessages((prev) => [
            {
                id: `user-${Date.now()}`,
                type: 'user',
                content: stillOngoing ? '✅ YES - Still flooding' : '❌ NO - Resolved',
                timestamp: new Date(),
            },
            ...prev,
        ]);
    };

    return (

        <div className="absolute inset-0 z-[5000] flex flex-col bg-[#0f172a] animate-fadeIn">
            {/* Telegram Header */}
            <div className="bg-[#1c2c3e]/90 backdrop-blur-xl px-4 py-3 flex items-center gap-3 border-b border-slate-700/30 pt-12">
                <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xl shadow-lg">
                    🌊
                </div>
                <div className="flex-1">
                    <h3 className="text-white font-semibold text-[15px]">FloodWatch Guwahati</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        bot • {alerts.filter(a => a.isActive).length} active alerts
                    </p>
                </div>
                <button className="p-2 text-slate-400 hover:bg-white/10 rounded-full transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-auto p-4 space-y-3 bg-slate-900" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}>
                {messages.length === 0 ? (
                    <div className="text-center text-slate-400 mt-16">
                        <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-4 animate-float">
                            <span className="text-3xl">📩</span>
                        </div>
                        <p className="font-medium text-white mb-1">No messages yet</p>
                        <p className="text-sm text-slate-500">Alerts will appear here when triggered</p>
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} stagger-item`}
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            <div
                                className={`
                                    max-w-[85%] rounded-2xl p-4 shadow-lg
                                    ${msg.type === 'user'
                                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md'
                                        : 'bg-slate-800/90 text-slate-200 rounded-bl-md border border-slate-700/30'
                                    }
                                `}
                            >
                                {/* Message content */}
                                <div className="whitespace-pre-wrap text-[13px] leading-relaxed">
                                    {msg.content}
                                </div>

                                {/* Follow-up buttons */}
                                {msg.type === 'followup' && msg.alertId && (
                                    <div className="mt-3 flex gap-2">
                                        <button
                                            onClick={() => handleFollowUpResponse(msg.alertId!, true)}
                                            className="flex-1 py-2.5 px-3 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-semibold hover:bg-emerald-500/30 transition-all active:scale-95 border border-emerald-500/30"
                                        >
                                            ✅ YES
                                        </button>
                                        <button
                                            onClick={() => handleFollowUpResponse(msg.alertId!, false)}
                                            className="flex-1 py-2.5 px-3 bg-red-500/20 text-red-400 rounded-xl text-sm font-semibold hover:bg-red-500/30 transition-all active:scale-95 border border-red-500/30"
                                        >
                                            ❌ NO
                                        </button>
                                    </div>
                                )}

                                {/* Timestamp */}
                                <div className={`text-[10px] mt-2 ${msg.type === 'user' ? 'text-blue-200' : 'text-slate-500'}`}>
                                    {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Input area */}
            <div className="bg-[#1c2c3e]/90 backdrop-blur-xl p-3 flex items-center gap-3 border-t border-slate-700/30 pb-8">
                <button className="p-2 text-slate-400 hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                </button>
                <div className="flex-1 bg-slate-700/50 rounded-full px-4 py-2.5 text-slate-500 text-sm border border-slate-600/30">
                    This is a notification bot...
                </div>
                <button className="p-2.5 bg-blue-500 rounded-full text-white shadow-lg shadow-blue-500/30 hover:bg-blue-400 transition-colors">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
