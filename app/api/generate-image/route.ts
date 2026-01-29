import { NextRequest, NextResponse } from 'next/server';
import { fetchWithTimeout, API_TIMEOUTS } from '@/lib/fetchWithTimeout';
import {
  GeminiImageResponseSchema,
  GrokResponseSchema,
  extractGeminiImage,
  extractGrokContent,
  getCorsHeaders,
} from '@/lib/schemas';
import { canProceed, recordFailure, recordSuccess } from '@/lib/circuit-breaker';

// Image model
const IMAGE_MODEL = 'google/gemini-3-pro-image-preview';

// Style prompt templates for different art styles
const STYLE_PROMPTS: Record<string, string> = {
  // Classic/Traditional
  default: `Create a satirical cartoon illustration in the style of MAD Magazine with bold outlines, vibrant colors, and exaggerated expressions.`,

  oil: `Create a classical oil painting style illustration with rich textures, visible brushstrokes, dramatic chiaroscuro lighting, deep saturated colors, and the timeless elegance of Renaissance masters.`,

  watercolor: `Create a soft, dreamy watercolor painting illustration with flowing colors, gentle gradients, organic brush strokes, subtle color bleeding, and the delicate, artistic quality of traditional watercolor art.`,

  charcoal: `Create a dramatic charcoal sketch illustration with bold strokes, deep blacks, soft grays, smudged textures, expressive lines, and the raw artistic quality of traditional life drawing.`,

  renaissance: `Create a Renaissance portrait in the style of Leonardo da Vinci or Raphael, with sfumato technique, warm earth tones, classical composition, dramatic lighting, and timeless elegance.`,

  baroque: `Create a dramatic Baroque style painting with rich dark backgrounds, theatrical lighting, dynamic composition, ornate details, and the dramatic grandeur of Caravaggio or Rembrandt.`,

  pencil: `Create a detailed pencil sketch illustration with fine linework, crosshatching for shading, realistic proportions, subtle gradations, and the refined quality of classical figure drawing.`,

  artdeco: `Create an Art Deco style illustration with geometric patterns, bold lines, luxurious gold and black colors, symmetrical designs, and the glamorous 1920s aesthetic of the Jazz Age.`,

  // Anime/Eastern
  ghibli: `Create a beautiful illustration in the style of Studio Ghibli anime, with soft pastel colors, whimsical fantasy elements, dreamy atmosphere, gentle lighting, and the signature warm, nostalgic feeling of Hayao Miyazaki's films.`,

  anime: `Create a dynamic anime-style illustration with bold lines, expressive eyes, dramatic poses, vibrant colors, speed lines, and the energetic aesthetic of popular Japanese anime series.`,

  manga: `Create a black and white manga-style illustration with dramatic ink work, screentone shading, dynamic panel composition, expressive lines, and the distinctive aesthetic of Japanese comic art.`,

  chibi: `Create a super-cute chibi-style illustration with an oversized head, tiny body, huge sparkling eyes, rounded features, pastel colors, and the adorable kawaii aesthetic.`,

  ukiyo: `Create a Japanese ukiyo-e woodblock print style illustration with flat colors, bold outlines, wave patterns, traditional composition, limited color palette, and the elegant aesthetic of Hokusai.`,

  shonen: `Create an epic shonen manga style illustration with intense action poses, dramatic speed lines, powerful auras, dynamic angles, bold expressions, and the high-energy aesthetic of Dragon Ball or Naruto.`,

  manhwa: `Create a Korean manhwa (webtoon) style illustration with clean digital linework, soft color gradients, romantic lighting, beautiful character designs, and the polished aesthetic of popular Korean webtoons.`,

  // Modern/Digital
  pixar: `Create a 3D animated illustration in the style of Pixar movies, with expressive characters, vibrant saturated colors, smooth rendering, dynamic lighting, and that signature Pixar charm and warmth.`,

  cyberpunk: `Create a cyberpunk style illustration with neon lights, futuristic technology, dark urban atmosphere, holographic elements, rain-slicked streets, vibrant pink and cyan color palette, and dystopian sci-fi aesthetic.`,

  vaporwave: `Create a vaporwave aesthetic illustration with glitchy effects, Roman busts, gradient sunsets in pink and purple, palm trees, geometric shapes, 80s/90s nostalgia, and dreamy surreal atmosphere.`,

  lowpoly: `Create a low-poly 3D style illustration with geometric faceted surfaces, limited color palette, clean angular shapes, subtle gradients between polygons, and modern minimalist 3D aesthetic.`,

  neon: `Create a neon glow art illustration with bright luminous outlines, dark background, vibrant electric colors (pink, blue, purple), light bloom effects, and retro arcade aesthetic.`,

  minimalist: `Create a clean minimalist illustration with simple geometric shapes, limited color palette, lots of white space, flat design elements, and modern elegant simplicity.`,

  glitch: `Create a glitch art illustration with digital corruption effects, RGB channel splitting, pixel displacement, scan lines, data moshing aesthetic, and the chaotic beauty of broken digital media.`,

  synthwave: `Create a synthwave/retrowave style illustration with neon grids, chrome text effects, sunset gradients in pink and orange, palm tree silhouettes, sports cars, and 80s retro-futuristic aesthetic.`,

  hyperreal: `Create a hyperrealistic digital art illustration with ultra-detailed textures, photorealistic lighting, sharp focus, perfect skin details, and the polished quality of high-end digital concept art.`,

  // Artistic
  comic: `Create a bold comic book style illustration with thick black outlines, halftone dots, dynamic panel-like composition, dramatic shadows, action lines, and speech bubble-ready aesthetic like classic Marvel or DC comics.`,

  retro: `Create a retro pop art style illustration inspired by 80s and 90s aesthetics, with bold geometric shapes, neon colors, pixel art elements, synthwave vibes, VHS grain, and nostalgic vintage feel.`,

  impressionist: `Create an impressionist painting illustration in the style of Monet or Renoir, with visible brushstrokes, soft edges, dappled light, pastel colors, and the dreamy atmospheric quality of French impressionism.`,

  surreal: `Create a surrealist illustration in the style of Salvador Dalí, with dreamlike impossible imagery, melting objects, unexpected juxtapositions, symbolic elements, and the bizarre beauty of the subconscious mind.`,

  warhol: `Create a pop art illustration in the style of Andy Warhol, with bold flat colors, high contrast, repeated image variations, screen print texture, and the iconic aesthetic of 1960s pop art.`,

  noir: `Create a film noir style illustration with dramatic black and white contrast, venetian blind shadows, moody lighting, mysterious atmosphere, rain-soaked streets, and the cinematic aesthetic of 1940s detective movies.`,

  expressionist: `Create an expressionist illustration with bold distorted forms, emotional color choices, visible brushwork, exaggerated features, psychological intensity, and the raw emotional power of artists like Edvard Munch.`,

  psychedelic: `Create a psychedelic art illustration with swirling patterns, vibrant rainbow colors, flowing organic shapes, kaleidoscopic effects, trippy optical illusions, and the mind-expanding aesthetic of 1960s counterculture.`,

  // Fun/Novelty
  sticker: `Create a sticker art style illustration with bold outlines, flat vibrant colors, die-cut border effect, subtle drop shadow, and the playful aesthetic of vinyl stickers.`,

  claymation: `Create a claymation-style illustration that looks like stop-motion animation with clay figures, visible texture, soft lighting, rounded shapes, and the charming handmade quality of Wallace & Gromit.`,

  graffiti: `Create a street graffiti art illustration with bold spray paint style, dripping effects, bubble letters, urban textures, vibrant colors, and the raw energy of street art murals.`,

  pixel: `Create an 8-bit pixel art illustration with chunky pixels, limited retro color palette, nostalgic video game aesthetic, clean pixel-perfect edges, and the charming simplicity of classic arcade games.`,

  lego: `Create a LEGO brick style illustration with characters as LEGO minifigures, blocky proportions, plastic sheen, bright primary colors, and the playful toy aesthetic of LEGO sets.`,

  papercut: `Create a layered paper cut art illustration with visible paper layers, subtle shadows between layers, clean cut edges, limited color palette, and the handcrafted aesthetic of paper sculpture.`,

  balloon: `Create a balloon animal sculpture style illustration with twisted balloon shapes, shiny reflective surface, simple rounded forms, bright colors, and the playful aesthetic of balloon art.`,

  plushie: `Create a cute plushie/stuffed toy style illustration with soft fuzzy textures, button eyes, stitched details, huggable proportions, and the adorable aesthetic of handmade stuffed animals.`,

  vintage: `Create a vintage photograph style illustration with sepia tones, aged paper texture, Victorian-era clothing and styling, oval vignette frame, and the nostalgic aesthetic of 19th century photography.`,

  steampunk: `Create a steampunk style illustration with brass gears and cogs, Victorian fashion, goggles and top hats, steam-powered machinery, copper pipes, and the retro-futuristic aesthetic of alternate history.`,

  fantasy: `Create an epic fantasy RPG style illustration with heroic pose, magical effects, detailed armor or robes, dramatic lighting, and the epic aesthetic of Dungeons & Dragons character art.`,
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

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [500, 1500, 3000];

// Check if an error is a retryable network error (socket closed, connection reset, etc.)
const isRetryableNetworkError = (error: unknown): boolean => {
  if (error instanceof TypeError) {
    const message = error.message.toLowerCase();
    return message.includes('terminated') || message.includes('aborted') || message.includes('network');
  }
  if (error instanceof Error) {
    const cause = (error as Error & { cause?: Error }).cause;
    if (cause?.message?.toLowerCase().includes('socket')) return true;
  }
  return false;
};

const fetchWithRetry = async (url: string, init: RequestInit, timeoutMs: number): Promise<Response> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, init, timeoutMs);

      if (response.ok || !RETRYABLE_STATUS.has(response.status)) {
        return response;
      }

      console.log(`Retryable HTTP status ${response.status}, attempt ${attempt + 1}`);
    } catch (error) {
      // Retry on network errors (socket closed, terminated, etc.)
      if (isRetryableNetworkError(error)) {
        console.log(`Network error on attempt ${attempt + 1}, will retry:`, error instanceof Error ? error.message : error);
        lastError = error instanceof Error ? error : new Error(String(error));
      } else {
        throw error;
      }
    }

    if (attempt < RETRY_DELAYS_MS.length) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }

  // If we exhausted retries due to network errors, throw the last error
  if (lastError) {
    throw lastError;
  }

  return fetchWithTimeout(url, init, timeoutMs);
};

// Generate a safer prompt using Grok directly (avoids self-referential API call issues in serverless)
const generateSaferPromptWithGrok = async (handle: string, originalPrompt: string): Promise<string> => {
  const breakerKey = 'xai:safety-rewrite';
  if (!canProceed(breakerKey)) {
    throw new Error('Safety rewrite service is temporarily unavailable');
  }

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
    recordFailure(breakerKey);
    throw new Error(`Failed to generate safer prompt: ${response.status}`);
  }

  const rawData = await response.json();
  const validationResult = GrokResponseSchema.safeParse(rawData);

  if (!validationResult.success) {
    console.error('Invalid Grok response for safety rewrite:', validationResult.error);
    recordFailure(breakerKey);
    throw new Error('Invalid response from Grok API');
  }

  const saferPrompt = extractGrokContent(validationResult.data);
  if (!saferPrompt) {
    recordFailure(breakerKey);
    throw new Error('No content in Grok safety rewrite response');
  }

  recordSuccess(breakerKey);
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

    // Validate handle format - allows single handles (1-15 chars) or combined handles for joint pics (up to 31 chars: handle1_handle2)
    const HANDLE_REGEX = /^[a-zA-Z0-9_]{1,31}$/;
    if (!handle || !HANDLE_REGEX.test(handle)) {
      console.error('Invalid handle format:', handle);
      return NextResponse.json(
        { error: 'Invalid handle format.' },
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

      const breakerKey = 'openrouter:image';
      if (!canProceed(breakerKey)) {
        throw new Error('Image generation service is temporarily unavailable');
      }

      const response = await fetchWithRetry(
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
        recordFailure(breakerKey);
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const rawData = await response.json();
      const validationResult = GeminiImageResponseSchema.safeParse(rawData);

      // Handle validation failure - likely a safety filter blocking the response
      if (!validationResult.success) {
        console.error('Invalid Gemini API response structure:', validationResult.error);
        console.log('Raw response:', JSON.stringify(rawData).substring(0, 500));
        recordFailure(breakerKey);

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
        recordFailure(breakerKey);
        throw new Error('Failed to generate image - no image URL in response');
      }

      recordSuccess(breakerKey);
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

