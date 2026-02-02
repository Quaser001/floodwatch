'use client';

import { useEffect, useRef } from 'react';
import { telegramClient } from '@/lib/telegram/client';
import { handleTelegramUpdate } from '@/lib/telegram/handler';

export default function TelegramManager() {
    const isPolling = useRef(false);

    useEffect(() => {
        // Only run if we are in polling mode (Default behavior for this prototype)
        // In a real app, check process.env.NEXT_PUBLIC_TELEGRAM_MODE === 'polling'

        const startPolling = async () => {
            if (isPolling.current) return;
            isPolling.current = true;

            console.log('🔄 Telegram Polling Started...');

            let offset = 0;

            while (isPolling.current) {
                try {
                    // Call getUpdates
                    // We use a small timeout to avoid Next.js API route timeouts during the proxy call
                    const updates = await telegramClient.getUpdates(offset);

                    if (updates.length > 0) {
                        console.log(`📩 Received ${updates.length} Telegram updates`);
                        for (const update of updates) {
                            await handleTelegramUpdate(update);
                            offset = update.update_id + 1;
                        }
                    }
                } catch (error) {
                    console.error('Polling error (retrying in 5s):', error);
                    await new Promise(r => setTimeout(r, 5000));
                }

                // Wait a bit before next poll to be polite
                await new Promise(r => setTimeout(r, 2000));
            }
        };

        startPolling();

        return () => {
            isPolling.current = false;
        };
    }, []);

    return null; // Headless component
}
