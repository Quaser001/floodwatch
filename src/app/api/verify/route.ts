// API Route: Flood Photo Verification
// Uses Hugging Face for flood detection with Gemini as fallback

import { NextRequest, NextResponse } from 'next/server';
import { verifyFloodPhoto as hfVerify } from '@/lib/huggingface';
import { handleFloodVerification as geminiVerify } from '@/lib/gemini';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { image } = body;

        if (!image) {
            return NextResponse.json(
                { error: 'Image data is required', verified: false },
                { status: 400 }
            );
        }

        // Try Hugging Face first (specialized flood detection)
        try {
            const hfResult = await hfVerify(image);
            if (hfResult.confidence > 0.5) {
                return NextResponse.json({
                    ...hfResult,
                    source: 'huggingface',
                    timestamp: new Date().toISOString(),
                });
            }
        } catch (hfError) {
            console.error('[Verify API] HuggingFace error:', hfError);
        }

        // Fallback to Gemini
        try {
            const geminiResult = await geminiVerify(image);
            return NextResponse.json({
                ...geminiResult,
                source: 'gemini',
                timestamp: new Date().toISOString(),
            });
        } catch (geminiError) {
            console.error('[Verify API] Gemini error:', geminiError);
        }

        // If both fail, return conservative result
        return NextResponse.json({
            verified: true, // Conservative - assume flood if can't verify
            confidence: 0.5,
            description: 'Unable to verify photo - accepting report',
            method: 'fallback',
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Verify API] Error:', error);
        return NextResponse.json(
            {
                error: 'Verification service unavailable',
                verified: true, // Accept report anyway
                confidence: 0.3,
            },
            { status: 200 } // Don't fail the request
        );
    }
}
