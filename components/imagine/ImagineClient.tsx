'use client';

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

// Import modular CSS files
import '@/app/imagine/imagine.css';
import '@/app/imagine/sidebar.css';
import '@/app/imagine/gallery.css';
import '@/app/imagine/input-bar.css';
import '@/app/imagine/lightbox-settings.css';

import { useImagineStore } from '@/hooks/useImagineStore';
import ImagineSidebar from './ImagineSidebar';
import ImagineGallery from './ImagineGallery';
import ImagineInputBar from './ImagineInputBar';
import ImagineLightbox from './ImagineLightbox';
import ImagineSettings from './ImagineSettings';
import type { GalleryImage, GenerationType, AspectRatio } from './types';

export default function ImagineClient() {
    const store = useImagineStore();
    const [lightboxImage, setLightboxImage] = useState<GalleryImage | null>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const abortControllerRef = useRef<AbortController | null>(null);

    const handleGenerate = useCallback(
        async (settings: {
            prompt: string;
            type: GenerationType;
            aspectRatio: AspectRatio;
            imageCount: number;
            videoDuration: number;
            editImageBase64?: string | null;
        }) => {
            if (isGenerating) return;
            setIsGenerating(true);
            abortControllerRef.current = new AbortController();
            const isVideo = settings.type === 'video';
            const count = isVideo || settings.editImageBase64 ? 1 : settings.imageCount;
            const placeholderIds = store.addPlaceholders(count);

            try {
                if (isVideo) {
                    const res = await fetch('/api/imagine-video', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            prompt: settings.prompt,
                            aspect_ratio: settings.aspectRatio,
                            duration: settings.videoDuration,
                        }),
                        signal: abortControllerRef.current.signal,
                    });
                    if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.error || 'Video generation failed');
                    }
                    const data = await res.json();
                    store.removePlaceholder(placeholderIds[0]);
                    if (data.video?.url) {
                        await store.addVideoUrl(data.video.url, settings.prompt, settings.aspectRatio);
                        toast.success('Video generated!');
                    }
                } else {
                    const res = await fetch('/api/imagine', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            prompt: settings.prompt,
                            n: count,
                            aspect_ratio: settings.aspectRatio,
                            response_format: 'b64_json',
                            ...(settings.editImageBase64 && { imageBase64: settings.editImageBase64 }),
                        }),
                        signal: abortControllerRef.current.signal,
                    });
                    if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.error || 'Image generation failed');
                    }
                    const data = await res.json();
                    if (!data.data || !Array.isArray(data.data)) {
                        throw new Error('Invalid response format from API');
                    }
                    for (let i = 0; i < data.data.length; i++) {
                        const b64 = data.data[i].b64_json;
                        if (!b64) {
                            console.error('Missing b64_json in response:', data.data[i]);
                            continue;
                        }
                        const dataUri = `data:image/png;base64,${b64}`;
                        if (placeholderIds[i]) store.removePlaceholder(placeholderIds[i]);
                        await store.addImage(dataUri, settings.prompt, settings.aspectRatio, 'image');
                    }
                    toast.success(`${data.data.length} image${data.data.length > 1 ? 's' : ''} generated!`);
                }
            } catch (err: unknown) {
                if ((err as Error).name === 'AbortError') {
                    toast.info('Generation cancelled');
                } else {
                    toast.error((err as Error).message || 'Generation failed');
                }
                store.removeAllPlaceholders();
            } finally {
                setIsGenerating(false);
                abortControllerRef.current = null;
            }
        },
        [isGenerating, store]
    );

    const handleCancel = useCallback(() => {
        abortControllerRef.current?.abort();
        store.removeAllPlaceholders();
        setIsGenerating(false);
    }, [store]);

    const filteredImages = store.getFilteredImages();

    if (store.isLoading) {
        return (
            <div className="imagine-loading">
                <div className="imagine-loading__spinner" />
                <p>Loading gallery...</p>
            </div>
        );
    }

    return (
        <div className={`imagine-layout ${!sidebarOpen ? 'imagine-layout--sidebar-collapsed' : ''}`}>
            <ImagineSidebar
                folders={store.folders}
                images={store.images}
                selectedFolderId={store.selectedFolderId}
                onSelectFolder={store.setSelectedFolder}
                onCreateFolder={store.createFolder}
                onDeleteFolder={store.deleteFolder}
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
            />

            <main className="imagine-main">
                <ImagineGallery
                    images={filteredImages}
                    placeholderIds={store.placeholderIds}
                    onImageClick={setLightboxImage}
                    onDeleteImage={store.deleteImage}
                />
            </main>

            <ImagineInputBar
                isGenerating={isGenerating}
                folders={store.folders}
                selectedFolderId={store.selectedFolderId}
                onGenerate={handleGenerate}
                onCancel={handleCancel}
                onSelectFolder={store.setSelectedFolder}
                onOpenSettings={() => setSettingsOpen(true)}
            />

            <ImagineLightbox
                image={lightboxImage}
                onClose={() => setLightboxImage(null)}
                getFullImageUrl={store.getFullImageUrl}
            />

            <ImagineSettings
                isOpen={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                imageCount={store.images.length}
                storageInfo={store.storageInfo}
                onClearAll={store.clearAll}
            />
        </div>
    );
}
