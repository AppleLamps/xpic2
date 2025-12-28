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
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { PromptHistorySidebar } from '@/components/PromptHistorySidebar';
import { usePromptHistory } from '@/hooks/usePromptHistory';

const SUGGESTION_HANDLES = ['levelsio', 'pmarca', 'ai__memes'];

export default function Home() {
  const [handle, setHandle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRoasting, setIsRoasting] = useState(false);
  const [isProfiling, setIsProfiling] = useState(false);
  const [inputError, setInputError] = useState('');
  const [globalError, setGlobalError] = useState('');
  const [loadingStage, setLoadingStage] = useState<'analyze' | 'image' | null>(null);
  const [result, setResult] = useState<{ imagePrompt: string; imageUrl: string; username: string } | null>(null);
  const [roast, setRoast] = useState<string | null>(null);
  const [fbiProfile, setFbiProfile] = useState<string | null>(null);
  const [donateOpen, setDonateOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isRoastCopied, setIsRoastCopied] = useState(false);
  const [isProfileCopied, setIsProfileCopied] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
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
    setLoadingStage('analyze');

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
      setIsProfiling(false);
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

  const isBusy = isLoading || isRoasting || isProfiling;

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
        {(isLoading || isRoasting || isProfiling) && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 border-4 border-white/20 border-t-[#ff4d4d] rounded-full animate-spin mx-auto" />
              <div>
                <p className="text-2xl font-semibold text-white">
                  {isLoading && loadingStage === 'analyze' && 'Reading the vibes...'}
                  {isLoading && loadingStage === 'image' && 'Painting your portrait...'}
                  {isRoasting && 'Crafting your roast...'}
                  {isProfiling && 'Analyzing behavior patterns...'}
                </p>
                <p className="text-neutral-400 mt-2">This takes about 10 seconds</p>
              </div>
            </div>
          </div>
        )}

        <main className="relative z-10 min-h-screen px-6 lg:px-12 py-16 lg:py-24 flex flex-col justify-center">
          <div className="max-w-6xl mx-auto w-full space-y-24">

            {/* Hero Section - Asymmetrical */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              {/* Left: Title & Description */}
              <div className="space-y-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-amber-500 mb-4">
                  <Flame className="w-3 h-3" />
                  Powered by Grok AI
                </div>

                <h1 className="text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter text-white leading-[0.9] flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="h-[0.8em] w-[0.8em] fill-white">
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

              {/* Right: Input Form - Phone Style */}
              <div className="relative mx-auto w-full max-w-[400px]">
                {/* Phone Frame */}
                <div className="relative bg-[#0a0a0a] rounded-[3rem] border-[8px] border-[#1a1a1a] shadow-2xl overflow-hidden h-[600px] flex flex-col">
                  {/* Dynamic Island */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 h-7 w-32 bg-black rounded-b-2xl z-20"></div>

                  {/* Screen Content */}
                  <div className="flex-1 p-6 flex flex-col justify-center relative z-10">
                    {/* Glow effect inside phone */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-rose-500/20 rounded-full blur-[100px] pointer-events-none"></div>

                    <div className="space-y-6 relative">
                      <div className="text-center">
                        <h2 className="text-2xl font-black tracking-tighter text-white flex items-center justify-center gap-1">
                          <svg viewBox="0 0 24 24" className="h-[0.8em] w-[0.8em] fill-white">
                            <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                          </svg>
                          <span className="gradient-text">pressionist</span>
                        </h2>
                      </div>

                      <div className="space-y-3">
                        <div className="relative group">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 text-lg font-medium group-focus-within:text-rose-500 transition-colors">@</span>
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
                            className="w-full pl-10 pr-12 py-4 text-lg bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 transition-all"
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

                        <div className="space-y-2">
                          <button
                            onClick={handleGenerate}
                            disabled={isBusy}
                            className="w-full px-4 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 font-medium rounded-xl hover:bg-rose-500/20 transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                          >
                            <Sparkles className="w-4 h-4" />
                            Generate Photo
                          </button>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={handleRoast}
                              disabled={isBusy}
                              className="px-4 py-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 font-medium rounded-xl hover:bg-amber-500/20 transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                            >
                              <Flame className="w-4 h-4" />
                              Roast
                            </button>
                            <button
                              onClick={handleFbiProfile}
                              disabled={isBusy}
                              className="px-4 py-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium rounded-xl hover:bg-blue-500/20 transition-colors disabled:opacity-50 text-sm"
                            >
                              FBI Profile
                            </button>
                          </div>
                        </div>
                      </div>

                      {inputError && (
                        <p className="text-sm text-red-500 text-center bg-red-500/10 py-2 rounded-lg">{inputError}</p>
                      )}

                      {/* Quick suggestions */}
                      <div className="flex flex-wrap justify-center gap-2 text-xs pt-4">
                        {SUGGESTION_HANDLES.map((s) => (
                          <button
                            key={s}
                            onClick={() => {
                              setHandle(s);
                              setInputError('');
                            }}
                            disabled={isBusy}
                            className="px-3 py-1.5 rounded-full bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            @{s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Phone Bottom Bar */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full"></div>
                </div>
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
                <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50 bg-[#0a0a0a]">
                  {isImageLoading && (
                    <div className="aspect-square max-w-2xl mx-auto flex items-center justify-center bg-white/5">
                      <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
                    </div>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={result.imageUrl}
                    alt={`Generated artwork for @${result.username}`}
                    className={`w-full max-w-2xl mx-auto ${isImageLoading ? 'hidden' : 'block'}`}
                    onLoad={() => setIsImageLoading(false)}
                    onError={() => setIsImageLoading(false)}
                  />

                  {/* Floating actions */}
                  {!isImageLoading && (
                    <div className="absolute bottom-4 right-4 flex gap-2">
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

            {/* FBI Profile Section - Official document styling */}
            {fbiProfile && (
              <div className="max-w-3xl mx-auto bg-[#0a0a0a] border border-white/10 text-neutral-100 rounded-none p-8 lg:p-12 shadow-2xl relative">
                <div className="absolute top-4 right-4 opacity-20">
                  <div className="w-24 h-24 border-4 border-white rounded-full flex items-center justify-center transform -rotate-12">
                    <span className="text-xs font-bold">TOP SECRET</span>
                  </div>
                </div>
                <div className="border-b border-white/10 pb-4 mb-6 flex items-center justify-between">
                  <div>
                    <span className="text-red-500 font-bold tracking-wider">CLASSIFIED</span>
                    <span className="text-neutral-500 ml-4 text-sm">BEHAVIORAL ANALYSIS UNIT</span>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(fbiProfile);
                        setIsProfileCopied(true);
                        toast.success('Copied!');
                        setTimeout(() => setIsProfileCopied(false), 2000);
                      } catch {
                        toast.error('Copy failed');
                      }
                    }}
                    className="text-neutral-500 hover:text-white"
                  >
                    {isProfileCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap font-mono text-neutral-400">
                  {fbiProfile}
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
