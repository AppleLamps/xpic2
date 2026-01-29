// Shared types for Grok Imagine components

export type GenerationType = 'image' | 'video';
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3';

export interface GalleryImage {
    id: string;
    prompt: string;
    createdAt: number;
    aspectRatio: string;
    folderId: string | null;
    type: 'image' | 'video';
    thumbnailUrl?: string;
    url?: string; // For video URLs
}

export interface Folder {
    id: string;
    name: string;
    createdAt: number;
    order: number;
}

export interface GenerationSettings {
    prompt: string;
    type: GenerationType;
    aspectRatio: AspectRatio;
    imageCount: number;
    videoDuration: number;
    editImageBase64?: string | null;
}

export const ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
    { value: '1:1', label: '1:1 Square' },
    { value: '16:9', label: '16:9 Landscape' },
    { value: '9:16', label: '9:16 Portrait' },
    { value: '4:3', label: '4:3 Classic' },
    { value: '3:4', label: '3:4 Portrait' },
];

export const PROMPT_SUGGESTIONS = [
    'A mystical forest with glowing mushrooms and fireflies',
    'A futuristic cityscape with flying cars and neon signs',
    'A serene Japanese garden with cherry blossoms falling',
    'An astronaut riding a horse on Mars',
    'A cozy coffee shop on a rainy day',
    'A majestic dragon on a mountain peak at sunset',
];
