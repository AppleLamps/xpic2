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

// Style prompt templates for different art styles
const STYLE_PROMPTS: Record<string, string> = {
  default: `Create a satirical cartoon illustration in the style of MAD Magazine with bold outlines, vibrant colors, and exaggerated expressions.`,

  ghibli: `Create a beautiful illustration in the style of Studio Ghibli anime, with soft pastel colors, whimsical fantasy elements, dreamy atmosphere, gentle lighting, and the signature warm, nostalgic feeling of Hayao Miyazaki's films.`,

  pixar: `Create a 3D animated illustration in the style of Pixar movies, with expressive characters, vibrant saturated colors, smooth rendering, dynamic lighting, and that signature Pixar charm and warmth.`,

  anime: `Create a dynamic anime-style illustration with bold lines, expressive eyes, dramatic poses, vibrant colors, speed lines, and the energetic aesthetic of popular Japanese anime series.`,

  comic: `Create a bold comic book style illustration with thick black outlines, halftone dots, dynamic panel-like composition, dramatic shadows, action lines, and speech bubble-ready aesthetic like classic Marvel or DC comics.`,

  watercolor: `Create a soft, dreamy watercolor painting illustration with flowing colors, gentle gradients, organic brush strokes, subtle color bleeding, and the delicate, artistic quality of traditional watercolor art.`,

  oil: `Create a classical oil painting style illustration with rich textures, visible brushstrokes, dramatic chiaroscuro lighting, deep saturated colors, and the timeless elegance of Renaissance masters.`,

  cyberpunk: `Create a cyberpunk style illustration with neon lights, futuristic technology, dark urban atmosphere, holographic elements, rain-slicked streets, vibrant pink and cyan color palette, and dystopian sci-fi aesthetic.`,

  retro: `Create a retro pop art style illustration inspired by 80s and 90s aesthetics, with bold geometric shapes, neon colors, pixel art elements, synthwave vibes, VHS grain, and nostalgic vintage feel.`,

  minimalist: `Create a clean minimalist illustration with simple geometric shapes, limited color palette, lots of white space, flat design elements, and modern elegant simplicity.`,

  charcoal: `Create a dramatic charcoal sketch illustration with bold strokes, deep blacks, soft grays, smudged textures, expressive lines, and the raw artistic quality of traditional life drawing.`,

  renaissance: `Create a Renaissance portrait in the style of Leonardo da Vinci or Raphael, with sfumato technique, warm earth tones, classical composition, dramatic lighting, and timeless elegance.`,

  manga: `Create a black and white manga-style illustration with dramatic ink work, screentone shading, dynamic panel composition, expressive lines, and the distinctive aesthetic of Japanese comic art.`,

  chibi: `Create a super-cute chibi-style illustration with an oversized head, tiny body, huge sparkling eyes, rounded features, pastel colors, and the adorable kawaii aesthetic.`,

  vaporwave: `Create a vaporwave aesthetic illustration with glitchy effects, Roman busts, gradient sunsets in pink and purple, palm trees, geometric shapes, 80s/90s nostalgia, and dreamy surreal atmosphere.`,

  lowpoly: `Create a low-poly 3D style illustration with geometric faceted surfaces, limited color palette, clean angular shapes, subtle gradients between polygons, and modern minimalist 3D aesthetic.`,

  neon: `Create a neon glow art illustration with bright luminous outlines, dark background, vibrant electric colors (pink, blue, purple), light bloom effects, and retro arcade aesthetic.`,

  impressionist: `Create an impressionist painting illustration in the style of Monet or Renoir, with visible brushstrokes, soft edges, dappled light, pastel colors, and the dreamy atmospheric quality of French impressionism.`,

  sticker: `Create a sticker art style illustration with bold outlines, flat vibrant colors, die-cut border effect, subtle drop shadow, and the playful aesthetic of vinyl stickers.`,

  claymation: `Create a claymation-style illustration that looks like stop-motion animation with clay figures, visible texture, soft lighting, rounded shapes, and the charming handmade quality of Wallace & Gromit.`,

  graffiti: `Create a street graffiti art illustration with bold spray paint style, dripping effects, bubble letters, urban textures, vibrant colors, and the raw energy of street art murals.`,

  ukiyo: `Create a Japanese ukiyo-e woodblock print style illustration with flat colors, bold outlines, wave patterns, traditional composition, limited color palette, and the elegant aesthetic of Hokusai.`,
};

// Enhanced prompt wrapper - incorporates style and prevents text misspellings
const enhancePrompt = (basePrompt: string, style: string = 'default'): string => {
  const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.default;

  return `${stylePrompt}

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
    const { prompt, handle, style } = await req.json();

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

    // Validate style (optional, defaults to 'default')
    const validStyles = Object.keys(STYLE_PROMPTS);
    const selectedStyle = style && validStyles.includes(style) ? style : 'default';
    console.log(`Using art style: ${selectedStyle}`);

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

      const finalPrompt = enhancePrompt(currentPrompt, selectedStyle);

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
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://www.grokify.ai',
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

