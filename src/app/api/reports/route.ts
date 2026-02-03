
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic'; // Ensure no caching

export async function GET(request: NextRequest) {
    try {
        // Fetch active reports (not rejected)
        // Default limit 50 for now
        const { data, error } = await supabase
            .from('reports')
            .select('*')
            .neq('status', 'rejected')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Supabase Fetch Error:', error);
            throw error;
        }

        const response = NextResponse.json({
            success: true,
            reports: data
        });

        // Add CORS headers
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

        return response;

    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to fetch reports' }, { status: 500 });
    }
}
