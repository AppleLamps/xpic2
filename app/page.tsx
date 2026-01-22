'use client';

import { useEffect, useState } from 'react';
import {
  Loader2,
  Download,
  Copy,
  Check,
  ChevronDown,
  Flame,
  History,
  Heart,
  Coffee,
  DollarSign,
  Sparkles,
  Search,
  X,
  ZoomIn,
  Palette,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { PromptHistorySidebar } from '@/components/PromptHistorySidebar';
import { usePromptHistory } from '@/hooks/usePromptHistory';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { ShareButton } from '@/components/ShareButton';

const SUGGESTION_HANDLES = ['levelsio', 'pmarca', 'OfficialLoganK'];

// Art style options for image generation
export type ArtStyle = {
  id: string;
  name: string;
  emoji: string;
  description: string;
};

export const ART_STYLES: ArtStyle[] = [
  { id: 'default', name: 'MAD Magazine', emoji: '🎨', description: 'Bold satirical cartoon style' },
  { id: 'ghibli', name: 'Studio Ghibli', emoji: '🌸', description: 'Whimsical anime fantasy style' },
  { id: 'pixar', name: 'Pixar 3D', emoji: '🎬', description: '3D animated movie style' },
  { id: 'anime', name: 'Anime', emoji: '⚡', description: 'Japanese anime style' },
  { id: 'comic', name: 'Comic Book', emoji: '💥', description: 'Bold comic book panels' },
  { id: 'watercolor', name: 'Watercolor', emoji: '🖌️', description: 'Soft watercolor painting' },
  { id: 'oil', name: 'Oil Painting', emoji: '🎭', description: 'Classical oil painting style' },
  { id: 'cyberpunk', name: 'Cyberpunk', emoji: '🤖', description: 'Neon-lit futuristic style' },
  { id: 'retro', name: 'Retro Pop Art', emoji: '🕹️', description: '80s/90s pop art style' },
  { id: 'minimalist', name: 'Minimalist', emoji: '⬜', description: 'Clean minimal illustration' },
];

export default function Home() {
  const [handle, setHandle] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<string>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [isRoasting, setIsRoasting] = useState(false);
  const [isProfiling, setIsProfiling] = useState(false);
  const [inputError, setInputError] = useState('');
  const [globalError, setGlobalError] = useState('');
  const [loadingStage, setLoadingStage] = useState<'analyze' | 'image' | null>(null);
  const [loadingUsername, setLoadingUsername] = useState<string | null>(null);
  const [result, setResult] = useState<{ imagePrompt: string; imageUrl: string; username: string } | null>(null);
  const [roast, setRoast] = useState<string | null>(null);
  const [fbiProfile, setFbiProfile] = useState<string | null>(null);
  const [osintReport, setOsintReport] = useState<string | null>(null);
  const [isOsintProfiling, setIsOsintProfiling] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isRoastCopied, setIsRoastCopied] = useState(false);
  const [isProfileCopied, setIsProfileCopied] = useState(false);
  const [isOsintCopied, setIsOsintCopied] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const { history, addToHistory, deleteFromHistory, clearHistory } = usePromptHistory();

  const handleGenerate = async () => {
    const normalizedHandle = handle.trim().replace('@', '');

    if (!normalizedHandle) {
      setInputError('Enter a username');
      return;
    }

    setIsLoading(true);
    setInputError('');
    setGlobalError('');
    setResult(null);
    setRoast(null);
    setFbiProfile(null);
    setOsintReport(null);
    setLoadingStage('analyze');
    setLoadingUsername(normalizedHandle);

    try {
      const analysisResponse = await fetch('/api/analyze-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: normalizedHandle }),
      });

      const analysisData = await analysisResponse.json();
      if (!analysisResponse.ok) throw new Error(analysisData.error || 'Failed to analyze account');
      if (!analysisData?.imagePrompt) throw new Error('Failed to generate image prompt');

      setLoadingStage('image');
      const imageResponse = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: analysisData.imagePrompt,
          handle: normalizedHandle,
          style: selectedStyle,
        }),
      });

      const imageData = await imageResponse.json();
      if (!imageResponse.ok) throw new Error(imageData.error || 'Failed to generate image');
      if (!imageData?.imageUrl) throw new Error('Failed to generate image');

      setIsImageLoading(true);
      setResult({
        imagePrompt: analysisData.imagePrompt,
        imageUrl: imageData.imageUrl,
        username: normalizedHandle,
      });

      addToHistory({
        username: normalizedHandle,
        prompt: analysisData.imagePrompt,
        imageUrl: imageData.imageUrl,
      });

      toast.success('Artwork generated!');
    } catch (err: unknown) {
      console.error('Generation error:', err);
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setGlobalError(message);
      toast.error(message);
    } finally {
      setLoadingStage(null);
      setLoadingUsername(null);
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!result?.imageUrl) return;

    try {
      const response = await fetch(result.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `xpressionist-${result.username}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Downloaded!');
    } catch {
      toast.error('Download failed');
    }
  };

  const handleRoast = async () => {
    const normalizedHandle = handle.trim().replace('@', '');

    if (!normalizedHandle) {
      setInputError('Enter a username');
      return;
    }

    setIsRoasting(true);
    setInputError('');
    setGlobalError('');
    setRoast(null);
    setLoadingUsername(normalizedHandle);

    try {
      const response = await fetch('/api/roast-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: normalizedHandle }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate roast');
      if (!data?.roastLetter) throw new Error('Failed to generate roast letter');

      setRoast(data.roastLetter);
      toast.success('Roast ready!');
    } catch (err: unknown) {
      console.error('Roast error:', err);
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setGlobalError(message);
      toast.error(message);
    } finally {
      setLoadingUsername(null);
      setIsRoasting(false);
    }
  };

  const handleFbiProfile = async () => {
    const normalizedHandle = handle.trim().replace('@', '');

    if (!normalizedHandle) {
      setInputError('Enter a username');
      return;
    }

    setIsProfiling(true);
    setInputError('');
    setGlobalError('');
    setFbiProfile(null);
    setLoadingUsername(normalizedHandle);

    try {
      const response = await fetch('/api/fbi-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: normalizedHandle }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate profile');
      if (!data?.profileReport) throw new Error('Failed to generate profile');

      setFbiProfile(data.profileReport);
      toast.success('Profile ready!');
    } catch (err: unknown) {
      console.error('Profile error:', err);
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setGlobalError(message);
      toast.error(message);
    } finally {
      setLoadingUsername(null);
      setIsProfiling(false);
    }
  };

  const handleOsintProfile = async () => {
    const normalizedHandle = handle.trim().replace('@', '');

    if (!normalizedHandle) {
      setInputError('Enter a username');
      return;
    }

    setIsOsintProfiling(true);
    setInputError('');
    setGlobalError('');
    setOsintReport(null);
    setLoadingUsername(normalizedHandle);

    try {
      const response = await fetch('/api/osint-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: normalizedHandle, timeRange: '90' }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate OSINT report');
      if (!data?.osintReport) throw new Error('Failed to generate OSINT report');

      setOsintReport(data.osintReport);
      toast.success('OSINT dossier ready!');
    } catch (err: unknown) {
      console.error('OSINT error:', err);
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setGlobalError(message);
      toast.error(message);
    } finally {
      setLoadingUsername(null);
      setIsOsintProfiling(false);
    }
  };

  const handleCopyPrompt = async () => {
    if (!result?.imagePrompt) return;
    try {
      await navigator.clipboard.writeText(result.imagePrompt);
      setIsCopied(true);
      toast.success('Copied!');
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error('Copy failed');
    }
  };

  const isBusy = isLoading || isRoasting || isProfiling || isOsintProfiling;

  return (
    <SidebarProvider defaultOpen={false}>
      <PromptHistorySidebar history={history} onDelete={deleteFromHistory} onClearAll={clearHistory} />

      <div className="relative min-h-screen w-full flex-1 overflow-hidden">
        {/* Wrapped background */}
        <div className="wrapped-background fixed inset-0" />

        {/* History trigger */}
        <div className="fixed top-6 left-6 z-50">
          <SidebarTrigger className="p-3 bg-black/20 backdrop-blur-md rounded-xl border border-white/10 shadow-lg hover:bg-white/10 transition-all text-white">
            <History className="h-5 w-5" />
          </SidebarTrigger>
        </div>

        {/* Full-page loading overlay */}
        {isLoading && (
          <LoadingOverlay
            type="photo"
            stage={loadingStage || 'analyze'}
            username={loadingUsername || undefined}
          />
        )}
        {isRoasting && (
          <LoadingOverlay type="roast" username={loadingUsername || undefined} />
        )}
        {isProfiling && (
          <LoadingOverlay type="fbi" username={loadingUsername || undefined} />
        )}
        {isOsintProfiling && (
          <LoadingOverlay type="osint" username={loadingUsername || undefined} />
        )}

        <main className="relative z-10 min-h-screen px-6 lg:px-12 py-16 lg:py-24 flex flex-col justify-center">
          <div className="max-w-6xl mx-auto w-full space-y-24">

            {/* Hero Section - Asymmetrical */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              {/* Left: Title & Description */}
              <div className="space-y-8">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-amber-500">
                    <Flame className="w-3 h-3" />
                    Powered by Grok AI
                  </div>
                  <a
                    href="https://bags.fm/8F2FvujRh6zqoR4wtasocKgw4oPcu3MWK4MG77NwBAGS"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-emerald-500 hover:bg-white/10 transition-colors"
                  >
                    <DollarSign className="w-3 h-3" />
                    Funded by Grokify CA: 8F2Fvu...BAGs
                  </a>
                </div>

                <h1 className="text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter text-white leading-[0.9] flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="h-[0.8em] w-[0.8em] shrink-0 fill-white">
                    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                  </svg>
                  <span className="gradient-text">pressionist</span>
                </h1>
                <p className="text-xl text-neutral-400 max-w-md leading-relaxed font-light">
                  Turn any X timeline into bespoke AI artwork.<br />
                  No login. No API keys. Just a username.
                </p>

                {/* Support link */}
                <Dialog open={donateOpen} onOpenChange={setDonateOpen}>
                  <DialogTrigger asChild>
                    <button className="text-sm text-neutral-500 hover:text-white transition-colors flex items-center gap-2 group">
                      <Heart className="w-4 h-4 group-hover:text-rose-500 transition-colors" />
                      Support this project
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md bg-neutral-900 border-white/10 text-white">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-xl">
                        <Heart className="w-5 h-5 text-rose-500" />
                        Support X-pressionist
                      </DialogTitle>
                      <DialogDescription className="text-neutral-400">
                        Every donation goes straight to API costs. Thank you.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 pt-4">
                      <a href="https://buymeacoffee.com/applelampsg" target="_blank" rel="noopener noreferrer" className="block">
                        <Button className="w-full h-12 bg-[#FFDD00] text-black hover:bg-[#FFDD00]/90" onClick={() => setDonateOpen(false)}>
                          <Coffee className="w-5 h-5 mr-2" />
                          Buy Me a Coffee
                        </Button>
                      </a>
                      <a href="https://cash.app/$applelamps" target="_blank" rel="noopener noreferrer" className="block">
                        <Button variant="outline" className="w-full h-12 border-white/10 hover:bg-white/5 text-white" onClick={() => setDonateOpen(false)}>
                          <DollarSign className="w-5 h-5 mr-2" />
                          CashApp: $applelamps
                        </Button>
                      </a>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Right: Input Form - iPhone 16 Pro Style */}
              <div className="iphone-container relative mx-auto">
                {/* Ambient glow */}
                <div className="phone-glow" />

                {/* iPhone Frame */}
                <div className="iphone-frame">
                  {/* Side Buttons */}
                  <div className="action-button" />
                  <div className="volume-up" />
                  <div className="volume-down" />
                  <div className="power-button" />

                  {/* Screen */}
                  <div className="iphone-screen">
                    {/* Dynamic Island */}
                    <div className="dynamic-island" />

                    {/* Screen Content */}
                    <div className="iphone-screen-content justify-center">
                      {/* Inner glow */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-rose-500/20 rounded-full blur-[100px] pointer-events-none" />

                      <div className="space-y-5 relative">
                        <div className="text-center pb-1">
                          <h2 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-1.5">
                            <svg viewBox="0 0 24 24" className="h-[0.85em] w-[0.85em] shrink-0 fill-white">
                              <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                            </svg>
                            <span className="gradient-text">pressionist</span>
                          </h2>
                        </div>

                        <div className="space-y-3">
                          <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-base font-semibold group-focus-within:text-rose-400 transition-colors">@</span>
                            <input
                              type="text"
                              value={handle}
                              onChange={(e) => {
                                setHandle(e.target.value);
                                if (inputError) setInputError('');
                              }}
                              onKeyDown={(e) => e.key === 'Enter' && !isBusy && handleGenerate()}
                              disabled={isBusy}
                              placeholder="username"
                              className="w-full pl-9 pr-12 py-3.5 text-base bg-white/[0.08] border border-white/[0.12] rounded-2xl text-white placeholder:text-neutral-500 focus:outline-none focus:bg-white/[0.12] focus:border-rose-500/50 focus:shadow-[0_0_0_3px_rgba(244,63,94,0.15)] transition-all"
                              autoComplete="off"
                              spellCheck={false}
                            />
                            <button
                              onClick={handleGenerate}
                              disabled={isBusy || !handle}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/10 rounded-xl text-white hover:bg-white/20 disabled:opacity-0 transition-all"
                            >
                              <ChevronDown className="-rotate-90 w-4 h-4" />
                            </button>
                          </div>

                          {/* Style Selector */}
                          <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-neutral-400 pointer-events-none">
                              <Palette className="w-4 h-4" />
                            </div>
                            <select
                              value={selectedStyle}
                              onChange={(e) => setSelectedStyle(e.target.value)}
                              disabled={isBusy}
                              className="w-full pl-10 pr-10 py-3 text-sm bg-white/[0.08] border border-white/[0.12] rounded-2xl text-white appearance-none cursor-pointer focus:outline-none focus:bg-white/[0.12] focus:border-rose-500/50 transition-all"
                            >
                              {ART_STYLES.map((style) => (
                                <option key={style.id} value={style.id} className="bg-neutral-900 text-white">
                                  {style.emoji} {style.name}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                          </div>

                          <div className="space-y-2.5">
                            <button
                              onClick={handleGenerate}
                              disabled={isBusy}
                              className="w-full px-4 py-3 bg-gradient-to-r from-rose-500 to-orange-500 text-white font-semibold rounded-xl shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 text-sm flex items-center justify-center gap-2"
                            >
                              <Sparkles className="w-4 h-4" />
                              Generate Photo
                            </button>
                            <div className="grid grid-cols-3 gap-2">
                              <button
                                onClick={handleRoast}
                                disabled={isBusy}
                                className="px-3 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 text-xs flex items-center justify-center gap-1.5"
                              >
                                <Flame className="w-3.5 h-3.5" />
                                Roast
                              </button>
                              <button
                                onClick={handleFbiProfile}
                                disabled={isBusy}
                                className="px-3 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 text-xs flex items-center justify-center gap-1.5"
                              >
                                FBI
                              </button>
                              <button
                                onClick={handleOsintProfile}
                                disabled={isBusy}
                                className="px-3 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 text-xs flex items-center justify-center gap-1.5"
                              >
                                <Search className="w-3.5 h-3.5" />
                                OSINT
                              </button>
                            </div>
                          </div>
                        </div>

                        {inputError && (
                          <p className="text-sm text-red-500 text-center bg-red-500/10 py-2 rounded-lg">{inputError}</p>
                        )}

                        {/* Quick suggestions */}
                        <div className="flex flex-wrap justify-center gap-2 pt-3">
                          {SUGGESTION_HANDLES.map((s) => (
                            <button
                              key={s}
                              onClick={() => {
                                setHandle(s);
                                setInputError('');
                              }}
                              disabled={isBusy}
                              className="px-3 py-1.5 text-xs font-medium rounded-full bg-white/[0.06] border border-white/[0.08] text-neutral-300 hover:text-white hover:bg-white/[0.12] hover:border-white/[0.15] transition-all"
                            >
                              @{s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Home Indicator */}
                    <div className="home-indicator" />
                  </div>
                </div>

                {/* Floor shadow */}
                <div className="phone-shadow" />
              </div>
            </div>

            {/* Error */}
            {globalError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-center max-w-2xl mx-auto">
                {globalError}
              </div>
            )}

            {/* Results Section */}
            {result && (
              <div className="space-y-8 animate-fade-in" id="results">
                {/* Generated Image */}
                <div className="flex justify-center">
                  <div className="relative inline-block rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50 bg-[#0a0a0a]">
                    {isImageLoading && (
                      <div className="w-80 h-80 flex items-center justify-center bg-white/5">
                        <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
                      </div>
                    )}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={result.imageUrl}
                      alt={`Generated artwork for @${result.username}`}
                      className={`max-w-[90vw] md:max-w-2xl h-auto cursor-zoom-in ${isImageLoading ? 'hidden' : 'block'}`}
                      onClick={() => setIsLightboxOpen(true)}
                      onLoad={() => setIsImageLoading(false)}
                      onError={() => setIsImageLoading(false)}
                    />

                    {/* Floating actions */}
                    {!isImageLoading && (
                      <div className="absolute bottom-4 right-4 flex gap-2">
                        <button
                          onClick={() => setIsLightboxOpen(true)}
                          className="p-2 bg-black/50 backdrop-blur-md border border-white/10 rounded-lg text-white hover:bg-black/70 transition-colors shadow-lg"
                          title="View larger"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                        <ShareButton
                          imageUrl={result.imageUrl}
                          username={result.username}
                          className="bg-black/50 backdrop-blur-md border-white/10 hover:bg-black/70 shadow-lg text-sm py-2"
                          variant="secondary"
                        />
                        <button
                          onClick={handleDownload}
                          className="px-4 py-2 bg-black/50 backdrop-blur-md border border-white/10 rounded-lg text-sm font-medium text-white hover:bg-black/70 transition-colors shadow-lg flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lightbox Modal */}
                {isLightboxOpen && (
                  <div
                    className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setIsLightboxOpen(false)}
                  >
                    <button
                      onClick={() => setIsLightboxOpen(false)}
                      className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
                    >
                      <X className="w-6 h-6" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload();
                      }}
                      className="absolute top-4 right-16 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white text-sm font-medium transition-colors z-10 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={result.imageUrl}
                      alt={`Generated artwork for @${result.username}`}
                      className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl cursor-zoom-out"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsLightboxOpen(false);
                      }}
                    />
                  </div>
                )}

                {/* Collapsible prompt */}
                <div className="max-w-2xl mx-auto">
                  <button
                    onClick={() => setShowPrompt(!showPrompt)}
                    className="text-neutral-500 hover:text-white transition-colors text-sm flex items-center gap-2 mx-auto"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${showPrompt ? 'rotate-180' : ''}`} />
                    {showPrompt ? 'Hide' : 'View'} creative brief
                  </button>

                  {showPrompt && (
                    <div className="mt-4 p-6 bg-white/5 border border-white/10 rounded-xl text-sm text-neutral-300 relative">
                      <button
                        onClick={handleCopyPrompt}
                        className="absolute top-3 right-3 text-neutral-500 hover:text-white"
                      >
                        {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <p className="pr-8 whitespace-pre-wrap font-mono text-xs leading-relaxed">{result.imagePrompt}</p>
                    </div>
                  )}
                </div>

                {/* Generate another */}
                <div className="text-center">
                  <button
                    onClick={() => {
                      setResult(null);
                      setHandle('');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-neutral-500 hover:text-white transition-colors text-sm"
                  >
                    Generate another →
                  </button>
                </div>
              </div>
            )}

            {/* Roast Section - Unique styling */}
            {roast && (
              <div className="max-w-2xl mx-auto bg-[#1a1a1a] border border-amber-500/20 rounded-2xl p-6 lg:p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-600"></div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 text-amber-500 font-semibold">
                    <Flame className="w-5 h-5" />
                    Therapy Session Notes
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(roast);
                        setIsRoastCopied(true);
                        toast.success('Copied!');
                        setTimeout(() => setIsRoastCopied(false), 2000);
                      } catch {
                        toast.error('Copy failed');
                      }
                    }}
                    className="text-neutral-500 hover:text-white"
                  >
                    {isRoastCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="font-serif text-lg leading-relaxed text-neutral-300 whitespace-pre-wrap">
                  {roast}
                </div>
              </div>
            )}

            {/* FBI Profile Section - Official classified document styling */}
            {fbiProfile && (
              <div className="max-w-4xl mx-auto select-text">
                {/* Document container with realistic paper effect */}
                <div className="relative bg-[#0c0c0c] border border-red-900/40 shadow-2xl shadow-red-900/20 overflow-hidden">
                  {/* Top classified bar */}
                  <div className="bg-gradient-to-r from-red-950/50 via-red-900/30 to-red-950/50 border-b border-red-800/40 px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-red-500 font-bold tracking-[0.25em] text-sm">CLASSIFIED</span>
                      <span className="text-red-400/50 text-xs tracking-wider font-mono">// LAW ENFORCEMENT SENSITIVE</span>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(fbiProfile);
                          setIsProfileCopied(true);
                          toast.success('Copied to clipboard!');
                          setTimeout(() => setIsProfileCopied(false), 2000);
                        } catch (err) {
                          console.error('Copy failed:', err);
                          toast.error('Copy failed - try selecting manually');
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded transition-all"
                    >
                      {isProfileCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      <span>{isProfileCopied ? 'Copied!' : 'Copy Report'}</span>
                    </button>
                  </div>

                  {/* Document content */}
                  <div className="p-8 lg:p-12 relative">
                    {/* FBI seal watermark - positioned bottom right */}
                    <div className="absolute bottom-24 right-8 opacity-[0.04] pointer-events-none select-none">
                      <svg viewBox="0 0 100 100" className="w-28 h-28 text-white">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" />
                        <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="1" />
                        <text x="50" y="35" textAnchor="middle" fontSize="6" fill="currentColor" fontWeight="bold">FEDERAL BUREAU</text>
                        <text x="50" y="55" textAnchor="middle" fontSize="8" fill="currentColor" fontWeight="bold">FBI</text>
                        <text x="50" y="70" textAnchor="middle" fontSize="6" fill="currentColor" fontWeight="bold">OF INVESTIGATION</text>
                      </svg>
                    </div>

                    {/* Report content with proper formatting */}
                    <div className="text-[13px] leading-[1.9] whitespace-pre-wrap font-mono text-neutral-300 select-text cursor-text [&>*]:select-text">
                      {fbiProfile}
                    </div>

                    {/* Document footer */}
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

                  {/* Bottom classified bar */}
                  <div className="bg-gradient-to-r from-red-950/50 via-red-900/30 to-red-950/50 border-t border-red-800/40 px-6 py-2 text-center">
                    <span className="text-red-500/60 font-bold tracking-[0.3em] text-[11px]">SECRET // NOFORN // ORCON</span>
                  </div>
                </div>
              </div>
            )}

            {/* OSINT Dossier Section - Intelligence analyst styling */}
            {osintReport && (
              <div className="max-w-4xl mx-auto select-text">
                {/* Document container with intelligence agency aesthetic */}
                <div className="relative bg-[#0a0d0f] border border-emerald-900/40 shadow-2xl shadow-emerald-900/20 overflow-hidden">
                  {/* Top classification bar */}
                  <div className="bg-gradient-to-r from-emerald-950/50 via-emerald-900/30 to-emerald-950/50 border-b border-emerald-800/40 px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-emerald-400 font-bold tracking-[0.25em] text-sm">INTERNAL CLASSIFICATION</span>
                      <span className="text-emerald-400/50 text-xs tracking-wider font-mono">// OSINT DOSSIER</span>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(osintReport);
                          setIsOsintCopied(true);
                          toast.success('Copied to clipboard!');
                          setTimeout(() => setIsOsintCopied(false), 2000);
                        } catch (err) {
                          console.error('Copy failed:', err);
                          toast.error('Copy failed - try selecting manually');
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded transition-all"
                    >
                      {isOsintCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      <span>{isOsintCopied ? 'Copied!' : 'Copy Dossier'}</span>
                    </button>
                  </div>

                  {/* Document content */}
                  <div className="p-8 lg:p-12 relative">
                    {/* Watermark */}
                    <div className="absolute bottom-24 right-8 opacity-[0.03] pointer-events-none select-none">
                      <div className="text-emerald-500 font-bold tracking-[0.3em] text-6xl rotate-[-15deg]">
                        OSINT
                      </div>
                    </div>

                    {/* Report content with proper formatting */}
                    <div className="text-[13px] leading-[1.9] whitespace-pre-wrap font-mono text-neutral-300 select-text cursor-text [&>*]:select-text">
                      {osintReport}
                    </div>

                    {/* Document footer */}
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

                  {/* Bottom bar */}
                  <div className="bg-gradient-to-r from-emerald-950/50 via-emerald-900/30 to-emerald-950/50 border-t border-emerald-800/40 px-6 py-2 text-center">
                    <span className="text-emerald-500/60 font-bold tracking-[0.3em] text-[11px]">USER CLASSIFICATION DOSSIER</span>
                  </div>
                </div>
              </div>
            )}

            {/* Minimal Footer */}
            <footer className="text-center text-sm text-neutral-600 pt-12 pb-6">
              Built by{' '}
              <a
                href="https://x.com/lamps_apple"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                @lamps_apple
              </a>
              {' · '}
              Powered by Grok & Gemini
            </footer>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
