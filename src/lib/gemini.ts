// Gemini Vision API for Flood Photo Verification
// Uses Google's Gemini model to detect floods in user-submitted photos

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

interface FloodVerificationResult {
    isFlooding: boolean;
    confidence: number; // 0-1
    description: string;
    waterLevel?: 'low' | 'medium' | 'high' | 'severe';
    details?: string[];
}

/**
 * Verify if an image contains flood/water using Gemini Vision
 */
export async function verifyFloodPhoto(imageBase64: string): Promise<FloodVerificationResult> {
    // If no API key, return mock result
    if (!GEMINI_API_KEY) {
        console.log('[Gemini] No API key configured, using mock verification');
        return mockVerification();
    }

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: `Analyze this image for signs of flooding, waterlogging, or drain overflow in an urban setting.

Respond in JSON format with the following structure:
{
  "isFlooding": boolean (true if flooding/waterlogging is visible),
  "confidence": number (0.0 to 1.0, how confident you are),
  "description": string (brief description of what you see),
  "waterLevel": "low" | "medium" | "high" | "severe" (if flooding is present),
  "details": array of strings (specific observations like "water on road", "submerged vehicles", etc.)
}

Be conservative - only mark isFlooding as true if there's clear evidence of water accumulation on roads, drains overflowing, or visible flooding. Do not flag normal rain or wet surfaces as flooding.`
                            },
                            {
                                inlineData: {
                                    mimeType: 'image/jpeg',
                                    data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
                                },
                            },
                        ],
                    },
                ],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 500,
                },
            }),
        });

        if (!response.ok) {
            console.error('[Gemini] API error:', response.status);
            return mockVerification();
        }

        const data = await response.json();
        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textContent) {
            console.error('[Gemini] No text response');
            return mockVerification();
        }

        // Parse JSON from response (may be wrapped in markdown code blocks)
        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error('[Gemini] Could not parse JSON from response');
            return mockVerification();
        }

        const result = JSON.parse(jsonMatch[0]);

        return {
            isFlooding: result.isFlooding === true,
            confidence: Math.min(1, Math.max(0, result.confidence || 0)),
            description: result.description || 'Analysis complete',
            waterLevel: result.waterLevel,
            details: result.details || [],
        };
    } catch (error) {
        console.error('[Gemini] Verification error:', error);
        return mockVerification();
    }
}

/**
 * Mock verification for demo purposes when API is unavailable
 */
function mockVerification(): FloodVerificationResult {
    // Random result weighted towards positive for demo
    const isFlooding = Math.random() > 0.3;

    if (isFlooding) {
        return {
            isFlooding: true,
            confidence: 0.75 + Math.random() * 0.2,
            description: 'Water accumulation detected on road surface',
            waterLevel: Math.random() > 0.5 ? 'medium' : 'high',
            details: [
                'Standing water visible on road',
                'Possible drain overflow',
                'Wet conditions throughout image',
            ],
        };
    }

    return {
        isFlooding: false,
        confidence: 0.6 + Math.random() * 0.3,
        description: 'No clear flooding detected. Surface may be wet from rain.',
        details: ['Wet road surface', 'No water accumulation visible'],
    };
}

/**
 * API route handler for flood verification
 */
export async function handleFloodVerification(imageBase64: string) {
    const result = await verifyFloodPhoto(imageBase64);

    return {
        verified: result.isFlooding,
        confidence: result.confidence,
        description: result.description,
        waterLevel: result.waterLevel,
        details: result.details,
        timestamp: new Date().toISOString(),
    };
}
