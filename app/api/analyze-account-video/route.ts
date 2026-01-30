import { NextRequest, NextResponse } from 'next/server';
import { fetchWithTimeout, API_TIMEOUTS } from '@/lib/fetchWithTimeout';
import { GrokResponsesApiSchema, extractGrokResponsesContent, getCorsHeaders } from '@/lib/schemas';
import { canProceed, recordFailure, recordSuccess } from '@/lib/circuit-breaker';

export async function OPTIONS() {
    return NextResponse.json(null, { headers: getCorsHeaders() });
}

export async function POST(req: NextRequest) {
    const corsHeaders = getCorsHeaders();

    try {
        const { handle } = await req.json();

        // Validate X handle format (1-15 alphanumeric characters + underscores)
        const HANDLE_REGEX = /^[a-zA-Z0-9_]{1,15}$/;
        if (!handle || !HANDLE_REGEX.test(handle)) {
            console.error('Invalid handle format:', handle);
            return NextResponse.json(
                { error: 'Invalid X handle format. Handles must be 1-15 characters and contain only letters, numbers, and underscores.' },
                { status: 400, headers: corsHeaders }
            );
        }

        const xaiApiKey = process.env.XAI_API_KEY;
        if (!xaiApiKey) {
            console.error('XAI_API_KEY is not configured');
            return NextResponse.json(
                { error: 'XAI_API_KEY is not configured' },
                { status: 500, headers: corsHeaders }
            );
        }

        console.log(`Analyzing X account for VIDEO: @${handle}`);

        // Video-focused system prompt - Following Official Grok Imagine Best Practices
        // Formula: SUBJECT + MOTION + SCENE + CAMERA + STYLE + AUDIO
        const systemPrompt = `You are an expert Video Director AI creating prompts for xAI's Grok Imagine video generator. Your goal is to translate an X account's essence into a CONCISE, COHERENT video prompt.

CRITICAL: Search the account thoroughly to understand their niche and personality.

=== OFFICIAL GROK IMAGINE PROMPT FORMULA ===
Structure your prompt in this exact order:
1. SUBJECT: Vivid description of main character (appearance, dress, posture)
2. MOTION: Specific action with intensity adverbs (quickly, violently, wildly, intensely, gracefully)
3. SCENE: Environment details (natural or built setting)
4. CAMERA: Movement type (pan right, follow-shot, slow-motion, drone pan, tracking shot)
5. STYLE: Visual style (photorealistic 4K, cinematic, synthwave, cyberpunk, Pixar-style)
6. AUDIO: Sound/music cue (upbeat synth track, epic orchestral swell, ambient rain)

=== CRITICAL RULES ===
- KEEP IT CONCISE: Short prompts = consistent style. Long complex prompts = style drift and glitches.
- USE INTENSITY ADVERBS: "wing flapping greatly" is better than "wing flapping"
- SEQUENTIAL ACTIONS: List actions in order with logical flow (e.g., "sprints forward, crosses finish line, raises arms triumphantly")
- NO NEGATIVE PROMPTS: Never say "no X" or "without Y" - they don't work
- SINGLE SCENE: One coherent continuous shot, not multiple cuts

=== EXAMPLES OF EXCELLENT PROMPTS ===
- "Tech entrepreneur in black hoodie typing intensely on floating holographic screens, cascading code reflections on face, pan right through neon-lit server room, cinematic 4K, ambient electronic hum"
- "Crypto trader in expensive suit surfing wildly atop a massive green candlestick chart wave, slow-motion follow-shot, synthwave cityscape background, epic orchestral crescendo"
- "Digital artist with paint-splattered clothes gesturing dramatically as colorful fractals explode outward from their hands, drone pan around subject, photorealistic 4K, upbeat electronic track"
- "Meme lord sitting on golden throne scrolling phone rapidly, laughing smugly as notifications rain down like confetti, slow push-in, cinematic lighting, comedic orchestral fanfare"

OUTPUT ONLY THE PROMPT. No intro, no explanation, just the raw prompt text (1-3 sentences max).`;

        const today = new Date();

        const breakerKey = 'xai:analyze-video';
        if (!canProceed(breakerKey)) {
            return NextResponse.json(
                { error: 'The AI service is temporarily unavailable. Please try again shortly.' },
                { status: 503, headers: corsHeaders }
            );
        }

        const response = await fetchWithTimeout(
            'https://api.x.ai/v1/responses',
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${xaiApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'grok-4-1-fast',
                    input: [
                        { role: 'system', content: systemPrompt },
                        {
                            role: 'user',
                            content: `Analyze @${handle}'s X account. Today is ${today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.

Search:
- "from:${handle}" for recent posts
- "from:${handle} filter:media" for visual content  
- "@${handle}" to see how others perceive them

Create a CONCISE video prompt (1-3 sentences) following the formula: SUBJECT + MOTION + SCENE + CAMERA + STYLE + AUDIO. Keep it short to avoid style drift!`,
                        },
                    ],
                    tools: [
                        { type: 'x_search' },
                    ],
                }),
            },
            API_TIMEOUTS.ENHANCED_ACCOUNT_ANALYSIS
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('xAI API error:', response.status, errorText);
            recordFailure(breakerKey);
            return NextResponse.json(
                { error: `xAI API error: ${response.status}`, details: errorText },
                { status: response.status, headers: corsHeaders }
            );
        }

        const rawData = await response.json();
        const validationResult = GrokResponsesApiSchema.safeParse(rawData);

        if (!validationResult.success) {
            console.error('Invalid Grok API response structure:', validationResult.error);
            recordFailure(breakerKey);
            return NextResponse.json(
                { error: 'Invalid response from Grok API' },
                { status: 500, headers: corsHeaders }
            );
        }

        const videoPrompt = extractGrokResponsesContent(validationResult.data);
        recordSuccess(breakerKey);

        if (!videoPrompt) {
            console.error('No video prompt generated from Grok');
            return NextResponse.json(
                { error: 'Failed to generate video prompt' },
                { status: 500, headers: corsHeaders }
            );
        }

        console.log('Generated video prompt:', videoPrompt);

        return NextResponse.json({ videoPrompt }, { headers: corsHeaders });
    } catch (error) {
        console.error('Error in analyze-account-video function:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500, headers: getCorsHeaders() }
        );
    }
}
