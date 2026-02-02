import { WhatsAppMessageRequest, WhatsAppResponse } from './types';

// Client-side wrapper that calls our API Proxy
export const whatsAppClient = {
    sendMessage: async (to: string, type: 'template' | 'text', content: any): Promise<WhatsAppResponse> => {
        const payload: WhatsAppMessageRequest = {
            messaging_product: 'whatsapp',
            to,
            type,
        };

        if (type === 'template') {
            payload.template = content;
        } else {
            payload.text = content;
        }

        const response = await fetch('/api/whatsapp/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Failed to send WhatsApp message');
        }

        return data;
    },

    sendHelloWorld: async (to: string) => {
        return whatsAppClient.sendMessage(to, 'template', {
            name: 'hello_world',
            language: { code: 'en_US' }
        });
    },

    sendText: async (to: string, body: string) => {
        return whatsAppClient.sendMessage(to, 'text', { body });
    }
};
