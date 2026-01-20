'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { shareOnX, imageUrlToDataUrl, getDefaultShareText } from '@/lib/share';

// X logo SVG component
function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

interface ShareButtonProps {
  imageUrl: string; // Can be blob URL, data URL, or external URL
  username?: string;
  shareText?: string;
  className?: string;
  variant?: 'primary' | 'secondary';
}

export function ShareButton({
  imageUrl,
  username,
  shareText,
  className = '',
  variant = 'primary',
}: ShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    if (isSharing) return;

    setIsSharing(true);
    
    try {
      // Convert image URL to data URL if needed
      let imageDataUrl = imageUrl;
      if (!imageUrl.startsWith('data:')) {
        toast.info('Preparing image for sharing...');
        imageDataUrl = await imageUrlToDataUrl(imageUrl);
      }

      // Use custom share text or generate default
      const text = shareText || getDefaultShareText(username);

      // Upload and share
      const result = await shareOnX(imageDataUrl, text, username);

      if (!result.success) {
        throw new Error(result.error || 'Share failed');
      }

      toast.success('Opening X to share!');
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to share. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const baseStyles = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all disabled:opacity-50';
  
  const variantStyles = {
    primary: 'px-5 py-3 bg-black text-white border border-white/20 hover:bg-white hover:text-black shadow-lg',
    secondary: 'px-4 py-2 bg-white/10 text-white border border-white/10 hover:bg-white/20 text-sm',
  };

  return (
    <button
      onClick={handleShare}
      disabled={isSharing}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
    >
      {isSharing ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Sharing...
        </>
      ) : (
        <>
          <XLogo className="w-4 h-4" />
          Share on X
        </>
      )}
    </button>
  );
}

