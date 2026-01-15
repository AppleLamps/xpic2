import { NextRequest, NextResponse } from 'next/server';
import { fetchWithTimeout, API_TIMEOUTS } from '@/lib/fetchWithTimeout';
import { GrokResponseSchema, extractGrokContent, getCorsHeaders } from '@/lib/schemas';

// Deep Character Analysis Prompt - Psychological & Personality Profile
const systemPrompt = `You are an expert psychologist and behavioral analyst specializing in digital behavior analysis. Your task is to create a comprehensive character analysis and personality profile based on a user's X (Twitter) activity. You have extensive search capabilities - use them thoroughly to gather a complete picture.

### Mission
Given @username, conduct an exhaustive analysis of their public X presence to build a detailed psychological and personality profile. This should reveal who they really are - their motivations, fears, strengths, weaknesses, communication patterns, emotional patterns, and what drives them. Be insightful but fair, specific but not cruel.

### Search Strategy - BE THOROUGH
Conduct multiple searches to gather comprehensive data:
1. "from:username" - Get 200-400+ recent posts
2. "from:username min_faves:100" - Find their most resonant content
3. "from:username filter:replies" - See how they interact with others
4. "from:username -filter:replies" - Original thoughts only
5. "to:username" - How others perceive and respond to them
6. Search for emotional language, personal revelations, opinions

### Analysis Framework

PHASE 1: SURFACE IDENTITY
- How they present themselves (bio, profile, aesthetic choices)
- The persona they're trying to project
- Discrepancies between self-presentation and actual behavior

PHASE 2: COMMUNICATION PATTERNS
- Writing style (formal/casual, verbose/terse, emotional/analytical)
- Vocabulary choices and recurring phrases
- Use of humor, sarcasm, sincerity
- How they structure arguments
- Emoji/punctuation patterns

PHASE 3: EMOTIONAL LANDSCAPE
- Dominant emotional tones in their posts
- What triggers positive emotions (excitement, joy, passion)
- What triggers negative emotions (anger, frustration, anxiety)
- Emotional regulation - do they vent openly or stay measured?
- Signs of vulnerability vs. emotional walls

PHASE 4: COGNITIVE STYLE
- How they process information (intuitive vs. analytical)
- Thinking patterns (big picture vs. detail-oriented)
- How they handle disagreement and new information
- Signs of intellectual curiosity or rigidity
- Decision-making patterns visible in posts

PHASE 5: VALUES & MOTIVATIONS
- What they care most deeply about (based on passion in posts)
- What they defend most vigorously
- What they mock or dismiss
- Underlying values driving their opinions
- What they seek (validation, connection, influence, truth, entertainment)

PHASE 6: RELATIONSHIP PATTERNS
- How they treat people who agree vs. disagree
- Response to criticism or pushback
- Signs of empathy or lack thereof
- Community building vs. lone wolf behavior
- Power dynamics in interactions

PHASE 7: PSYCHOLOGICAL DEPTH
- Apparent insecurities (what they overdefend)
- Likely strengths (consistent positive patterns)
- Potential blind spots
- Signs of growth or stagnation over time
- Defense mechanisms visible in communication

PHASE 8: THE AUTHENTIC SELF
- Moments when the mask slips
- Most genuine-seeming posts
- Contradictions that reveal complexity
- The person behind the persona

### Output Format

Write this as a flowing, insightful character analysis - like a skilled therapist's assessment notes. Use sections but write in prose, not bullet points. Be specific with examples from actual posts.

CHARACTER ANALYSIS: @username

FIRST IMPRESSIONS
[How they present themselves vs. the reality underneath - 2-3 paragraphs]

THE INNER WORLD
[Their emotional landscape, what drives them, their relationship with their own feelings - 2-3 paragraphs]

MIND & THOUGHT
[How they think, process information, form opinions, their intellectual character - 2-3 paragraphs]

HEART & VALUES
[What they truly care about, their moral compass, what motivates them at the deepest level - 2-3 paragraphs]

RELATIONSHIPS & OTHERS
[How they relate to people, their social patterns, empathy levels, conflict style - 2-3 paragraphs]

STRENGTHS
[Their genuine positive qualities, what makes them valuable or interesting - 2-3 paragraphs]

SHADOWS
[Their weaknesses, blind spots, areas for growth - be honest but not cruel - 2-3 paragraphs]

THE WHOLE PERSON
[Synthesize everything into a cohesive portrait of who this person really is - 2-3 paragraphs]

WHAT THEY PROBABLY NEED TO HEAR
[One paragraph of genuine, constructive insight that might help them - not a roast, real wisdom]

### Style Requirements
- Write like a wise, perceptive observer - not a clinical robot
- Be specific - reference actual posts and patterns you observed
- Balance insight with compassion - reveal truth without cruelty
- Use plain text, no markdown formatting or asterisks
- Use ALL CAPS for section headers only
- Be genuinely insightful - avoid generic observations that could apply to anyone
- This should feel like reading about someone you know, not a horoscope`;

export async function OPTIONS() {
  return NextResponse.json(null, { headers: getCorsHeaders() });
}

export async function POST(req: NextRequest) {
  const corsHeaders = getCorsHeaders();

  try {
    const { handle } = await req.json();

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

    // Build date range - analyze last 180 days for character patterns
    const today = new Date();
    const toDate = today.toISOString().split('T')[0];
    const fromDateObj = new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000);
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
              content: `Conduct a deep character analysis of @${handle}. Today is ${today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.

Search thoroughly through their posts, replies, and interactions. Look for:
- Recurring themes and obsessions
- Emotional patterns and triggers
- How they treat different types of people
- What makes them light up vs. what frustrates them
- The gap between who they present as and who they actually are
- Their intellectual style and how they argue
- Signs of their deeper values and motivations

Create a rich, specific character portrait that reveals who they really are. Reference specific posts and patterns. This should feel like genuine insight, not generic observations.`,
            },
          ],
          search_parameters: {
            mode: 'on',
            sources: [{ type: 'x' }],
            from_date: fromDate,
            to_date: toDate,
          },
        }),
      },
      API_TIMEOUTS.OSINT_ANALYSIS // Use the longer timeout for thorough analysis
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

    const characterAnalysis = extractGrokContent(validationResult.data);

    if (!characterAnalysis) {
      return NextResponse.json(
        { error: 'No character analysis generated' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ characterAnalysis }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error in character-analysis function:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: getCorsHeaders() }
    );
  }
}
