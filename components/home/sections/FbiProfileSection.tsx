'use client';

import { Check, Copy } from 'lucide-react';

interface FbiProfileSectionProps {
  profile: string;
  isCopied: boolean;
  onCopy: () => void | Promise<void>;
}

export default function FbiProfileSection({ profile, isCopied, onCopy }: FbiProfileSectionProps) {
  return (
    <div className="max-w-4xl mx-auto select-text">
      <div className="relative bg-[#0c0c0c] border border-red-900/40 shadow-2xl shadow-red-900/20 overflow-hidden">
        <div className="bg-gradient-to-r from-red-950/50 via-red-900/30 to-red-950/50 border-b border-red-800/40 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-red-500 font-bold tracking-[0.25em] text-sm">CLASSIFIED</span>
            <span className="text-red-400/50 text-xs tracking-wider font-mono">// LAW ENFORCEMENT SENSITIVE</span>
          </div>
          <button
            onClick={onCopy}
            className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded transition-all"
          >
            {isCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            <span>{isCopied ? 'Copied!' : 'Copy Report'}</span>
          </button>
        </div>

        <div className="p-8 lg:p-12 relative">
          <div className="absolute bottom-24 right-8 opacity-[0.04] pointer-events-none select-none">
            <svg viewBox="0 0 100 100" className="w-28 h-28 text-white">
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="1" />
              <text x="50" y="35" textAnchor="middle" fontSize="6" fill="currentColor" fontWeight="bold">FEDERAL BUREAU</text>
              <text x="50" y="55" textAnchor="middle" fontSize="8" fill="currentColor" fontWeight="bold">FBI</text>
              <text x="50" y="70" textAnchor="middle" fontSize="6" fill="currentColor" fontWeight="bold">OF INVESTIGATION</text>
            </svg>
          </div>

          <div className="text-[13px] leading-[1.9] whitespace-pre-wrap font-mono text-neutral-300 select-text cursor-text [&>*]:select-text">
            {profile}
          </div>

          <div className="mt-12 pt-6 border-t border-red-900/30">
            <div className="flex items-center justify-between text-[10px] text-neutral-600">
              <div className="tracking-[0.15em]">UNCLASSIFIED WHEN SEPARATED FROM ATTACHMENTS</div>
              <div className="tracking-[0.1em]">PAGE 1 OF 1</div>
            </div>
            <div className="text-center mt-4">
              <div className="text-[9px] tracking-[0.2em] text-red-500/40 font-medium">
                UNAUTHORIZED DISCLOSURE SUBJECT TO CRIMINAL SANCTIONS
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-950/50 via-red-900/30 to-red-950/50 border-t border-red-800/40 px-6 py-2 text-center">
          <span className="text-red-500/60 font-bold tracking-[0.3em] text-[11px]">SECRET // NOFORN // ORCON</span>
        </div>
      </div>
    </div>
  );
}
