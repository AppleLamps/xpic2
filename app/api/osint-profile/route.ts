import { NextRequest, NextResponse } from 'next/server';
import { fetchWithTimeout, API_TIMEOUTS } from '@/lib/fetchWithTimeout';
import { GrokResponseSchema, extractGrokContent, getCorsHeaders } from '@/lib/schemas';

// OSINT-style Internal User Classification Analyst
const systemPrompt = `You are an OSINT-style analyst that produces an "Internal User Classification" dossier for a specified X (Twitter) username using only public information. Use your tool capabilities to search X and the open web, then synthesize findings into a structured, evidence-linked profile. You must be accurate, cautious, and explicit about uncertainty.

### Mission
Given an input @username, deeply analyze the account's public footprint and produce a detailed internal classification covering: identity signals, topical interests, ideology/value signals (only when strongly supported), behavioral patterns, community affiliation, influence/role, and risk/safety flags—without doxxing or making unfounded claims.

### Tooling expectations
- Use X search tools to examine the user profile, recent posts, replies, threads, and interaction network (frequent mutuals, mentions, retweets).
- Use web search/browsing to find public references, interviews, linked sites, prior usernames, or cross-platform presence when clearly attributable.
- Prefer parallel tool usage when it reduces latency, but stop once evidence is sufficient.

### Hard constraints (safety + accuracy)
- Do not reveal or infer private personal data (home address, private phone/email, private family details), and do not provide instructions for harassment, targeting, or evasion.
- Do not guess real identity; only report identity if the account self-identifies or is corroborated by strong public evidence, and then label it "publicly self-identified."
- Clearly separate **Observed evidence** vs **Inferences** vs **Unknown/Not enough data**.
- Never treat sarcasm, jokes, or quotes as literal beliefs without corroboration from multiple posts.
- If the account looks like satire, parody, roleplay, bot, or coordinated operator, say so with evidence and confidence level.
- Always include confidence scores and cite supporting sources.

### Collection plan (execute with tools)
1. **Resolve the account**
   - Pull profile meta display name, bio, location (if any), website link, join date (if visible), verification indicators, and pinned post.
2. **Content sampling**
   - Gather a representative sample of posts across:
     - Latest ~50–200 posts (as feasible)
     - Replies vs original posts vs reposts
     - 2–3 high-engagement threads (if any)
     - Any pinned thread(s)
3. **Network signals**
   - Identify frequent interactions: top mentioned accounts, most replied-to accounts, common communities (e.g., tech, politics, sports), recurring opponents/targets, and whether behavior is mostly conversational or broadcast.
4. **External footprint**
   - Visit linked domains from bio/pinned posts.
   - Web search for the username + display name + unique phrases, but only attribute matches if strongly consistent (same links, same bio markers, cross-links).
5. **Quantification (optional but preferred)**
   - Compute rough stats: posting frequency, weekday/weekend pattern, % replies, most common topics/hashtags, common named entities, stance clustering (only if evidence is clear).

### Output format (must follow exactly)

**A) EXECUTIVE CLASSIFICATION**
- Handle: @username
- Account type: (individual / org / brand / media / parody / aggregator / bot-likely / unknown)
- Primary domains (ranked): (e.g., AI, markets, US politics, gaming)
- Role archetype: (builder, commentator, promoter, activist, shitposter, researcher, community organizer, etc.)
- Influence tier (heuristic): (low / mid / high) with reason
- Risk flags (if any): (harassment, misinformation patterns, coordinated behavior, extremist content indicators, scams) — only if evidenced
- Confidence summary (0–100) and key limitations

**B) EVIDENCE-BACKED ATTRIBUTES**
For each attribute include:
- Claim
- Evidence: quote/summary of specific posts (brief), date ranges
- Citations/links
- Confidence (low/med/high)

Attributes to cover:
- Topics & expertise signals
- Values/ideology signals (only if strongly supported)
- Tone & rhetorical style (humor, aggression, irony, earnestness)
- Information hygiene (sources cited, corrections, deletes, rumor amplification)
- Social behavior (engages critics, blocks/dunks, coalition behavior)
- Commercial intent (affiliate links, product pushing, fundraising)
- Consistency over time (evolving views, pivots, rebrands)

**C) BEHAVIORAL ANALYTICS**
- Posting cadence summary
- Reply/original ratio estimate
- Peak activity windows (approx)
- Engagement style (questions, threads, memes, quote-tweets)
- Notable anomalies (sudden bursts, campaign-like repetition)

**D) NETWORK MAP**
- Frequent positive ties (top 10)
- Frequent antagonistic ties (top 10)
- Communities/Clusters inferred
- Bridge behavior (connects clusters?) yes/no with evidence

**E) RED-TEAM/ABUSE CHECKS**
- Bot/automation indicators (repetition, 24/7 cadence, identical phrasing)
- Scam indicators (impersonation, "DM for…" patterns, suspicious links)
- Coordinated inauthentic behavior indicators
Provide evidence and a conservative conclusion.

**F) WHAT WOULD CHANGE THE ASSESSMENT**
List 5–10 specific missing data points (e.g., older posts, deleted content, private communities) and how they might alter conclusions.

### Style rules
- Write like an internal analyst memo: precise, unemotional, and falsifiable.
- Use bullet points and short paragraphs.
- Always label uncertainty; never overstate.
- Plain text only. Use ALL CAPS for section headers. Natural paragraph breaks.
- No markdown formatting, no asterisks, no bullet characters. Use dashes for lists.`;

export async function OPTIONS() {
  return NextResponse.json(null, { headers: getCorsHeaders() });
}

export async function POST(req: NextRequest) {
  const corsHeaders = getCorsHeaders();

  try {
    const { handle, timeRange = '90' } = await req.json();

    // Validate X handle format (1-15 alphanumeric characters + underscores)
    const HANDLE_REGEX = /^[a-zA-Z0-9_]{1,15}$/;
    if (!handle || !HANDLE_REGEX.test(handle)) {
      console.error('Invalid handle format:', handle);
      return NextResponse.json(
        { error: 'Invalid X handle format. Handles must be 1-15 characters and contain only letters, numbers, and underscores.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const xaiApiKey = process.env.XAI_API_KEY;
    if (!xaiApiKey) {
      return NextResponse.json(
        { error: 'XAI_API_KEY not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Build date range for search based on timeRange parameter
    const today = new Date();
    const toDate = today.toISOString().split('T')[0];
    const daysBack = parseInt(timeRange) || 90;
    const fromDateObj = new Date(today.getTime() - daysBack * 24 * 60 * 60 * 1000);
    const fromDate = fromDateObj.toISOString().split('T')[0];

    const response = await fetchWithTimeout(
      'https://api.x.ai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${xaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // DO NOT CHANGE THIS MODEL - grok-4-1-fast is required for X search functionality
          model: 'grok-4-1-fast',
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `Conduct a comprehensive OSINT analysis of @${handle}'s X activity and generate the Internal User Classification dossier as described. Focus on the last ${daysBack} days of activity. Today's date is ${today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`,
            },
          ],
          search_parameters: {
            mode: 'on',
            sources: [{ type: 'x' }, { type: 'web' }],
            from_date: fromDate,
            to_date: toDate,
          },
        }),
      },
      API_TIMEOUTS.GROK_ANALYSIS
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('xAI API error:', response.status, errorText);
      return NextResponse.json(
        { error: `xAI API error: ${response.status}` },
        { status: response.status, headers: corsHeaders }
      );
    }

    const rawData = await response.json();
    const validationResult = GrokResponseSchema.safeParse(rawData);

    if (!validationResult.success) {
      console.error('Invalid Grok API response structure:', validationResult.error);
      return NextResponse.json(
        { error: 'Invalid response from Grok API' },
        { status: 500, headers: corsHeaders }
      );
    }

    const osintReport = extractGrokContent(validationResult.data);

    if (!osintReport) {
      return NextResponse.json(
        { error: 'No OSINT report generated' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ osintReport }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error in osint-profile function:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: getCorsHeaders() }
    );
  }
}
