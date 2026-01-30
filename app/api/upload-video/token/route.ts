import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 10);

export async function POST(req: NextRequest) {
    const body = await req.json() as HandleUploadBody;

    try {
        const response = await handleUpload({
            body,
            request: req,
            onBeforeGenerateToken: async () => {
                // Generate a unique video ID for the filename
                const videoId = nanoid();
                return {
                    allowedContentTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'],
                    maximumSizeInBytes: 50 * 1024 * 1024, // 50MB max
                    tokenPayload: JSON.stringify({ videoId }),
                };
            },
            onUploadCompleted: async ({ blob, tokenPayload }) => {
                // This callback runs after the upload is complete
                console.log('Video upload completed:', blob.url);
            },
        });

        return NextResponse.json(response);
    } catch (error) {
        console.error('Upload token error:', error);
        return NextResponse.json(
            { error: 'Failed to generate upload token' },
            { status: 500 }
        );
    }
}
