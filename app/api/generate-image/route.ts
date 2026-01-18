import { NextRequest, NextResponse } from 'next/server';
import { fetchWithTimeout, API_TIMEOUTS } from '@/lib/fetchWithTimeout';
import {
  GeminiImageResponseSchema,
  GrokResponseSchema,
  extractGeminiImage,
  extractGrokContent,
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

// Generate a safer prompt using Grok directly (avoids self-referential API call issues in serverless)
const generateSaferPromptWithGrok = async (handle: string, originalPrompt: string): Promise<string> => {
  const xaiApiKey = process.env.XAI_API_KEY;
  if (!xaiApiKey) {
    throw new Error('XAI_API_KEY is not configured for safety rewrite');
  }

  console.log(`Generating safer prompt for @${handle} using Grok`);

  const safetySystemPrompt = `You are an expert at rewriting image generation prompts to be safer while maintaining their essence and humor.

Your task: Take the original prompt and rewrite it to avoid content that might trigger AI image safety filters, while still capturing the same spirit, personality, and satirical nature.

Guidelines for safer prompts:
- **Use Visual Metaphors:** Replace any potentially controversial elements with symbolic representations
- **Avoid Political Figures Directly:** Instead of depicting specific politicians, use symbolic representations (e.g., "a figure representing conservative values" → "an elephant mascot in a suit")
- **No Violence or Weapons:** Replace with harmless cartoon alternatives (e.g., "wielding a sword" → "wielding an oversized foam finger")
- **Abstract Controversial Topics:** Use visual symbolism rather than explicit depictions
- **Keep the Humor:** The satire should still be evident through clever visual choices
- **Maintain the Art Style:** Keep the MAD Magazine / satirical cartoon aesthetic

Output ONLY the rewritten prompt. No explanations, no preamble.`;

  const response = await fetchWithTimeout(
    'https://api.x.ai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${xaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-3-fast',
        messages: [
          { role: 'system', content: safetySystemPrompt },
          {
            role: 'user',
            content: `Original prompt that was blocked by safety filters:\n\n"${originalPrompt}"\n\nRewrite this to be safer while keeping the satirical spirit and visual humor for @${handle}'s account.`,
          },
        ],
      }),
    },
    API_TIMEOUTS.GROK_ANALYSIS
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('xAI API error for safety rewrite:', response.status, errorText);
    throw new Error(`Failed to generate safer prompt: ${response.status}`);
  }

  const rawData = await response.json();
  const validationResult = GrokResponseSchema.safeParse(rawData);

  if (!validationResult.success) {
    console.error('Invalid Grok response for safety rewrite:', validationResult.error);
    throw new Error('Invalid response from Grok API');
  }

  const saferPrompt = extractGrokContent(validationResult.data);
  if (!saferPrompt) {
    throw new Error('No content in Grok safety rewrite response');
  }

  console.log('Generated safer prompt:', saferPrompt);
  return saferPrompt;
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
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://xpressionist.vercel.app',
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
          const saferPrompt = await generateSaferPromptWithGrok(handle, currentPrompt);
          return attemptImageGeneration(saferPrompt, true);
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
        const saferPrompt = await generateSaferPromptWithGrok(handle, currentPrompt);
        return attemptImageGeneration(saferPrompt, true);
      }

      if (!imageResult || !('url' in imageResult)) {
        console.error('No image URL in validated response');
        throw new Error('Failed to generate image - no image URL in response');
      }

      console.log('Image generated successfully');
      return imageResult.url;
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

