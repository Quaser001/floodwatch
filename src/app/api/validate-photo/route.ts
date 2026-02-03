import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Strict validation prompt - forces YES/NO decision with reason
const FLOOD_VALIDATION_PROMPT = `You are a validation system for a flood alert application.

Task:
Determine whether the uploaded image clearly shows real-world flooding or waterlogging.

Definition of flooding:
- Visible water accumulated on roads, streets, pathways, or open ground
- Water obstructing vehicles or pedestrians
- Water caused by rainfall, drainage overflow, or river overflow

Rules:
- Respond ONLY in valid JSON
- Do NOT guess
- If unsure, return "is_flood": false

Output format:
{
  "is_flood": true | false,
  "confidence": "high" | "medium" | "low",
  "reason": "short explanation"
}`;

interface ValidationResult {
    is_flood: boolean;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
}

export async function POST(request: NextRequest) {
    try {
        const { image, demoMode } = await request.json();

        // DEMO override - always accept in demo mode
        if (demoMode) {
            return NextResponse.json({
                is_flood: true,
                confidence: 'high',
                reason: 'Demo mode - validation bypassed',
                validated: true,
            });
        }

        // Check for API key
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.warn('GEMINI_API_KEY not set, using demo fallback');
            return NextResponse.json({
                is_flood: true,
                confidence: 'medium',
                reason: 'API key not configured - accepting by default',
                validated: true,
            });
        }

        // Validate image data
        if (!image) {
            return NextResponse.json(
                { error: 'No image provided', validated: false },
                { status: 400 }
            );
        }

        // Extract base64 data (handle data URL format)
        let base64Data = image;
        let mimeType = 'image/jpeg';

        if (image.startsWith('data:')) {
            const matches = image.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
                mimeType = matches[1];
                base64Data = matches[2];
            }
        }

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        // Create timeout promise (5 seconds)
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Gemini API timeout')), 5000);
        });

        // Call Gemini Vision with timeout
        const validationPromise = model.generateContent([
            { text: FLOOD_VALIDATION_PROMPT },
            {
                inlineData: {
                    mimeType,
                    data: base64Data,
                },
            },
        ]);

        const result = await Promise.race([validationPromise, timeoutPromise]);
        const responseText = result.response.text();

        // Parse JSON response
        let validation: ValidationResult;
        try {
            // Clean up response (remove markdown code blocks if present)
            const cleanedText = responseText
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();
            validation = JSON.parse(cleanedText);
        } catch (parseError) {
            console.error('Failed to parse Gemini response:', responseText);
            // Fail closed - reject if we can't parse
            return NextResponse.json({
                is_flood: false,
                confidence: 'low',
                reason: 'Could not analyze image',
                validated: false,
            });
        }

        // Gate logic - conservative approach
        const accepted = validation.is_flood && validation.confidence !== 'low';

        const response = NextResponse.json({
            ...validation,
            validated: accepted,
        });

        // Add CORS headers
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        return response;

    } catch (error) {
        console.error('Photo validation error:', error);

        // Fail closed - reject on error
        const response = NextResponse.json({
            is_flood: false,
            confidence: 'low',
            reason: 'Validation service unavailable',
            validated: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        });

        response.headers.set('Access-Control-Allow-Origin', '*');
        return response;
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
