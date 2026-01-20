import { NextRequest, NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';
import { customAlphabet } from 'nanoid';

// Use alphanumeric only (no underscores or dashes) to avoid filename parsing issues
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 10);

export async function POST(req: NextRequest) {
  try {
    const { imageDataUrl, username } = await req.json();

    if (!imageDataUrl) {
      return NextResponse.json(
        { error: 'No image data provided' },
        { status: 400 }
      );
    }

    // Extract base64 data from data URL
    const base64Match = imageDataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      return NextResponse.json(
        { error: 'Invalid image data format' },
        { status: 400 }
      );
    }

    const [, imageType, base64Data] = base64Match;

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');

    // Generate unique ID for the image (alphanumeric only)
    const imageId = nanoid();

    // Include username in filename for later retrieval
    // Use double underscore as separator since username won't have underscores after sanitization
    const usernameSlug = username ? `__${username.replace(/[^a-zA-Z0-9]/g, '')}` : '';
    const filename = `xpressionist/${imageId}${usernameSlug}.${imageType}`;

    // Upload to Vercel Blob
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: `image/${imageType}`,
    });

    return NextResponse.json({
      success: true,
      imageId,
      imageUrl: blob.url,
      shareUrl: `/share/${imageId}`,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve image by ID using Vercel Blob list
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const imageId = searchParams.get('id');

  if (!imageId) {
    return NextResponse.json(
      { error: 'No image ID provided' },
      { status: 400 }
    );
  }

  try {
    // Search for blobs with this ID prefix
    const { blobs } = await list({
      prefix: `xpressionist/${imageId}`,
      limit: 1,
    });

    if (blobs.length === 0) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    const blob = blobs[0];

    // Extract username from filename if present (uses __ as separator)
    const filenameMatch = blob.pathname.match(/xpressionist\/[A-Za-z0-9]+__([^.]+)\./);
    const username = filenameMatch ? filenameMatch[1] : undefined;

    return NextResponse.json({
      imageId,
      url: blob.url,
      username,
      uploadedAt: blob.uploadedAt,
    });
  } catch (error) {
    console.error('Get image error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve image' },
      { status: 500 }
    );
  }
}

