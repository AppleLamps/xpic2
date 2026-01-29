import { NextRequest, NextResponse } from 'next/server';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';
import { getCorsHeaders } from '@/lib/schemas';
import { canProceed, recordFailure, recordSuccess } from '@/lib/circuit-breaker';
import { z } from 'zod';

// Grok Imagine Video model
const VIDEO_MODEL = 'grok-imagine-video';

// Timeout for video generation request (initial request is fast, polling is separate)
const VIDEO_REQUEST_TIMEOUT = 30000;
// Timeout for polling (5 minutes max)
const VIDEO_POLL_TIMEOUT = 300000;
// Poll interval
const POLL_INTERVAL = 3000;

// Request validation schema
const VideoRequestSchema = z.object({
    prompt: z.string().min(1, 'Prompt is required').max(4000, 'Prompt too long'),
    duration: z.number().min(1).max(15).optional().default(5),
    aspectRatio: z.enum(['16:9', '9:16', '4:3', '3:4', '1:1', '3:2', '2:3']).optional().default('16:9'),
    resolution: z.enum(['720p', '480p']).optional().default('720p'),
    imageUrl: z.string().url().optional(), // For image-to-video
});

// Response schema for video generation request
const VideoRequestResponseSchema = z.object({
    request_id: z.string(),
});

// Response schema for video result polling
const VideoResultSchema = z.object({
    url: z.string().url().optional(),
    status: z.string().optional(),
    error: z.string().optional(),
});

export async function OPTIONS() {
    return NextResponse.json(null, { headers: getCorsHeaders() });
}

export async function POST(req: NextRequest) {
    const corsHeaders = getCorsHeaders();
    const breakerKey = 'xai:imagine-video';

    try {
        const body = await req.json();

        // Validate request
        const validationResult = VideoRequestSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: validationResult.error.issues[0].message },
                { status: 400, headers: corsHeaders }
            );
        }

        const { prompt, duration, aspectRatio, resolution, imageUrl } = validationResult.data;

        // Check circuit breaker
        if (!canProceed(breakerKey)) {
            return NextResponse.json(
                { error: 'Video generation service is temporarily unavailable. Please try again later.' },
                { status: 503, headers: corsHeaders }
            );
        }

        const xaiApiKey = process.env.XAI_API_KEY;
        if (!xaiApiKey) {
            console.error('XAI_API_KEY is not configured');
            return NextResponse.json(
                { error: 'API key not configured' },
                { status: 500, headers: corsHeaders }
            );
        }

        console.log(`Starting video generation with Grok Imagine, duration: ${duration}s, aspect ratio: ${aspectRatio}`);

        // Build request body
        const requestBody: Record<string, unknown> = {
            model: VIDEO_MODEL,
            prompt,
            duration,
            aspect_ratio: aspectRatio,
            resolution,
        };

        // Add image URL if provided (for image-to-video)
        if (imageUrl) {
            requestBody.image = { url: imageUrl };
        }

        // Step 1: Send video generation request
        const startResponse = await fetchWithTimeout(
            'https://api.x.ai/v1/videos/generations',
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${xaiApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            },
            VIDEO_REQUEST_TIMEOUT
        );

        if (!startResponse.ok) {
            const errorText = await startResponse.text();
            console.error('xAI Video API error:', startResponse.status, errorText);
            recordFailure(breakerKey);

            let errorMessage = 'Failed to start video generation';
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
            } catch {
                // Use default error message
            }

            return NextResponse.json(
                { error: errorMessage },
                { status: startResponse.status, headers: corsHeaders }
            );
        }

        const startData = await startResponse.json();
        const startValidation = VideoRequestResponseSchema.safeParse(startData);

        if (!startValidation.success) {
            console.error('Invalid video request response:', startValidation.error);
            recordFailure(breakerKey);
            return NextResponse.json(
                { error: 'Invalid response from video generation API' },
                { status: 500, headers: corsHeaders }
            );
        }

        const { request_id } = startValidation.data;
        console.log(`Video generation started, request_id: ${request_id}`);

        // Step 2: Poll for result
        const startTime = Date.now();
        let videoUrl: string | null = null;
        let lastError: string | null = null;

        while (Date.now() - startTime < VIDEO_POLL_TIMEOUT) {
            await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));

            try {
                const pollResponse = await fetchWithTimeout(
                    `https://api.x.ai/v1/videos/${request_id}`,
                    {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${xaiApiKey}`,
                        },
                    },
                    VIDEO_REQUEST_TIMEOUT
                );

                if (!pollResponse.ok) {
                    const errorText = await pollResponse.text();
                    console.log('Poll response not ok:', pollResponse.status, errorText);

                    // 404 might mean still processing
                    if (pollResponse.status === 404) {
                        continue;
                    }

                    lastError = `Poll failed: ${pollResponse.status}`;
                    continue;
                }

                const pollData = await pollResponse.json();
                console.log('Poll response:', JSON.stringify(pollData).substring(0, 200));

                const pollValidation = VideoResultSchema.safeParse(pollData);

                if (pollValidation.success) {
                    if (pollValidation.data.url) {
                        videoUrl = pollValidation.data.url;
                        break;
                    }
                    if (pollValidation.data.error) {
                        lastError = pollValidation.data.error;
                        break;
                    }
                    if (pollValidation.data.status === 'failed') {
                        lastError = 'Video generation failed';
                        break;
                    }
                }
            } catch (pollError) {
                console.log('Poll error:', pollError);
                // Continue polling on transient errors
            }
        }

        if (videoUrl) {
            recordSuccess(breakerKey);
            console.log('Video generated successfully');
            return NextResponse.json(
                {
                    video: {
                        id: request_id,
                        url: videoUrl,
                    }
                },
                { headers: corsHeaders }
            );
        }

        // Timeout or error
        recordFailure(breakerKey);
        return NextResponse.json(
            {
                error: lastError || 'Video generation timed out. Please try again.',
                requestId: request_id, // Return request ID in case they want to check later
            },
            { status: 504, headers: corsHeaders }
        );
    } catch (error) {
        console.error('Error in imagine video generation:', error);
        recordFailure(breakerKey);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error occurred' },
            { status: 500, headers: corsHeaders }
        );
    }
}
