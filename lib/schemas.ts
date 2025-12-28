import { z } from 'zod';

/**
 * xAI Grok API response schema
 * Used for analyze-account, roast-account, and fbi-profile endpoints
 */
export const GrokResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string(),
        }),
      })
    )
    .min(1, 'No choices returned from Grok API'),
});

/**
 * OpenRouter/Gemini image generation response schema
 * Includes support for native_finish_reason for safety blocks
 */
export const GeminiImageResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        native_finish_reason: z.string().optional(),
        message: z.object({
          images: z
            .array(
              z.object({
                image_url: z.object({
                  url: z.string().url('Invalid image URL from Gemini'),
                }),
              })
            )
            .optional(),
        }),
      })
    )
    .min(1, 'No choices returned from Gemini API'),
});

/**
 * GetImg.ai Flux response schema
 * Supports both URL and base64 response formats
 */
export const GetImgResponseSchema = z.object({
  // GetImg returns image as base64 in 'image' field or URL in 'url' field
  image: z.string().optional(),
  url: z.string().url().optional(),
  data: z
    .array(
      z.object({
        url: z.string().url(),
      })
    )
    .optional(),
});

/**
 * Helper to extract content from validated Grok response
 */
export function extractGrokContent(data: z.infer<typeof GrokResponseSchema>): string {
  return data.choices[0].message.content;
}

/**
 * Helper to extract image URL from validated Gemini response
 * Returns null if safety blocked (for retry logic)
 */
export function extractGeminiImage(
  data: z.infer<typeof GeminiImageResponseSchema>
): { url: string } | { safetyBlocked: true } | null {
  const choice = data.choices[0];

  if (choice.native_finish_reason === 'IMAGE_SAFETY') {
    return { safetyBlocked: true };
  }

  const imageUrl = choice.message.images?.[0]?.image_url?.url;
  if (!imageUrl) {
    return null;
  }

  return { url: imageUrl };
}

/**
 * Helper to extract image URL from validated GetImg response
 */
export function extractGetImgUrl(data: z.infer<typeof GetImgResponseSchema>): string | null {
  return data.image || data.url || data.data?.[0]?.url || null;
}

/**
 * CORS configuration helper
 * Returns appropriate origin based on environment
 */
export function getCorsHeaders(): Record<string, string> {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
  return {
    'Access-Control-Allow-Origin': allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}
