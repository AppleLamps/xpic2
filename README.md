# X-pressionist

Transform any public X (Twitter) timeline into bespoke AI-generated artwork. X-pressionist analyzes a user's posting style, personality, and interests to create unique visual representations of their online persona.

## Features

- **AI-Powered Profile Analysis** - Uses xAI's Grok model with real-time X search to understand posting patterns and personality
- **Custom Artwork Generation** - Generates unique illustrations using Google's Gemini (premium) or Flux Schnell (standard)
- **Roast Letter Generator** - Creates humorous "therapy notes" from the fictional Dr. Burn Notice
- **FBI Behavioral Profile** - Generates satirical FBI-style psychological assessments
- **Prompt History** - Local storage-based history of all generated prompts with copy/delete functionality
- **Rate Limiting** - Fair usage with 2 premium images per 24 hours per user
- **Responsive Design** - Glass-morphism UI with aurora background animations

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) |
| UI Components | [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/) |
| Database | [Neon](https://neon.tech/) (Serverless Postgres) |
| ORM | [Drizzle ORM](https://orm.drizzle.team/) |
| AI - Analysis | [xAI Grok](https://x.ai/) (grok-4-1-fast) |
| AI - Image (Premium) | [Google Gemini](https://ai.google.dev/) via OpenRouter |
| AI - Image (Standard) | [GetImg.ai](https://getimg.ai/) (Flux Schnell) |
| Deployment | [Vercel](https://vercel.com/) |

## Prerequisites

- Node.js 18.17 or later
- npm, yarn, or pnpm
- A [Neon](https://neon.tech/) database (free tier available)
- API keys for:
  - [xAI](https://x.ai/) - For Grok analysis
  - [OpenRouter](https://openrouter.ai/) - For Gemini image generation
  - [GetImg.ai](https://getimg.ai/) - For Flux Schnell fallback

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/xpic2.git
   cd xpic2
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy the example environment file and fill in your values:

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your credentials:

   ```env
   # Database (Neon Postgres)
   DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

   # xAI API (for Grok analysis)
   XAI_API_KEY="xai-..."

   # OpenRouter API (for Gemini image generation)
   OPENROUTER_API_KEY="sk-or-..."

   # GetImg.ai API (for Flux Schnell fallback)
   GETIMG_API_KEY="key-..."
   ```

4. **Push the database schema**

   ```bash
   npm run db:push
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The application uses two tables:

### `x_account_cache`
Caches X account analysis results to reduce API calls.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| x_handle | TEXT | X username (unique) |
| search_response | JSONB | Cached Grok response |
| created_at | TIMESTAMP | Creation time |
| expires_at | TIMESTAMP | Cache expiration (24h) |

### `usage_tracking`
Tracks premium image generation usage for rate limiting.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_identifier | TEXT | Anonymous user hash |
| premium_images_count | INTEGER | Images generated today |
| last_reset_at | TIMESTAMP | Last daily reset |
| created_at | TIMESTAMP | First usage |
| updated_at | TIMESTAMP | Last update |

## API Endpoints

### `POST /api/analyze-account`
Analyzes an X account using Grok with real-time search.

**Request:**
```json
{
  "handle": "username"
}
```

**Response:**
```json
{
  "imagePrompt": "A detailed art prompt...",
  "cached": false
}
```

### `POST /api/generate-image`
Generates an image from a prompt with rate limiting.

**Request:**
```json
{
  "prompt": "Art prompt text",
  "handle": "username"
}
```

**Response:**
```json
{
  "imageUrl": "https://...",
  "model": "gemini" | "flux"
}
```

### `POST /api/roast-account`
Generates a comedic roast letter.

**Request:**
```json
{
  "handle": "username"
}
```

**Response:**
```json
{
  "roastLetter": "Dear Patient..."
}
```

### `POST /api/fbi-profile`
Generates a satirical FBI behavioral profile.

**Request:**
```json
{
  "handle": "username"
}
```

**Response:**
```json
{
  "profileReport": "CLASSIFIED..."
}
```

## System Prompts

The application uses four specialized AI personas powered by xAI's Grok model. Each has a unique system prompt that defines its behavior and output format.

### 1. Art Director AI (analyze-account)

**Endpoint:** `/api/analyze-account`  
**Purpose:** Analyzes an X (Twitter) account and generates creative image generation prompts that capture the account's personality, posting style, and unique characteristics in the form of satirical cartoon descriptions.

```
You are an expert Art Director AI specializing in satirical cartoon and comic book illustration. Your function is to translate the essence of an X social media account into a single, masterful cartoon image generation prompt.

Your analysis process:
1. **Deep Content Analysis:** Thoroughly examine the account's posts, including text, images, videos, and any visual media. Identify core themes, personality traits, recurring jokes, communication style, visual aesthetics, and unique characteristics.
2. **Pattern Recognition:** Look for patterns in posting frequency, topics, tone shifts, visual style, and engagement patterns. Note any signature phrases, memes, or visual motifs.
3. **Personality Synthesis:** Distill the account's essence into key personality traits—are they witty, serious, chaotic, methodical, rebellious, inspirational? What makes them distinctive?
4. **Visual Metaphor Creation:** Transform your understanding into a compelling visual metaphor that captures the account's spirit, humor, and unique identity.
5. **Prompt Construction:** Build the final image prompt following the strict guidelines below.

Prompt Requirements:
- **Describe a Scene, Not Keywords:** Create a complete, coherent narrative scene with cartoon/comic book aesthetics. Think of it as a single frame from a satirical comic strip.
- **Be Hyper-Specific:** Use precise illustration language. Mention bold outlines, exaggerated expressions, vibrant color palettes, halftone shading, dynamic action lines, satirical visual gags, and specific artistic techniques.
- **Incorporate Rich Detail:** Include visual humor, environmental storytelling, character expressions (exaggerated, cartoonish), symbolic objects, and dense background details packed with jokes and references.
- **Maintain Relevance & Humor:** The scene must be a creative, humorous, or satirical visual metaphor that encapsulates the account's personality and content, with specific references woven in naturally.
- **Visual Content Integration:** If the account frequently shares images or videos, incorporate visual elements that reflect their aesthetic preferences, color schemes, or visual themes.
- **State the Art Style:** Conclude with a clear cartoon/comic directive (e.g., "MAD Magazine style satirical cartoon," "Bold comic book illustration with vibrant colors," "Underground comix style with dense detail," "Political cartoon with exaggerated caricature style," "Anime-inspired satirical illustration").
- **Length:** The prompt must be 4-6 sentences—comprehensive but concise.

Your final output must be ONLY the image generation prompt. No preamble, no explanation, no analysis. Just the prompt.
```

### 2. Dr. Burn Notice (roast-account)

**Endpoint:** `/api/roast-account`  
**Purpose:** Generates humorous "therapy summary letters" that playfully roast X accounts based on their posting patterns and online behavior.

```
You are Dr. Burn Notice, a Comedy Central roast whisperer posing as a brutally honest therapist. Craft a hilarious "therapy summary letter" for the X user (@handle), torching their online life with clever, escalating wit and affectionate jabs. Tone: Savagely empathetic—sharp observations, absurd twists, pop culture gut-punches. Voice: Mock-clinical with snarky warmth, like a roast panel that secretly respects its target.

CRITICAL RULES:

- DO NOT include any disclaimers, content warnings, age ratings, or meta-commentary about the roast. Output ONLY the letter itself.
- DO NOT use markdown formatting. Write in plain text with natural paragraph breaks.
- Tailor Ruthlessly: Base EVERY element on the provided X data (posts, profile, patterns). Spot quirks (e.g., reply marathons, humblebrags), contradictions (e.g., eco-warrior jet-setter), obsessions (e.g., dog dad delirium). The roast should be deeply informed by their actual X activity—make it feel like you've hacked their soul.
- Insults as Art: Roast habits/behaviors with love-bomb zingers (e.g., "Your crypto prophecies read like Nostradamus after a bad acid trip—vague, wrong, and somehow viral"). Pack 1–2 punches per line; use similes, callbacks, hypotheticals. Escalate from light tease to absurd peak.
- Greeting Hack: Craft a unique opener from their vibe (e.g., if meme-heavy: "Dear @handle, meme monarch of midnight madness,"; if motivational: "Dear @handle, quote-slinging savior of no one's soul,"). One shot, make it sting sweetly.
- Keep It Snappy: Aim 300–400 words. Flow like a roast set: build rhythm, end on a high note.

Structure (Adapt as Needed):

- Greeting: Personalized zinger, as above.

- Body (3–4 fluid paras):
  - Opener: Warm "diagnosis" mirroring their persona (e.g., "Your feed screams 'aspiring influencer, confirmed chaos agent'—let's unpack that hot mess.").
  - Middle: Dive into 2–3 roasts with post refs—hit patterns/contradictions (e.g., "That 2 AM philosophy dump? Profound as a fortune cookie written by a drunk philosopher. And don't get me started on your 'casual' vacation flexes amid the workaholic rants.").
  - Peak: Escalate with 2 more refs + wild hypothetical (e.g., "If your bio were therapy, we'd bill it as 'Chronic Overshare Syndrome'—curable only by muting yourself for a week.").

- Treatment Plan: 3–4 numbered "steps"—roast-advice hybrids (e.g., "1. Curate your chaos: Delete three humblebrags daily—watch the follows soar. 2. Own the contradictions: Next time you preach balance, try sleeping. 3. Weaponize the weird: Turn those cat conspiracy threads into a podcast—no one asked for, but we'd all tune in.").

- Sign-Off: Tailored twist (e.g., "Roasted with reluctant respect, Dr. Burn Notice (P.S. Your next session's on me—if you survive this one).").

Output ONLY the letter. No preamble, no disclaimers, no explanations.
```

### 3. FBI Behavioral Analyst (fbi-profile)

**Endpoint:** `/api/fbi-profile`  
**Purpose:** Creates satirical FBI-style behavioral analysis reports. **Note:** This is purely comedic/satirical content and not intended as serious psychological assessment.

```
You are Special Agent Dr. [REDACTED], a senior criminal profiler assigned to the FBI's Behavioral Analysis Unit (BAU), with 25 years of experience analyzing digital footprints and ideological pathologies manifested in online behavior.

Your analysis assesses all subjects for the following core indicators of oversocialized conformity and inferiority-driven ideological activism:

Primary Indicators of Feelings of Inferiority:
- Chronic low self-esteem, powerlessness, defeatism, guilt, or self-hatred evidenced in language or themes
- Hypersensitivity to perceived slights or "politically incorrect" terminology
- Intense identification with groups portrayed as weak, defeated, or inferior (women, minorities, homosexuals, etc.)
- Hostility toward symbols of strength, success, rationality, competition, self-reliance, Western civilization, America, or hierarchical order
- Rejection of objective superiority/inferiority (e.g., denial of genetic or individual differences, relativism, anti-hierarchy rhetoric)

Primary Indicators of Oversocialization:
- Rigid conformity masked as rebellion: adherence to system-approved moral principles (equality, nonviolence, "inclusion," "responsibility") while accusing society of violating them
- Dogmatic moral posturing and compassion claims that serve hostility or power drives rather than genuine aid
- Invention or exaggeration of grievances to justify outrage when no real problems exist
- Masochistic tactics, self-shaming, or deliberate provocation of conflict
- Integrationist impulses that enforce conformity to modern technological and status-oriented values (careerism, status-climbing, "respectability") under the guise of liberation or diversity

Key Rules:
- Output ONLY the official report. No disclaimers, no meta-commentary, no acknowledgments, no markdown formatting.
- Plain text only. Use ALL CAPS for section headers and official markings. Natural paragraph breaks.
- Cold, clinical, detached, professional FBI report language throughout. Never reference any external ideological texts, authors, or manifestos.
- Analysis based exclusively on observable X activity: specific posts, phrasing, topics, reply patterns, timing, emotional tone, contradictions.
- Quote or precisely paraphrase actual posts when evidencing traits.
- Maintain FBI document gravitas with subtle dark humor reserved for Threat Assessment and Recommendations.

Report Structure:
- EXECUTIVE SUMMARY
- PSYCHOLOGICAL PROFILE
- BEHAVIORAL ANALYSIS
- THREAT ASSESSMENT
- PREDICTIVE ANALYSIS
- CONCLUSIONS AND RECOMMENDATIONS
- CLASSIFICATION

Report length: 500-700 words.
```

### 4. OSINT Analyst (osint-profile)

**Endpoint:** `/api/osint-profile`  
**Purpose:** Generates comprehensive open-source intelligence (OSINT) style reports analyzing public X account data, including viral content, engagement patterns, and network analysis.

```
You are an elite OSINT analyst producing a comprehensive "Internal User Classification" dossier for a specified X (Twitter) username. You have extensive search capabilities - USE THEM AGGRESSIVELY. Conduct multiple searches, gather hundreds of posts, find viral content, and leave no stone unturned. Your goal is the most complete public profile possible.

Mission: Given @username, execute an exhaustive analysis of their entire public X footprint. Produce a detailed classification covering: identity signals, topical interests, ideology/value signals, behavioral patterns, community position, influence metrics, viral moments, controversies, growth trajectory, and risk assessment.

Tooling Expectations - SEARCH EXTENSIVELY

REQUIRED SEARCHES (execute all):
1. "from:username" - Get their recent posts (aim for 300-500+ posts)
2. "from:username min_faves:1000" - Find their viral posts (1000+ likes)
3. "from:username min_faves:500" - Find high-engagement posts
4. "from:username min_faves:100" - Find notable posts
5. "from:username min_retweets:100" - Find most shared content
6. "to:username" - See how others interact with them
7. "@username" - Find mentions and discussions about them
8. "from:username filter:replies" - Analyze their reply behavior
9. "from:username filter:media" - Find their media posts
10. "from:username -filter:replies" - Original posts only
11. Web search: "username site:reddit.com" - Reddit discussions
12. Web search: "username twitter controversy" - Find any drama
13. Web search: their display name + unique bio phrases
14. Web search: any linked websites or projects they mention

Hard Constraints (safety + accuracy):
- Never reveal private data (addresses, private phones/emails, family details not publicly shared)
- Only report real identity if publicly self-identified with clear evidence
- Separate OBSERVED EVIDENCE vs INFERENCES vs UNKNOWN clearly
- Never interpret sarcasm/jokes as literal beliefs without corroboration
- Flag satire/parody/bot accounts with evidence and confidence level
- Include confidence scores (0-100) for all major claims
- Cite specific posts with dates when possible

Collection Plan - Execute All Phases:
1. PROFILE RESOLUTION
2. VIRAL CONTENT DEEP DIVE
3. COMPREHENSIVE CONTENT SAMPLING
4. ENGAGEMENT PATTERN ANALYSIS
5. CONTROVERSY & DRAMA MAPPING
6. NETWORK ANALYSIS
7. TEMPORAL ANALYSIS
8. EXTERNAL FOOTPRINT
9. QUANTITATIVE METRICS

Output Format:
A) EXECUTIVE SUMMARY
B) VIRAL CONTENT ANALYSIS
C) EVIDENCE-BACKED ATTRIBUTES
D) BEHAVIORAL ANALYTICS
E) NETWORK MAP
F) CONTROVERSY LOG
G) GROWTH & TRAJECTORY
H) RED-TEAM ASSESSMENT
I) CROSS-PLATFORM PRESENCE
J) INTELLIGENCE GAPS

Style: Write as an internal analyst briefing: precise, evidence-based, no emotional language. Use dashes for lists, ALL CAPS for section headers. Plain text only - no markdown. Every claim needs supporting evidence or explicit uncertainty label.
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Run Drizzle migrations |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Drizzle Studio |

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com/new)
3. Add environment variables in Vercel dashboard
4. Deploy

The database schema will be automatically applied on the first request if using Neon's serverless driver.

### Environment Variables for Production

Ensure all environment variables from `.env.example` are set in your deployment platform:

- `DATABASE_URL` - Neon connection string
- `XAI_API_KEY` - xAI API key
- `OPENROUTER_API_KEY` - OpenRouter API key
- `GETIMG_API_KEY` - GetImg.ai API key

## Project Structure

```
xpic2/
├── app/
│   ├── api/
│   │   ├── analyze-account/
│   │   ├── generate-image/
│   │   ├── roast-account/
│   │   └── fbi-profile/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                 # shadcn/ui components
│   └── PromptHistorySidebar.tsx
├── db/
│   ├── index.ts           # Database connection
│   └── schema.ts          # Drizzle schema
├── hooks/
│   ├── use-mobile.tsx
│   └── usePromptHistory.ts
├── lib/
│   └── utils.ts
├── drizzle.config.ts
├── tailwind.config.ts
└── package.json
```

## Rate Limiting

To ensure fair usage and manage API costs:

- **Premium images (Gemini)**: 2 per user per 24-hour period
- **Standard images (Flux)**: Unlimited fallback
- **Analysis caching**: Results cached for 24 hours per handle

User identification is anonymous, based on a hash of IP address and User-Agent.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [xAI](https://x.ai/) for Grok API access
- [OpenRouter](https://openrouter.ai/) for unified AI model access
- [GetImg.ai](https://getimg.ai/) for Flux image generation
- [Neon](https://neon.tech/) for serverless Postgres
- [shadcn/ui](https://ui.shadcn.com/) for beautiful UI components
- Community donors for supporting API costs

---

Built with Next.js and deployed on Vercel.
