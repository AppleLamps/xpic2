import { NextRequest, NextResponse } from 'next/server';
import { fetchWithTimeout, API_TIMEOUTS } from '@/lib/fetchWithTimeout';
import {
  GeminiImageResponseSchema,
  extractGeminiImage,
  getCorsHeaders,
} from '@/lib/schemas';

// Image model
const IMAGE_MODEL = 'google/gemini-3-pro-image-preview';

// Enhanced prompt wrapper - reinforces satirical cartoon style and prevents text misspellings
const enhancePrompt = (basePrompt: string): string => {
  return `Create a satirical cartoon illustration in the style of MAD Magazine with bold outlines, vibrant colors, and exaggerated expressions.

CRITICAL TEXT RENDERING RULES:
- If any text, labels, signs, or words appear in the image, spell them EXACTLY and CORRECTLY
- Double-check all spelling before rendering any text
- Prefer using symbols, icons, and visual metaphors over text when possible
- If text is essential, keep it minimal and simple (1-3 words maximum per element)
- Common words that must be spelled correctly: "BREAKING", "NEWS", "FREE", "SALE", "HELP", "STOP", "GO", "YES", "NO"

SCENE TO ILLUSTRATE:
${basePrompt}

Remember: NO MISSPELLINGS in any text. When in doubt, use visual symbols instead of words.`;
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

    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      console.error('OPENROUTER_API_KEY is not configured');
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY is not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Attempt image generation with retry logic
    const attemptImageGeneration = async (currentPrompt: string, isRetry: boolean): Promise<string> => {
      console.log(`Attempting image generation (retry: ${isRetry})`);
      console.log(`Using model (OpenRouter): ${IMAGE_MODEL}`);

      const finalPrompt = enhancePrompt(currentPrompt);

      if (process.env.NODE_ENV !== 'production') {
        console.log('Enhanced prompt:', finalPrompt);
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
            model: IMAGE_MODEL,
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

      // Handle validation failure - likely a safety filter blocking the response
      if (!validationResult.success) {
        console.error('Invalid Gemini API response structure:', validationResult.error);
        console.log('Raw response:', JSON.stringify(rawData).substring(0, 500));

        // Treat validation failure as potential safety block - retry with safer prompt
        if (!isRetry) {
          console.log('Validation failed (likely safety filter) - regenerating prompt with safety guidelines');
          return await regenerateWithSaferPrompt(handle);
        }

        throw new Error('Invalid response from Gemini API - content may be restricted');
      }

      const imageResult = extractGeminiImage(validationResult.data);

      // Check for explicit safety block
      if (imageResult && 'safetyBlocked' in imageResult) {
        if (isRetry) {
          console.error('Image blocked by safety even after regenerating with guidelines');
          throw new Error('Content cannot be safely generated - blocked by safety filters');
        }

        console.log('Safety block detected - regenerating prompt with safety guidelines');
        return await regenerateWithSaferPrompt(handle);
      }

      if (!imageResult || !('url' in imageResult)) {
        console.error('No image URL in validated response');
        throw new Error('Failed to generate image - no image URL in response');
      }

      console.log('Image generated successfully');
      return imageResult.url;
    };

    // Helper function to regenerate with safer prompt
    const regenerateWithSaferPrompt = async (accountHandle: string): Promise<string> => {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const analyzeResponse = await fetchWithTimeout(
        `${baseUrl}/api/analyze-account`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            handle: accountHandle,
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
    };

    // Generate image
    const imageUrl = await attemptImageGeneration(prompt, false);

    return NextResponse.json({ imageUrl }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error in generate-image function:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: getCorsHeaders() }
    );
  }
}

