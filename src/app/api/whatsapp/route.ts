import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    console.log("WhatsApp webhook hit");

    const xmlResponse = `
    <Response>
      <Message>Thanks! Your message has been received.</Message>
    </Response>
    `;

    return new NextResponse(xmlResponse.trim(), {
        status: 200,
        headers: {
            'Content-Type': 'text/xml',
        },
    });
}
