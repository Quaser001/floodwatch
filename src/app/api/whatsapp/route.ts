import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        status: 'online',
        message: 'WhatsApp webhook is ready. Configure Twilio to send POST requests to this URL.'
    });
}

export async function POST(request: NextRequest) {
    try {
        // Twilio sends data as application/x-www-form-urlencoded
        const formData = await request.formData();
        const body = formData.get('Body')?.toString() || '';
        const latitude = formData.get('Latitude');
        const longitude = formData.get('Longitude');
        const sender = formData.get('From');

        console.log(`WhatsApp from ${sender}: ${body} (Lat: ${latitude}, Lng: ${longitude})`);

        let message = '';

        if (latitude && longitude) {
            // Case 1: Location Received
            message = `🚨 *Flood Report Received!* \n\nWe have marked your location at [${latitude}, ${longitude}]. \n\nHelp is on the way. Stay safe!`;
        } else if (body.toLowerCase().includes('help') || body.toLowerCase().includes('start')) {
            // Case 2: Help/Start
            message = `👋 *Welcome to FloodWatch!* \n\nTo help us track floods:\n📍 *Send your current Location* to report a flood.\n📸 *Send a Photo* to verify severity.`;
        } else {
            // Case 3: General Text
            message = `I received: "${body}". \n\nTo report a flood, please tap the 📎 icon and select *Location*.`;
        }

        // Generate TwiML Response
        const xmlResponse = `
    <Response>
      <Message>${message}</Message>
    </Response>
    `;

        return new NextResponse(xmlResponse.trim(), {
            status: 200,
            headers: {
                'Content-Type': 'text/xml',
            },
        });

    } catch (error) {
        console.error('WhatsApp Error:', error);
        return new NextResponse('<Response><Message>Error processing message.</Message></Response>', {
            status: 200, // Return 200 even on error so Twilio doesn't retry endlessly
            headers: { 'Content-Type': 'text/xml' }
        });
    }
}
