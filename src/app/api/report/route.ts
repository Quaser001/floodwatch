import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        console.log('Received Report:', body);

        // In a real app, save to DB here.
        // For hackathon demo, we just return success.

        const response = NextResponse.json({
            success: true,
            message: 'Report received',
            id: 'mock-id-' + Date.now()
        });

        // CORS Headers
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        return response;
    } catch (error) {
        console.error('Report Error:', error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}

export async function OPTIONS(request: NextRequest) {
    const response = new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
    return response;
}
