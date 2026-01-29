import { NextRequest, NextResponse } from 'next/server';
import {
  PROMPT_CONFIG,
  API_CONFIG,
  OPENROUTER_MODELS,
  SYSTEM_PROMPTS,
  getPromptMode,
  DEFAULT_PROMPT_SCHEMA,
  JSON_MODE_SCHEMA,
  parseStructuredContent,
  ensureTextPrompt,
  ensureJsonPrompt,
  type JsonPromptPayload,
  type StructuredPayload,
} from '@/lib/prompt-config';

// Types
interface GenerateRequestBody {
  idea?: string;
  directions?: string;
  isJsonMode?: boolean;
  isTestMode?: boolean;
  isVideoPrompt?: boolean;
  imageBase64?: string;
  imageMimeType?: string;
}

type OpenRouterContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    >;

interface OpenRouterMessage {
  role: 'system' | 'user';
  content: OpenRouterContent;
}

interface JsonSchemaResponseFormat {
  type: 'json_schema';
  json_schema: {
    name: string;
    schema: object;
    strict?: boolean;
  };
}

interface OpenRouterRequestBody {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  usage?: { include: boolean };
  response_format?: JsonSchemaResponseFormat;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: { content?: unknown };
  }>;
  usage?: unknown;
}

// Helper to build user content
const buildUserContent = (
  text: string,
  imageBase64?: string | null,
  mimeType?: string
): OpenRouterContent => {
  if (imageBase64) {
    return [
      { type: 'text', text },
      {
        type: 'image_url',
        image_url: { url: `data:${mimeType ?? 'image/png'};base64,${imageBase64}` },
      },
    ];
  }
  return text;
};

// OpenRouter API call
async function makeOpenRouterCall(
  apiKey: string,
  body: OpenRouterRequestBody,
  title: string = 'Grokify Prompt Generator'
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.REQUEST_TIMEOUT);

  const referer = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_BASE_URL || 'https://grokify.ai';

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': referer,
        'X-Title': title,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequestBody = await request.json();

    const {
      idea = '',
      directions = '',
      isJsonMode = false,
      isTestMode = false,
      isVideoPrompt = false,
      imageBase64,
      imageMimeType = 'image/png',
    } = body;

    // Validate input
    if (idea.length > PROMPT_CONFIG.IDEA_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Idea must be under ${PROMPT_CONFIG.IDEA_MAX_LENGTH} characters.` },
        { status: 400 }
      );
    }

    if (directions.length > PROMPT_CONFIG.DIRECTIONS_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Directions must be under ${PROMPT_CONFIG.DIRECTIONS_MAX_LENGTH} characters.` },
        { status: 400 }
      );
    }

    if (!idea.trim() && !imageBase64) {
      return NextResponse.json(
        { error: 'Either an "idea" or an image must be provided' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('OPENROUTER_API_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'API key is not configured. Please contact the administrator.' },
        { status: 500 }
      );
    }

    // Build user prompt
    let userPrompt = '';
    if (imageBase64 && !idea.trim() && !directions.trim()) {
      userPrompt =
        'Please analyze this image and create a detailed prompt to recreate it as closely as possible for AI image generation.';
    } else if (imageBase64 && (idea || directions)) {
      userPrompt = 'Please analyze this image and create a prompt for AI image generation';
      if (idea.trim()) {
        userPrompt += ` incorporating this idea: ${idea}`;
      }
      if (directions.trim()) {
        userPrompt += ` with these additional directions: ${directions}`;
      }
    } else {
      userPrompt = `Idea: ${idea}`;
      if (directions.trim()) {
        userPrompt += `\n\nAdditional directions: ${directions}`;
      }
    }

    if (isJsonMode) {
      userPrompt += '\n\nReturn only raw JSON. No markdown fences, no explanations, no extra text.';
    }

    // Select system prompt and response format
    const promptMode = getPromptMode({ isJsonMode, isVideoPrompt, isTestMode });
    const finalSystemPrompt = SYSTEM_PROMPTS[promptMode];

    const responseFormat: JsonSchemaResponseFormat = {
      type: 'json_schema',
      json_schema: isJsonMode ? JSON_MODE_SCHEMA : DEFAULT_PROMPT_SCHEMA,
    };

    const requestBody: OpenRouterRequestBody = {
      model: OPENROUTER_MODELS.PRIMARY,
      messages: [
        { role: 'system', content: finalSystemPrompt },
        {
          role: 'user',
          content: buildUserContent(userPrompt, imageBase64, imageMimeType),
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      usage: { include: true },
      response_format: responseFormat,
    };

    const openRouterResponse = await makeOpenRouterCall(apiKey, requestBody);

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text();
      console.error('OpenRouter API error:', openRouterResponse.status, errorText);

      if (openRouterResponse.status === 429) {
        return NextResponse.json(
          { error: 'Too many requests. Please wait a moment before trying again.' },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: 'The AI service is currently unavailable. Please try again later.' },
        { status: 500 }
      );
    }

    const data: ChatCompletionResponse = await openRouterResponse.json();

    if (!data?.choices?.[0]?.message?.content) {
      console.error('Invalid OpenRouter API response structure:', data);
      return NextResponse.json(
        { error: 'Received an invalid response from the AI service. Please try again.' },
        { status: 500 }
      );
    }

    let parsedPayload: StructuredPayload;
    try {
      parsedPayload = parseStructuredContent(data.choices[0].message?.content);
    } catch (parseError) {
      console.error('Failed to parse structured response:', parseError);
      return NextResponse.json(
        { error: 'The AI service returned a malformed response. Please try again.' },
        { status: 500 }
      );
    }

    let finalPrompt: string | JsonPromptPayload;
    try {
      finalPrompt = isJsonMode
        ? ensureJsonPrompt(parsedPayload)
        : ensureTextPrompt(parsedPayload);
    } catch (validationError) {
      console.error('Structured response validation failed:', validationError);
      return NextResponse.json(
        { error: 'The AI service returned an invalid response. Please try again.' },
        { status: 500 }
      );
    }

    if (!isJsonMode && !finalPrompt) {
      return NextResponse.json(
        { error: 'The AI service returned an empty response. Please try again with different input.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      prompt: finalPrompt,
      usage: data.usage || null,
    });
  } catch (error) {
    console.error('API Route Error:', error);

    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'The AI service took too long to respond. Please try again.' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
