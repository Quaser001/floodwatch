'use client';

import { useFloodStore } from '@/lib/store';

export default function NotificationToast() {
    const { notifications, clearNotification } = useFloodStore();

    if (notifications.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 space-y-3 max-w-md">
            {notifications.map((message, index) => (
                <div
                    key={index}
                    className="toast animate-slideIn flex items-start gap-3"
                    onClick={() => clearNotification(index)}
                >
                    <div className="flex-1">
                        <p className="text-sm text-white">{message}</p>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            clearNotification(index);
                        }}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            ))}
        </div>
    );
}
