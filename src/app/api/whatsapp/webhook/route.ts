import { NextRequest, NextResponse } from 'next/server';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'floodwatch_guwahati_secret';

// Handle Webhook Verification (GET)
export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('✅ WhatsApp Webhook Verified');
            return new NextResponse(challenge, { status: 200 });
        } else {
            console.error('❌ WhatsApp Webhook Verification Failed: Invalid Token');
            return new NextResponse('Forbidden', { status: 403 });
        }
    }
    return new NextResponse('Bad Request', { status: 400 });
}

// Handle Incoming Messages (POST)
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        console.log('📨 WhatsApp Webhook Payload:', JSON.stringify(body, null, 2));

        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];

        if (message) {
            const from = message.from; // Sender phone number
            const type = message.type;
            const text = message.text?.body;

            console.log(`[WhatsApp] From ${from}: ${text || `[${type}]`}`);

            // TODO: Process message (e.g., link to Flood Store)
            // For now, we just log it as successful receipt.
        }

        return new NextResponse('EVENT_RECEIVED', { status: 200 });
    } catch (error) {
        console.error('WhatsApp Webhook Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
