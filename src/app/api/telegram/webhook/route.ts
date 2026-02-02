import { NextRequest, NextResponse } from 'next/server';
import { handleTelegramUpdate } from '@/lib/telegram/handler';

export async function POST(req: NextRequest) {
    // This is the Production Webhook Endpoint
    // It uses the EXACT SAME handler as the Polling loop
    // But runs on the server.

    try {
        const update = await req.json();

        console.log('⚡ Webhook received update:', update.update_id);

        // Pass to common handler
        await handleTelegramUpdate(update);

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
