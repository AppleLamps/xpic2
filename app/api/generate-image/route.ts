import { NextRequest, NextResponse } from 'next/server';
import { db, usageTracking } from '@/db';
import { eq } from 'drizzle-orm';
import { fetchWithTimeout, API_TIMEOUTS } from '@/lib/fetchWithTimeout';
import {
  GeminiImageResponseSchema,
  GetImgResponseSchema,
  extractGeminiImage,
  extractGetImgUrl,
  getCorsHeaders,
} from '@/lib/schemas';

// Premium image model (easy to change back if needed)
// Supported Google models: "google/gemini-2.5-flash-image", "google/gemini-3-pro-image-preview"
const PREMIUM_IMAGE_MODEL = 'google/gemini-2.5-flash-image';

// Check if the current model is a Google model (for prompt enhancement)
const isGoogleModel = (model: string): boolean => model.startsWith('google/');

// Light prompt wrapper for Google models - reinforces satirical cartoon style
const enhancePromptForGoogleModels = (basePrompt: string): string => {
  return `Create a satirical cartoon illustration in the style of MAD Magazine with bold outlines, vibrant colors, and exaggerated expressions:

${basePrompt}`;
};

// Create user identifier from IP + User-Agent for anonymous tracking
const getUserIdentifier = async (req: NextRequest): Promise<string> => {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  // Create hash to anonymize (add server salt for security)
  const salt = process.env.RATE_LIMIT_SALT || 'default-salt';
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + userAgent + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

// Check usage and determine which model to use
const checkUsageAndGetModel = async (identifier: string) => {
  // Get or create usage record
  const existingUsage = await db
    .select()
    .from(usageTracking)
    .where(eq(usageTracking.userIdentifier, identifier))
    .limit(1);

  let usage = existingUsage[0] || null;
  const now = new Date();
  const HOURS_24_MS = 24 * 60 * 60 * 1000;
  const resetNeeded = !usage || now.getTime() - new Date(usage.lastResetAt!).getTime() > HOURS_24_MS;

  if (!usage) {
    // Create new record
    const inserted = await db
      .insert(usageTracking)
      .values({
        userIdentifier: identifier,
        premiumImagesCount: 0,
        lastResetAt: now,
      })
      .returning();
    usage = inserted[0];
  } else if (resetNeeded) {
    // Reset counter after 24h
    const updated = await db
      .update(usageTracking)
      .set({
        premiumImagesCount: 0,
        lastResetAt: now,
        updatedAt: now,
      })
      .where(eq(usageTracking.userIdentifier, identifier))
      .returning();
    usage = updated[0];
  }

  const usePremium = (usage?.premiumImagesCount || 0) < 2;

  if (process.env.NODE_ENV !== 'production') {
    console.log(
      `User identifier: ${identifier.substring(0, 8)}... | Premium count: ${usage?.premiumImagesCount || 0}/2 | Using: ${usePremium ? 'Nano Banana (premium)' : 'Flux (standard)'}`
    );
  }

  return { usePremium, usage };
};

// Generate with Flux (GetImg.ai) - cheaper fallback
const generateWithFlux = async (prompt: string): Promise<string> => {
  const getimgApiKey = process.env.GETIMG_API_KEY;
  if (!getimgApiKey) {
    throw new Error('GETIMG_API_KEY is not configured');
  }

  console.log('Using Flux Schnell model (GetImg.ai)');

  const response = await fetchWithTimeout(
    'https://api.getimg.ai/v1/flux-schnell/text-to-image',
    {
      method: 'POST',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${getimgApiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        width: 1024,
        height: 1024,
        steps: 4,
        output_format: 'jpeg',
        response_format: 'url',
      }),
    },
    API_TIMEOUTS.FLUX_GENERATION
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('GetImg.ai API error:', response.status, errorText);
    throw new Error(`GetImg.ai API error: ${response.status}`);
  }

  const rawData = await response.json();
  const validationResult = GetImgResponseSchema.safeParse(rawData);

  if (!validationResult.success) {
    console.error('Invalid GetImg.ai response structure:', validationResult.error);
    throw new Error('Invalid response from GetImg.ai API');
  }

  const imageUrl = extractGetImgUrl(validationResult.data);

  if (!imageUrl) {
    console.error('No image in GetImg.ai response');
    throw new Error('GetImg.ai did not return an image');
  }

  console.log('Flux image generated successfully');
  return imageUrl;
};

export async function OPTIONS() {
  return NextResponse.json(null, { headers: getCorsHeaders() });
}

export async function POST(req: NextRequest) {
  const corsHeaders = getCorsHeaders();

  try {
    const { prompt, handle } = await req.json();

    // Validate X handle format (1-15 alphanumeric characters + underscores)
    const HANDLE_REGEX = /^[a-zA-Z0-9_]{1,15}$/;
    if (!handle || !HANDLE_REGEX.test(handle)) {
      console.error('Invalid handle format:', handle);
      return NextResponse.json(
        { error: 'Invalid X handle format. Handles must be 1-15 characters and contain only letters, numbers, and underscores.' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!prompt) {
      console.error('Missing prompt');
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get user identifier for rate limiting
    const userIdentifier = await getUserIdentifier(req);

    // Check usage and determine model
    const { usePremium, usage } = await checkUsageAndGetModel(userIdentifier);

    let imageUrl: string;

    if (usePremium) {
      // Use premium Nano Banana model (OpenRouter)
      const openrouterApiKey = process.env.OPENROUTER_API_KEY;
      if (!openrouterApiKey) {
        console.error('OPENROUTER_API_KEY is not configured');
        return NextResponse.json(
          { error: 'OPENROUTER_API_KEY is not configured' },
          { status: 500, headers: corsHeaders }
        );
      }

      // Attempt premium image generation with retry logic
      const attemptImageGeneration = async (currentPrompt: string, isRetry: boolean): Promise<string> => {
        console.log(`Attempting premium image generation (retry: ${isRetry})`);
        console.log(`Using premium model (OpenRouter): ${PREMIUM_IMAGE_MODEL}`);

        // Enhance the prompt for Google models - they benefit from more detailed instructions
        const finalPrompt = isGoogleModel(PREMIUM_IMAGE_MODEL)
          ? enhancePromptForGoogleModels(currentPrompt)
          : currentPrompt;

        if (process.env.NODE_ENV !== 'production') {
          console.log(`Using ${isGoogleModel(PREMIUM_IMAGE_MODEL) ? 'enhanced' : 'standard'} prompt:`, finalPrompt);
        }

        const response = await fetchWithTimeout(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${openrouterApiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://x-image-generator.vercel.app',
              'X-Title': 'X Account Image Generator',
            },
            body: JSON.stringify({
              model: PREMIUM_IMAGE_MODEL,
              messages: [
                {
                  role: 'user',
                  content: finalPrompt,
                },
              ],
              modalities: ['image', 'text'],
            }),
          },
          API_TIMEOUTS.IMAGE_GENERATION
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('OpenRouter API error:', response.status, errorText);
          throw new Error(`OpenRouter API error: ${response.status}`);
        }

        const rawData = await response.json();
        const validationResult = GeminiImageResponseSchema.safeParse(rawData);

        if (!validationResult.success) {
          console.error('Invalid Gemini API response structure:', validationResult.error);
          throw new Error('Invalid response from Gemini API');
        }

        const imageResult = extractGeminiImage(validationResult.data);

        // Check for safety block
        if (imageResult && 'safetyBlocked' in imageResult) {
          if (isRetry) {
            console.error('Image blocked by safety even after regenerating with guidelines');
            throw new Error('Content cannot be safely generated - blocked by safety filters');
          }

          console.log('Safety block detected - regenerating prompt with safety guidelines');

          // Call analyze-account again with safety guidelines enabled
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const analyzeResponse = await fetchWithTimeout(
            `${baseUrl}/api/analyze-account`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                handle: handle,
                useSafetyGuidelines: true,
              }),
            },
            API_TIMEOUTS.GROK_ANALYSIS
          );

          if (!analyzeResponse.ok) {
            console.error('Failed to regenerate prompt');
            throw new Error('Failed to regenerate safe prompt');
          }

          const { imagePrompt: safePrompt } = await analyzeResponse.json();
          console.log('Regenerated safe prompt:', safePrompt);

          // Retry with the new, safer prompt
          return attemptImageGeneration(safePrompt, true);
        }

        if (!imageResult || !('url' in imageResult)) {
          console.error('No image URL in validated response');
          throw new Error('Failed to generate image - no image URL in response');
        }

        console.log('Premium image generated successfully');
        return imageResult.url;
      };

      // Generate premium image
      imageUrl = await attemptImageGeneration(prompt, false);

      // Increment premium counter
      await db
        .update(usageTracking)
        .set({
          premiumImagesCount: (usage?.premiumImagesCount || 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(usageTracking.userIdentifier, userIdentifier));

      console.log(`Premium image generated. User now at ${(usage?.premiumImagesCount || 0) + 1}/2 premium images`);
    } else {
      // Use standard Flux model (GetImg.ai)
      imageUrl = await generateWithFlux(prompt);
      console.log('Standard Flux image generated. User has used their premium quota.');
    }

    return NextResponse.json({ imageUrl }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error in generate-image function:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: getCorsHeaders() }
    );
  }
}
