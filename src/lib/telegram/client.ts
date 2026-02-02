import { TelegramUpdate } from './types';

const TELEGRAM_API_BASE = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

// Helper to call API (Isomorphic)
async function callApi(method: string, params: any = {}) {
    // Server-side (Webhook mode)
    if (typeof window === 'undefined') {
        const response = await fetch(`${TELEGRAM_API_BASE}/${method}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        });
        return response.json();
    }
    // Client-side (Polling mode)
    else {
        const response = await fetch('/api/telegram/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ method, params }),
        });
        return response.json();
    }
}

export const telegramClient = {
    getUpdates: async (offset?: number): Promise<TelegramUpdate[]> => {
        const result = await callApi('getUpdates', {
            offset,
            timeout: 30, // Long polling
            allowed_updates: ['message', 'callback_query']
        });

        if (result.ok) {
            return result.result;
        }
        throw new Error(result.description || 'Failed to get updates');
    },

    sendMessage: async (chatId: number, text: string, options: any = {}) => {
        return callApi('sendMessage', {
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            ...options
        });
    },

    sendLocation: async (chatId: number, lat: number, lng: number) => {
        return callApi('sendLocation', {
            chat_id: chatId,
            latitude: lat,
            longitude: lng
        });
    }
};
