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
