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
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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

      <div className="relative min-h-screen w-full flex-1">
        {/* Subtle background */}
        <div className="aurora-background fixed inset-0" />

        {/* History trigger */}
        <div className="fixed top-6 left-6 z-50">
          <SidebarTrigger className="p-3 bg-white rounded-xl border border-black/10 shadow-lg hover:shadow-xl transition-shadow">
            <History className="h-5 w-5 text-black" />
          </SidebarTrigger>
        </div>

        {/* Full-page loading overlay */}
        {(isLoading || isRoasting || isProfiling) && (
          <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto" />
              <div>
                <p className="text-2xl font-semibold text-black">
                  {isLoading && loadingStage === 'analyze' && 'Reading the vibes...'}
                  {isLoading && loadingStage === 'image' && 'Painting your portrait...'}
                  {isRoasting && 'Crafting your roast...'}
                  {isProfiling && 'Analyzing behavior patterns...'}
                </p>
                <p className="text-neutral-500 mt-2">This takes about 10 seconds</p>
              </div>
            </div>
          </div>
        )}

        <main className="relative z-10 min-h-screen px-6 lg:px-12 py-16 lg:py-24">
          <div className="max-w-6xl mx-auto space-y-24">

            {/* Hero Section - Asymmetrical */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center min-h-[60vh]">
              {/* Left: Title & Description */}
              <div className="space-y-6">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-black leading-none">
                  X-pressionist
                </h1>
                <p className="text-xl text-neutral-600 max-w-md leading-relaxed">
                  Turn any X timeline into bespoke AI artwork.<br />
                  No login. No API keys. Just a username.
                </p>

                {/* Support link */}
                <Dialog open={donateOpen} onOpenChange={setDonateOpen}>
                  <DialogTrigger asChild>
                    <button className="text-sm text-neutral-400 hover:text-black transition-colors flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      Support this project
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-xl">
                        <Heart className="w-5 h-5 text-rose-500" />
                        Support X-pressionist
                      </DialogTitle>
                      <DialogDescription>
                        Every donation goes straight to API costs. Thank you.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 pt-4">
                      <a href="https://buymeacoffee.com/applelampsg" target="_blank" rel="noopener noreferrer" className="block">
                        <Button className="w-full h-12" onClick={() => setDonateOpen(false)}>
                          <Coffee className="w-5 h-5 mr-2" />
                          Buy Me a Coffee
                        </Button>
                      </a>
                      <a href="https://cash.app/$applelamps" target="_blank" rel="noopener noreferrer" className="block">
                        <Button variant="outline" className="w-full h-12" onClick={() => setDonateOpen(false)}>
                          <DollarSign className="w-5 h-5 mr-2" />
                          CashApp: $applelamps
                        </Button>
                      </a>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Right: Input Form */}
              <div className="bg-white rounded-2xl border border-black/10 p-6 lg:p-8 shadow-2xl shadow-black/5">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-lg font-medium">@</span>
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
                        className="w-full pl-10 pr-4 py-4 text-lg bg-neutral-50 border border-black/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 transition-shadow"
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          disabled={isBusy}
                          className="px-6 py-4 bg-black text-white font-semibold rounded-xl hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          Generate
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={handleGenerate} disabled={isBusy}>
                          Create artwork
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleRoast} disabled={isBusy}>
                          Roast letter
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleFbiProfile} disabled={isBusy}>
                          FBI profile
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {inputError && (
                    <p className="text-sm text-red-500">{inputError}</p>
                  )}

                  {/* Quick suggestions */}
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-neutral-400">Try:</span>
                    {SUGGESTION_HANDLES.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setHandle(s);
                          setInputError('');
                        }}
                        disabled={isBusy}
                        className="text-black hover:underline disabled:opacity-50"
                      >
                        @{s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Error */}
            {globalError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
                {globalError}
              </div>
            )}

            {/* Results Section */}
            {result && (
              <div className="space-y-8" id="results">
                {/* Generated Image */}
                <div className="relative rounded-2xl overflow-hidden border border-black/10 shadow-2xl shadow-black/10 bg-white">
                  {isImageLoading && (
                    <div className="aspect-square max-w-2xl mx-auto flex items-center justify-center bg-neutral-50">
                      <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
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
                        className="px-4 py-2 bg-white/90 backdrop-blur-sm rounded-lg text-sm font-medium hover:bg-white transition-colors shadow-lg flex items-center gap-2"
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
                    className="text-neutral-500 hover:text-black transition-colors text-sm flex items-center gap-2"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${showPrompt ? 'rotate-180' : ''}`} />
                    {showPrompt ? 'Hide' : 'View'} creative brief
                  </button>

                  {showPrompt && (
                    <div className="mt-4 p-4 bg-neutral-50 rounded-xl text-sm text-neutral-700 relative">
                      <button
                        onClick={handleCopyPrompt}
                        className="absolute top-3 right-3 text-neutral-400 hover:text-black"
                      >
                        {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <p className="pr-8 whitespace-pre-wrap">{result.imagePrompt}</p>
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
                    className="text-neutral-500 hover:text-black transition-colors text-sm"
                  >
                    Generate another →
                  </button>
                </div>
              </div>
            )}

            {/* Roast Section - Unique styling */}
            {roast && (
              <div className="max-w-2xl mx-auto bg-amber-50 border-2 border-dashed border-amber-200 rounded-2xl p-6 lg:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 text-amber-700 font-semibold">
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
                    className="text-amber-600 hover:text-amber-800"
                  >
                    {isRoastCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="font-serif text-lg leading-relaxed text-amber-900 whitespace-pre-wrap">
                  {roast}
                </div>
              </div>
            )}

            {/* FBI Profile Section - Official document styling */}
            {fbiProfile && (
              <div className="max-w-3xl mx-auto bg-neutral-900 text-neutral-100 rounded-none p-8 lg:p-12 shadow-2xl">
                <div className="border-b border-neutral-700 pb-4 mb-6 flex items-center justify-between">
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
                    className="text-neutral-400 hover:text-white"
                  >
                    {isProfileCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap font-mono text-neutral-300">
                  {fbiProfile}
                </div>
              </div>
            )}

            {/* Minimal Footer */}
            <footer className="text-center text-sm text-neutral-400 pt-12">
              Built by{' '}
              <a
                href="https://x.com/lamps_apple"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-black transition-colors"
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
