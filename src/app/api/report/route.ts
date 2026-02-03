
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        console.log('Received Report:', body);

        const { location, areaName, type, description, photoUrl, photoVerified, metadata } = body;

        // Insert into Supabase
        const { data, error } = await supabase
            .from('reports')
            .insert({
                location,
                area_name: areaName,
                type,
                description,
                image_url: photoUrl,
                status: photoVerified ? 'verified' : 'pending', // Trust app verification
                source: 'app',
                metadata: metadata || {}
            })
            .select()
            .single();

        if (error) {
            console.error('Supabase Error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        const response = NextResponse.json({
            success: true,
            id: data.id,
            message: 'Report saved to database'
        });

        // Add CORS headers
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        return response;

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function OPTIONS() {
    const response = new NextResponse(null, { status: 200 });
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
}
