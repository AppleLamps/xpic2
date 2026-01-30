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

        // Video-focused system prompt - Satire Cartoon Style with Real Post Content
        const systemPrompt = `You are a brilliant satirical cartoon animator creating hilarious animated sketches based on X accounts. Your style is like a mix of South Park, The Simpsons, and political cartoons - exaggerated, witty, and BASED ON REAL CONTENT from their posts.

CRITICAL: Search their account extensively to find ACTUAL QUOTES, hot takes, interactions, and drama to satirize.

=== YOUR MISSION ===
Create a 10-second ANIMATED CARTOON that satirizes this person's online presence using their REAL posts and replies as material. Think of it as an animated political cartoon or SNL-style sketch.

=== CARTOON STYLE REQUIREMENTS ===
- STYLE: "Animated cartoon satire," "2D hand-drawn animation," "exaggerated caricature style," "bold outlines, vibrant colors"
- CHARACTER: Exaggerated cartoon caricature (big head, expressive features, signature items they're known for)
- HUMOR: Satirical, playful roasting, exaggeration of their persona - NOT mean-spirited
- REAL CONTENT: Quote or reference their ACTUAL tweets, takes, and interactions

=== WHAT TO SEARCH FOR ===
1. Their most viral/controversial takes
2. Recurring themes they post about
3. Their replies and beefs with others
4. Their catchphrases and speaking style
5. What they're known for (good and bad)
6. Recent drama or trending moments

=== PROMPT STRUCTURE ===
1. CARTOON CHARACTER: Exaggerated animated version of them (describe caricature features)
2. SCENE: Satirical setting that matches their persona
3. ACTION: Comedic sequence poking fun at their online behavior
4. DIALOGUE: Direct quotes or paraphrased versions of their ACTUAL posts (in quotes)
5. VISUAL GAGS: Text bubbles, reaction emojis, notification floods, ratio counters, etc.
6. STYLE: "2D cartoon animation, bold outlines, saturated colors, exaggerated expressions"

=== EXAMPLES ===

Example 1 (Crypto Bro who shills everything):
"2D cartoon animation of a sweaty cartoon businessman with dollar-sign eyes and a comically oversized 'CRYPTO KING' crown, standing on a wobbly tower of meme coins. He frantically points at a chart going up while shouting 'THIS IS NOT FINANCIAL ADVICE BUT YOU'D BE STUPID NOT TO BUY!' The tower starts crumbling as red 'REKT' notifications rain down. His crown falls off revealing a dunce cap underneath. Bold outlines, vibrant neon colors, comedic timing, sad trombone sound effect."

Example 2 (Tech Founder who's always 'building'):
"Animated cartoon of a hoodie-wearing tech bro caricature with an impossibly large forehead labeled 'BIG IDEAS' sitting at a desk tweeting on 47 phones simultaneously. Speech bubble shows 'We're building something that will change everything. Again.' A progress bar behind him has been stuck at 2% for years with cobwebs on it. Notification bubbles flood in reading 'Wen launch?' as he sweats profusely. 2D animation style, exaggerated reactions, upbeat startup jingle that slowly goes off-key."

Example 3 (Political Commentator always dunking):
"Satirical cartoon of a puffed-up commentator caricature with an enormous pointing finger, standing at a podium made of stacked 'RATIO' tombstones. They dramatically gesture at a wall of screenshots while declaring 'And THIS is why they're all wrong and I'm right. As I predicted in 2019.' A 'ACTUALLY...' reply notification appears and they visibly deflate like a balloon. Hand-drawn animation, newspaper political cartoon colors, dramatic news music undercut by whoopee cushion."

Example 4 (Influencer obsessed with engagement):
"Cartoon animation of an influencer caricature refreshing their phone with increasingly manic energy, pupils replaced by heart emojis. They pose dramatically and announce 'If this gets 10k likes I'll reveal my secret!' Counter slowly climbs to 47 likes. They slump. A tumbleweed rolls past. They perk up again: 'OKAY 50 likes and I'll do it!' Bright saturated colors, 2D animation, comedic pause timing, circus music."

=== OUTPUT ===
Write a detailed cartoon animation prompt that:
- Uses their ACTUAL quotes or paraphrased takes
- Exaggerates their online persona humorously  
- Includes specific visual gags referencing their content
- Specifies "2D cartoon animation" or "animated satire" style
- Has comedic timing and punchlines

Make it feel like a personalized SNL digital short about their X presence.`;

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
                            content: `Create a satirical cartoon video about @${handle}. Today is ${today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.

SEARCH THEIR ACCOUNT FOR SATIRICAL MATERIAL:
- "from:${handle}" - their recent posts and hot takes
- "from:${handle} min_faves:100" - their most popular/viral content
- "from:${handle} filter:replies" - their replies and interactions
- "@${handle}" - what others say about them, any drama
- Look for recurring themes, catchphrases, and things they're known for

Use their ACTUAL quotes and takes as material for the satire. Create a funny 2D cartoon animation prompt that exaggerates their online persona using real content from their posts. Think SNL digital short or political cartoon style - playful roasting, not mean.`,
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
