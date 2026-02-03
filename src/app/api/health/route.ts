import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        status: 'online',
        service: 'FloodWatch Backend',
        environment: process.env.NODE_ENV,
        demoMode: process.env.DEMO_MODE === 'true',
        timestamp: new Date().toISOString()
    });
}
