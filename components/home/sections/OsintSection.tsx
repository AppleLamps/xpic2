'use client';

import { Check, Copy } from 'lucide-react';
import { OsintReport } from '@/components/OsintReport';

interface OsintSectionProps {
  report: string;
  isCopied: boolean;
  onCopy: () => void | Promise<void>;
}

export default function OsintSection({ report, isCopied, onCopy }: OsintSectionProps) {
  return (
    <div className="max-w-4xl mx-auto select-text">
      <div className="relative bg-[#0a0d0f] border border-emerald-900/40 shadow-2xl shadow-emerald-900/20 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-950/50 via-emerald-900/30 to-emerald-950/50 border-b border-emerald-800/40 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-emerald-400 font-bold tracking-[0.25em] text-sm">INTERNAL CLASSIFICATION</span>
            <span className="text-emerald-400/50 text-xs tracking-wider font-mono">// OSINT DOSSIER</span>
          </div>
          <button
            onClick={onCopy}
            className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded transition-all"
          >
            {isCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            <span>{isCopied ? 'Copied!' : 'Copy Dossier'}</span>
          </button>
        </div>

        <div className="p-8 lg:p-12 relative">
          <div className="absolute bottom-24 right-8 opacity-[0.03] pointer-events-none select-none">
            <div className="text-emerald-500 font-bold tracking-[0.3em] text-6xl rotate-[-15deg]">
              OSINT
            </div>
          </div>

          <OsintReport content={report} />

          <div className="mt-12 pt-6 border-t border-emerald-900/30">
            <div className="flex items-center justify-between text-[10px] text-neutral-600">
              <div className="tracking-[0.15em]">OPEN SOURCE INTELLIGENCE ANALYSIS</div>
              <div className="tracking-[0.1em]">UNCLASSIFIED // PUBLIC DATA</div>
            </div>
            <div className="text-center mt-4">
              <div className="text-[9px] tracking-[0.2em] text-emerald-500/40 font-medium">
                BASED ON PUBLICLY AVAILABLE INFORMATION ONLY
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-emerald-950/50 via-emerald-900/30 to-emerald-950/50 border-t border-emerald-800/40 px-6 py-2 text-center">
          <span className="text-emerald-500/60 font-bold tracking-[0.3em] text-[11px]">USER CLASSIFICATION DOSSIER</span>
        </div>
      </div>
    </div>
  );
}
