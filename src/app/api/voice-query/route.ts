import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { text, language = 'en-IN' } = await req.json();

        const languageNames: Record<string, string> = {
            'en-IN': 'English',
            'as-IN': 'Assamese',
            'hi-IN': 'Hindi',
            'bn-IN': 'Bengali',
        };
        const targetLang = languageNames[language] || 'English';

        const prompt = `
You are a flood relief assistant for Guwahati.

Rules:
- Reply in ${targetLang}
- Give general flood safety guidance
- Explain alerts simply
- Do not predict or speculate
- Do not give medical advice

User query: ${text}
`;

        // Using Google FLAN-T5-Large via Hugging Face Inference API
        const hfRes = await fetch(
            "https://api-inference.huggingface.co/models/google/flan-t5-large",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    inputs: prompt,
                    parameters: { max_new_tokens: 120 }
                })
            }
        );

        const hfData = await hfRes.json();
        console.log('[VoiceQuery] HF Response:', JSON.stringify(hfData));

        // Handle potential errors from HF
        if (hfData.error) {
            console.error('[VoiceQuery] HF Error:', hfData.error);
            throw new Error(hfData.error);
        }

        const reply =
            hfData?.[0]?.generated_text ||
            "Please stay safe and avoid flooded areas.";

        return NextResponse.json({ reply });
    } catch (error) {
        console.error('[VoiceQuery] Error:', error);
        return NextResponse.json({ reply: "I'm having trouble connecting to the network. Please follow local safety alerts." }, { status: 500 });
    }
}
