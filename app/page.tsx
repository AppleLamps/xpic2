import HomeClient from '@/components/home/HomeClient';

export default function Page() {
  return (
    <div className="relative min-h-screen w-full flex-1 overflow-hidden">
      <div className="wrapped-background fixed inset-0" />

      <HomeClient />

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
  );
}
