import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 10);
const NO_STORE_HEADERS = {
    'Cache-Control': 'no-store, max-age=0',
    Pragma: 'no-cache',
};

export async function POST(req: NextRequest) {
    try {
        const { videoDataUrl } = await req.json();

        if (!videoDataUrl) {
            return NextResponse.json(
                { error: 'No video data provided' },
                { status: 400, headers: NO_STORE_HEADERS }
            );
        }

        // Extract base64 data from data URL
        const base64Match = videoDataUrl.match(/^data:video\/(\w+);base64,(.+)$/);
        if (!base64Match) {
            return NextResponse.json(
                { error: 'Invalid video data format' },
                { status: 400, headers: NO_STORE_HEADERS }
            );
        }

        const [, videoType, base64Data] = base64Match;

        // Convert base64 to buffer
        const buffer = Buffer.from(base64Data, 'base64');

        // Check video size (max 50MB for video editing)
        const maxSize = 50 * 1024 * 1024;
        if (buffer.length > maxSize) {
            return NextResponse.json(
                { error: 'Video too large. Maximum size is 50MB.' },
                { status: 400, headers: NO_STORE_HEADERS }
            );
        }

        // Generate unique ID for the video
        const videoId = nanoid();
        const filename = `grok-imagine-videos/${videoId}.${videoType}`;

        // Upload to Vercel Blob
        const blob = await put(filename, buffer, {
            access: 'public',
            contentType: `video/${videoType}`,
        });

        return NextResponse.json({
            success: true,
            videoId,
            videoUrl: blob.url,
        }, { headers: NO_STORE_HEADERS });
    } catch (error) {
        console.error('Video upload error:', error);
        return NextResponse.json(
            { error: 'Failed to upload video' },
            { status: 500, headers: NO_STORE_HEADERS }
        );
    }
}
