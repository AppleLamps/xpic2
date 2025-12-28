/**
 * Fetch with timeout support using AbortController
 * Prevents requests from hanging indefinitely
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Default timeout values for different API calls
 */
export const API_TIMEOUTS = {
  /** xAI Grok API - analysis can take longer */
  GROK_ANALYSIS: 60000,
  /** OpenRouter image generation */
  IMAGE_GENERATION: 45000,
  /** GetImg.ai Flux - typically faster */
  FLUX_GENERATION: 30000,
} as const;
