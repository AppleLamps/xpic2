'use client';

import { useState } from 'react';
import { Check, ChevronRight, Palette } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// Art style type
export type ArtStyle = {
  id: string;
  name: string;
  description: string;
  category: 'classic' | 'anime' | 'modern' | 'artistic' | 'fun';
};

// All art styles organized by category
export const ART_STYLES: ArtStyle[] = [
  // Classic/Traditional
  { id: 'default', name: 'MAD Magazine', description: 'Bold satirical cartoon style', category: 'classic' },
  { id: 'oil', name: 'Oil Painting', description: 'Classical oil painting style', category: 'classic' },
  { id: 'watercolor', name: 'Watercolor', description: 'Soft watercolor painting', category: 'classic' },
  { id: 'charcoal', name: 'Charcoal Sketch', description: 'Dramatic charcoal drawing', category: 'classic' },
  { id: 'renaissance', name: 'Renaissance', description: 'Classical Renaissance portrait', category: 'classic' },
  { id: 'baroque', name: 'Baroque', description: 'Ornate dramatic lighting', category: 'classic' },
  { id: 'pencil', name: 'Pencil Sketch', description: 'Detailed pencil drawing', category: 'classic' },
  { id: 'artdeco', name: 'Art Deco', description: '1920s geometric elegance', category: 'classic' },

  // Anime/Eastern
  { id: 'ghibli', name: 'Studio Ghibli', description: 'Whimsical anime fantasy style', category: 'anime' },
  { id: 'anime', name: 'Anime', description: 'Japanese anime style', category: 'anime' },
  { id: 'manga', name: 'Manga B&W', description: 'Black & white manga panels', category: 'anime' },
  { id: 'chibi', name: 'Chibi', description: 'Cute super-deformed style', category: 'anime' },
  { id: 'ukiyo', name: 'Ukiyo-e', description: 'Japanese woodblock prints', category: 'anime' },
  { id: 'shonen', name: 'Shonen Action', description: 'Epic battle manga style', category: 'anime' },
  { id: 'manhwa', name: 'Manhwa', description: 'Korean webtoon style', category: 'anime' },

  // Modern/Digital
  { id: 'pixar', name: 'Pixar 3D', description: '3D animated movie style', category: 'modern' },
  { id: 'cyberpunk', name: 'Cyberpunk', description: 'Neon-lit futuristic style', category: 'modern' },
  { id: 'vaporwave', name: 'Vaporwave', description: '80s/90s aesthetic nostalgia', category: 'modern' },
  { id: 'lowpoly', name: 'Low Poly', description: 'Geometric 3D faceted style', category: 'modern' },
  { id: 'neon', name: 'Neon Glow', description: 'Glowing neon light art', category: 'modern' },
  { id: 'minimalist', name: 'Minimalist', description: 'Clean minimal illustration', category: 'modern' },
  { id: 'glitch', name: 'Glitch Art', description: 'Digital corruption aesthetic', category: 'modern' },
  { id: 'synthwave', name: 'Synthwave', description: 'Retro-futuristic 80s', category: 'modern' },
  { id: 'hyperreal', name: 'Hyperrealistic', description: 'Ultra-detailed photorealism', category: 'modern' },

  // Artistic
  { id: 'comic', name: 'Comic Book', description: 'Bold comic book panels', category: 'artistic' },
  { id: 'retro', name: 'Retro Pop Art', description: '80s/90s pop art style', category: 'artistic' },
  { id: 'impressionist', name: 'Impressionist', description: 'Monet-style brushwork', category: 'artistic' },
  { id: 'surreal', name: 'Surrealism', description: 'Dreamlike Salvador Dalí style', category: 'artistic' },
  { id: 'warhol', name: 'Warhol Pop', description: 'Andy Warhol screen print', category: 'artistic' },
  { id: 'noir', name: 'Film Noir', description: 'Moody black & white cinema', category: 'artistic' },
  { id: 'expressionist', name: 'Expressionist', description: 'Bold emotional distortion', category: 'artistic' },
  { id: 'psychedelic', name: 'Psychedelic', description: 'Trippy 60s colorful swirls', category: 'artistic' },

  // Fun/Novelty
  { id: 'sticker', name: 'Sticker Art', description: 'Die-cut sticker aesthetic', category: 'fun' },
  { id: 'claymation', name: 'Claymation', description: 'Stop-motion clay style', category: 'fun' },
  { id: 'graffiti', name: 'Street Graffiti', description: 'Urban spray paint art', category: 'fun' },
  { id: 'pixel', name: 'Pixel Art', description: '8-bit retro game style', category: 'fun' },
  { id: 'lego', name: 'LEGO', description: 'Brick-built minifigure style', category: 'fun' },
  { id: 'papercut', name: 'Paper Cut', description: 'Layered paper craft art', category: 'fun' },
  { id: 'balloon', name: 'Balloon Animal', description: 'Twisted balloon sculpture', category: 'fun' },
  { id: 'plushie', name: 'Plushie', description: 'Cute stuffed toy style', category: 'fun' },
  { id: 'vintage', name: 'Vintage Photo', description: 'Old timey sepia portrait', category: 'fun' },
  { id: 'steampunk', name: 'Steampunk', description: 'Victorian brass & gears', category: 'fun' },
  { id: 'fantasy', name: 'Fantasy RPG', description: 'Epic D&D character art', category: 'fun' },
];

// Category definitions
const CATEGORIES = [
  { id: 'classic', name: 'Classic' },
  { id: 'anime', name: 'Anime' },
  { id: 'modern', name: 'Modern' },
  { id: 'artistic', name: 'Art' },
  { id: 'fun', name: 'Fun' },
] as const;

type CategoryId = typeof CATEGORIES[number]['id'];

interface StyleSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStyle: string;
  onSelectStyle: (styleId: string) => void;
  disabled?: boolean;
}

export function StyleSelectorModal({
  open,
  onOpenChange,
  selectedStyle,
  onSelectStyle,
  disabled,
}: StyleSelectorModalProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('classic');

  const filteredStyles = ART_STYLES.filter((style) => style.category === activeCategory);

  const handleSelectStyle = (styleId: string) => {
    onSelectStyle(styleId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-neutral-900 border-white/10 text-white max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Palette className="w-5 h-5 text-rose-500" />
            Choose Style
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            Select an art style for your image
          </DialogDescription>
        </DialogHeader>

        {/* Category Tabs */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-lg overflow-x-auto">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={cn(
                'flex-1 min-w-[50px] px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                activeCategory === category.id
                  ? 'bg-white/10 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              )}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Style List */}
        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          <div className="space-y-1 py-2">
            {filteredStyles.map((style) => {
              const isSelected = selectedStyle === style.id;

              return (
                <button
                  key={style.id}
                  onClick={() => handleSelectStyle(style.id)}
                  disabled={disabled}
                  className={cn(
                    'w-full px-3 py-3 rounded-lg transition-all text-left flex items-center justify-between group',
                    isSelected
                      ? 'bg-rose-500/10 border border-rose-500/30'
                      : 'hover:bg-white/5 border border-transparent',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'font-medium text-sm',
                        isSelected ? 'text-rose-400' : 'text-white'
                      )}>
                        {style.name}
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-rose-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {style.description}
                    </p>
                  </div>
                  <ChevronRight className={cn(
                    'w-4 h-4 shrink-0 transition-opacity',
                    isSelected ? 'text-rose-500 opacity-100' : 'text-neutral-600 opacity-0 group-hover:opacity-100'
                  )} />
                </button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Trigger button component for the style selector
interface StyleSelectorTriggerProps {
  selectedStyle: string;
  onClick: () => void;
  disabled?: boolean;
}

export function StyleSelectorTrigger({ selectedStyle, onClick, disabled }: StyleSelectorTriggerProps) {
  const style = ART_STYLES.find((s) => s.id === selectedStyle) || ART_STYLES[0];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full px-4 py-3 text-sm bg-white/[0.08] border border-white/[0.12] rounded-2xl',
        'text-white flex items-center justify-between gap-2',
        'cursor-pointer focus:outline-none focus:bg-white/[0.12] focus:border-rose-500/50',
        'transition-all hover:bg-white/[0.12]',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className="flex items-center gap-2">
        <Palette className="w-4 h-4 text-neutral-400" />
        <span className="font-medium">{style.name}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-neutral-400" />
    </button>
  );
}
