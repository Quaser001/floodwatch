import { NextRequest, NextResponse } from 'next/server';

const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const API_VERSION = 'v22.0';

export async function POST(req: NextRequest) {
    if (!PHONE_ID || !ACCESS_TOKEN) {
        return NextResponse.json({ error: 'Missing Credentials' }, { status: 500 });
    }

    try {
        const body = await req.json();

        // Resolve 'test' recipient
        if (body.to === 'test') {
            body.to = process.env.WHATSAPP_TEST_NUMBER;
        }

        if (!body.to) {
            return NextResponse.json({ error: 'Recipient required' }, { status: 400 });
        }

        // Forward request to Facebook Graph API
        const response = await fetch(`https://graph.facebook.com/${API_VERSION}/${PHONE_ID}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('WhatsApp API Failure:', data);
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Internal WhatsApp Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
