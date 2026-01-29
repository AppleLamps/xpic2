'use client';

import { Flame, Check, Copy } from 'lucide-react';

interface RoastSectionProps {
  roast: string;
  isCopied: boolean;
  onCopy: () => void | Promise<void>;
}

export default function RoastSection({ roast, isCopied, onCopy }: RoastSectionProps) {
  return (
    <div className="max-w-2xl mx-auto bg-[#1a1a1a] border border-amber-500/20 rounded-2xl p-6 lg:p-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-600"></div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-amber-500 font-semibold">
          <Flame className="w-5 h-5" />
          Therapy Session Notes
        </div>
        <button onClick={onCopy} className="text-neutral-500 hover:text-white">
          {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <div className="font-serif text-lg leading-relaxed text-neutral-300 whitespace-pre-wrap">
        {roast}
      </div>
    </div>
  );
}
