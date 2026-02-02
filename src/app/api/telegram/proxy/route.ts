import { NextRequest, NextResponse } from 'next/server';

const TELEGRAM_API_BASE = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

export async function POST(req: NextRequest) {
    // Only allow in development or if explicitly enabled
    // (For hackathon, we allow it always for the demo)

    try {
        const body = await req.json();
        const { method, params } = body;

        if (!method) {
            return NextResponse.json({ error: 'Method required' }, { status: 400 });
        }

        const response = await fetch(`${TELEGRAM_API_BASE}/${method}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params || {}),
        });

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Telegram Proxy Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
