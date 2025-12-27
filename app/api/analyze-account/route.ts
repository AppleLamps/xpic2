import { NextRequest, NextResponse } from 'next/server';
import { db, xAccountCache } from '@/db';
import { eq, gt, and } from 'drizzle-orm';

// Feature flag: Set to true to enable caching
const ENABLE_CACHING = false;

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const { handle, useSafetyGuidelines } = await req.json();

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

    console.log(`Analyzing X account: @${handle}`);

    // Cache lookup (only if caching is enabled)
    let cachedData: { searchResponse: unknown } | null = null;
    if (ENABLE_CACHING) {
      const cached = await db
        .select({ searchResponse: xAccountCache.searchResponse })
        .from(xAccountCache)
        .where(
          and(
            eq(xAccountCache.xHandle, handle.toLowerCase()),
            gt(xAccountCache.expiresAt, new Date())
          )
        )
        .limit(1);

      if (cached.length > 0) {
        cachedData = cached[0];
      }
    }

    // Improved system prompt with enhanced analysis guidance
    let systemPrompt = `You are an expert Art Director AI specializing in satirical cartoon and comic book illustration. Your function is to translate the essence of an X social media account into a single, masterful cartoon image generation prompt.

Your analysis process:
1. **Deep Content Analysis:** Thoroughly examine the account's posts, including text, images, videos, and any visual media. Identify core themes, personality traits, recurring jokes, communication style, visual aesthetics, and unique characteristics.
2. **Pattern Recognition:** Look for patterns in posting frequency, topics, tone shifts, visual style, and engagement patterns. Note any signature phrases, memes, or visual motifs.
3. **Personality Synthesis:** Distill the account's essence into key personality traits—are they witty, serious, chaotic, methodical, rebellious, inspirational? What makes them distinctive?
4. **Visual Metaphor Creation:** Transform your understanding into a compelling visual metaphor that captures the account's spirit, humor, and unique identity.
5. **Prompt Construction:** Build the final image prompt following the strict guidelines below.

Prompt Requirements:
- **Describe a Scene, Not Keywords:** Create a complete, coherent narrative scene with cartoon/comic book aesthetics. Think of it as a single frame from a satirical comic strip.
- **Be Hyper-Specific:** Use precise illustration language. Mention bold outlines, exaggerated expressions, vibrant color palettes, halftone shading, dynamic action lines, satirical visual gags, and specific artistic techniques.
- **Incorporate Rich Detail:** Include visual humor, environmental storytelling, character expressions (exaggerated, cartoonish), symbolic objects, and dense background details packed with jokes and references.
- **Maintain Relevance & Humor:** The scene must be a creative, humorous, or satirical visual metaphor that encapsulates the account's personality and content, with specific references woven in naturally.
- **Visual Content Integration:** If the account frequently shares images or videos, incorporate visual elements that reflect their aesthetic preferences, color schemes, or visual themes.
- **State the Art Style:** Conclude with a clear cartoon/comic directive (e.g., "MAD Magazine style satirical cartoon," "Bold comic book illustration with vibrant colors," "Underground comix style with dense detail," "Political cartoon with exaggerated caricature style," "Anime-inspired satirical illustration").
- **Length:** The prompt must be 4-6 sentences—comprehensive but concise.

Examples of masterful cartoon prompts:
- "A superhero tech CEO bursting through a wall made of broken social media logos and blue verification checkmarks, phone held high crackling with electric lightning bolts, wearing a cape made of tangled ethernet cables and a chest emblem showing a rocket ship. The chaotic office scene behind shows robots running in panic, monitors displaying crashing stock charts, and papers flying everywhere with 'FREE SPEECH' and 'MEMES' written on them. Dynamic action lines radiate from the center, debris and shattered glass frozen mid-explosion. Bold comic book illustration style with vibrant primary colors, thick black outlines, halftone dot shading, and exaggerated heroic proportions reminiscent of Silver Age Marvel comics."
- "A cartoonish anthropomorphic coffee cup character with bulging googly eyes and a manic grin, surrounded by a chaotic home office filled with dozens of glowing computer screens showing lines of code, energy drink cans scattered everywhere, and Post-it notes covering every surface with bug reports and 'TODO' lists. Steam rises from the coffee cup forming shapes of curly braces, semicolons, and error messages while smaller bug characters with antennae scurry across keyboards. The character has bags under its eyes and is typing frantically on multiple keyboards at once. MAD Magazine style satirical cartoon with exaggerated features, vibrant colors, dense visual gags, and a playful, chaotic energy."
- "A grinning motivational speaker caricature with an impossibly wide smile and oversized teeth, standing atop a mountain of glowing self-help books stacked impossibly high, arms raised in a victorious V-shape with dollar signs shooting from their fingertips like magical rays. Smaller cartoon figures climb the book mountain below, some slipping on titles like 'GET RICH QUICK' and 'MINDSET SECRETS,' while motivational buzzwords float in speech bubbles ('HUSTLE!' 'GRIND!' 'MANIFEST!'). The background shows a sunrise with exaggerated lens flare effects and inspirational light beams. Bold satirical cartoon style with vibrant, oversaturated colors, thick outlines, exaggerated proportions, and comedic visual metaphors reminiscent of editorial political cartoons."

Your final output must be ONLY the image generation prompt. No preamble, no explanation, no analysis. Just the prompt.`;

    // Add safety guidelines if requested
    if (useSafetyGuidelines) {
      systemPrompt += `

Content Guidelines:
- **Stay Clever, Not Explicit:** Use visual metaphors, symbolism, and satirical imagery rather than explicit offensive terminology.
- **No Explicit Slurs or Graphic Violence:** Avoid terms related to sexual misconduct, extreme violence, hate speech slurs, or graphic descriptions of harm.
- **Controversy Through Imagery:** Capture controversial themes through symbolic representation (e.g., use clashing symbols, opposing forces, visual tension) rather than direct offensive language.
- **Satirical ≠ Offensive:** Great satire can be biting and edgy through clever visual choices, exaggerated caricature, and absurdist humor without explicit offensive content.`;
    }

    let imagePrompt: string;

    // Build date range for search (6 months)
    const today = new Date();
    const toDate = today.toISOString().split('T')[0];
    const sixMonthsAgo = new Date(today.getTime() - 182 * 24 * 60 * 60 * 1000);
    const fromDate = sixMonthsAgo.toISOString().split('T')[0];

    // Use cached data if available and caching is enabled
    if (ENABLE_CACHING && cachedData?.searchResponse) {
      console.log(`Cache hit for @${handle}, generating fresh prompt from cached data`);

      const cachedContext = JSON.stringify(cachedData.searchResponse);

      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${xaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // DO NOT CHANGE THIS MODEL - grok-4-1-fast is required for X search functionality
          model: 'grok-4-1-fast',
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `Based on this X account data: ${cachedContext}\n\nCreate a humorous but relevant image generation prompt that captures the account's essence.`,
            },
          ],
          // No tools - we're using cached data
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('xAI API error (cached):', response.status, errorText);
        return NextResponse.json(
          { error: `xAI API error: ${response.status}`, details: errorText },
          { status: response.status, headers: corsHeaders }
        );
      }

      const data = await response.json();
      imagePrompt = data.choices?.[0]?.message?.content;
    } else {
      // Perform agentic search with tools
      console.log(`Performing agentic search for @${handle}${ENABLE_CACHING ? ' (cache miss)' : ' (caching disabled)'}`);

      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${xaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // DO NOT CHANGE THIS MODEL - grok-4-1-fast is required for X search functionality
          model: 'grok-4-1-fast',
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `Analyze @${handle}'s posts and create a humorous but relevant image generation prompt that captures their account's essence.`,
            },
          ],
          search_parameters: {
            mode: 'on',
            sources: [{ type: 'x' }],
            from_date: fromDate,
            to_date: toDate,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('xAI API error:', response.status, errorText);
        return NextResponse.json(
          { error: `xAI API error: ${response.status}`, details: errorText },
          { status: response.status, headers: corsHeaders }
        );
      }

      const data = await response.json();
      imagePrompt = data.choices?.[0]?.message?.content;

      // Cache the response if caching is enabled
      if (ENABLE_CACHING) {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        try {
          await db
            .insert(xAccountCache)
            .values({
              xHandle: handle.toLowerCase(),
              searchResponse: data,
              expiresAt,
            })
            .onConflictDoUpdate({
              target: xAccountCache.xHandle,
              set: {
                searchResponse: data,
                expiresAt,
              },
            });
          console.log(`Cached search response for @${handle} until ${expiresAt.toISOString()}`);
        } catch (upsertError) {
          console.error('Cache upsert error:', upsertError);
          // Continue anyway - caching failure shouldn't break the flow
        }
      }
    }

    if (!imagePrompt) {
      console.error('No prompt generated from Grok');
      return NextResponse.json(
        { error: 'Failed to generate image prompt' },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('Generated prompt:', imagePrompt);

    return NextResponse.json({ imagePrompt }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error in analyze-account function:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
