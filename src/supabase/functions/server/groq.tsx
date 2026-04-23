// Groq handler — visual analysis and chat using Llama models via OpenAI-compatible API

interface VisionAnalysisRequest {
  imageDataUrl: string;
  userKeywords?: string[];
}

interface VisionAnalysisResponse {
  asciiArt: string;
  echoKeywords: string[];
  visualDescription: string;
  imagePrompt: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  systemPrompt: string;
  drawingDescription?: string;
}

const GROQ_API_BASE = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_CHAT_MODEL = 'llama3-8b-8192';

/**
 * Fetch with exponential backoff — retries on 429 (rate limit) up to maxRetries times.
 * Delays: 1s, 2s, 4s, 8s, ...
 */
async function fetchWithBackoff(
  url: string,
  options: RequestInit,
  maxRetries = 3,
): Promise<Response> {
  let delay = 1000;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);
    if (response.status !== 429 || attempt === maxRetries) {
      return response;
    }
    console.warn(`Groq 429 rate limit — retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    delay *= 2;
  }
  // unreachable, but satisfies TypeScript
  return fetch(url, options);
}

/**
 * Extract base64 data and mime type from a data URL.
 * e.g. "data:image/png;base64,iVBOR..." → { mimeType: "image/png", data: "iVBOR..." }
 */
function parseDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid data URL format');
  }
  return { mimeType: match[1], data: match[2] };
}

/**
 * Analyze a drawing image using Groq's Llama 4 Scout vision model.
 * Returns the same shape as analyzeDrawingWithGemini so callers need no changes.
 */
export async function analyzeDrawingWithGroq(
  request: VisionAnalysisRequest,
): Promise<VisionAnalysisResponse> {
  const { imageDataUrl, userKeywords } = request;

  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is not set');
  }

  const { mimeType, data } = parseDataUrl(imageDataUrl);

  const keywordContext =
    userKeywords && userKeywords.length > 0
      ? `\n\nThe user selected these intention keywords before drawing: ${userKeywords.join(', ')}.\nUse them to guide interpretation, not to force analysis. The drawing is always the primary source of truth.`
      : '';

  const systemInstruction = `You are a dual-mode visual analyzer that processes drawings with three separate approaches.
${keywordContext}

BRANCH 1 — ASCII RECONSTRUCTION (pure visual transcription):
- Reproduce the drawing's structure using ASCII symbols.
- Do NOT interpret meaning, emotion, or intent.
- Major shapes MUST be spatially recognizable.
- Use at least 5 symbol types from: · ○ • ◦ ∘  — | / \\ + × ◇ △ □ ■ ∴ ∵
- 80–400 symbols depending on complexity; 6–10 lines.

BRANCH 2 — ECHO KEYWORDS (semantic interpretation):
- Exactly 3 single English words (lowercase, 3–14 letters each, letters only).
- Abstract and evocative — NOT literal object names (e.g. "trace", "tension", "drift").

BRANCH 3 — IMAGE PROMPT (creative reinterpretation for AI image generation):
- 1–3 sentences that translate the drawing's energy/mood into a new visual world.
- Do NOT describe what the user literally drew. Be surprising and evocative.

OUTPUT FORMAT — return ONLY valid JSON, no markdown fences:
{
  "asciiArt": "multi-line ASCII using \\\\n for newlines",
  "echoKeywords": ["word1", "word2", "word3"],
  "visualDescription": "Short English description of structure",
  "imagePrompt": "Evocative image generation prompt"
}`;

  const body = {
    model: GROQ_VISION_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: systemInstruction + '\n\nAnalyze this drawing. Return ONLY valid JSON — no markdown, no code fences.',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${data}`,
            },
          },
        ],
      },
    ],
    temperature: 0.8,
    max_tokens: 800,
  };

  const response = await fetchWithBackoff(GROQ_API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Groq API error:', response.status, errText);
    throw new Error(`Groq API request failed: ${response.status}`);
  }

  const json = await response.json();
  const raw = json?.choices?.[0]?.message?.content;

  if (!raw) {
    console.error('No text in Groq response:', JSON.stringify(json));
    throw new Error('No content received from Groq');
  }

  console.log('Raw Groq response:', raw);

  // Sanitize literal control characters inside JSON string values.
  // The model sometimes writes real newlines inside "asciiArt" instead of \n,
  // which makes JSON.parse throw "Bad control character in string literal".
  const sanitized = raw.replace(
    /"((?:[^"\\]|\\.)*)"/gs,
    (_match: string, content: string) =>
      '"' +
      content
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t') +
      '"',
  );

  let parsed: Partial<VisionAnalysisResponse>;
  try {
    parsed = JSON.parse(sanitized);
  } catch (parseError) {
    console.error('JSON parse error. Raw:', raw, parseError);
    return {
      asciiArt: '○ · ○\n·   ·\n○ · ○',
      echoKeywords: ['trace', 'stillness', 'space'],
      visualDescription: '',
      imagePrompt: '',
    };
  }

  return {
    asciiArt: parsed.asciiArt || '○ · ○\n·   ·\n○ · ○',
    echoKeywords: parsed.echoKeywords || ['trace', 'stillness', 'space'],
    visualDescription: parsed.visualDescription || '',
    imagePrompt: parsed.imagePrompt || '',
  };
}

// ---------------------------------------------------------------------------
// Creative image prompt generation
// ---------------------------------------------------------------------------

interface CreativeRequest {
  imageDataUrl: string;
  mode: 'opposite' | 'whatif' | 'expand' | 'challenge';
  userKeywords?: string[];
}

const MODE_INSTRUCTIONS: Record<string, string> = {
  whatif: `[WHAT IF] Imagine the drawing existing in an unexpected context or world.
- "What if this existed in a different world?"
- Transform the mundane into the fantastical.
- Example: A circle → "a portal opening in still water"`,

  opposite: `[OPPOSITE] Invert the emotional and visual logic of the drawing.
- Happy → melancholic, static → dynamic, soft → sharp.
- Find the poetic opposite, not just a negation.
- Example: A smiling face → "a mask hiding stillness"`,

  expand: `[EXPAND] Push the drawing beyond its boundaries — scale, time, or meaning.
- What does this become if it grows? Ages? Multiplies?
- Example: A small shape → "a city seen from above"`,

  challenge: `[CHALLENGE] Question an assumption embedded in the drawing.
- What is the viewer NOT seeing?
- Provoke without criticizing.
- Example: "What if this isn't a face, but a container?"`,
};

/**
 * Use Groq vision to analyze a drawing and produce a vivid image generation prompt
 * transformed through the given creative mode.
 */
export async function generateCreativeImagePromptWithGroq(
  request: CreativeRequest,
): Promise<string> {
  const { imageDataUrl, mode, userKeywords = [] } = request;

  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) throw new Error('GROQ_API_KEY environment variable is not set');

  const { mimeType, data } = parseDataUrl(imageDataUrl);
  const keywordStr = userKeywords.length > 0
    ? `\nUser's intention keywords: ${userKeywords.join(', ')}.`
    : '';

  const instruction = MODE_INSTRUCTIONS[mode] ?? MODE_INSTRUCTIONS.whatif;

  const prompt = `You are a creative AI that transforms drawings into vivid image generation prompts.${keywordStr}

Apply this creative mode to the drawing:

${instruction}

Your task: Write a single image generation prompt (2–4 sentences) that captures the transformed version of this drawing.
- Be specific about visual elements: colors, atmosphere, lighting, composition.
- Do NOT describe the original drawing literally — transform it through the mode's lens.
- Write as a direct image prompt, not a description of what you're doing.
- Output ONLY the prompt text, nothing else.`;

  const body = {
    model: GROQ_VISION_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${data}` } },
        ],
      },
    ],
    temperature: 0.9,
    max_tokens: 250,
  };

  const response = await fetchWithBackoff(GROQ_API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Groq creative prompt error:', response.status, errText);
    throw new Error(`Groq creative prompt failed: ${response.status} — ${errText}`);
  }

  const json = await response.json();
  const text = json?.choices?.[0]?.message?.content;
  if (!text) throw new Error('No content received from Groq creative prompt');

  return text.trim();
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

/**
 * Text chat using Groq's Llama 3 8B model.
 * Returns the same shape as generateChatWithGemini so callers need no changes.
 */
export async function generateChatWithGroq(
  request: ChatRequest,
): Promise<string> {
  const { messages, systemPrompt, drawingDescription } = request;

  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is not set');
  }

  // Inject drawingDescription into the last user message (same as Gemini version)
  const augmented = [...messages];
  if (drawingDescription && augmented.length > 0) {
    const last = augmented[augmented.length - 1];
    augmented[augmented.length - 1] = {
      ...last,
      content: `${last.content}\n\nDrawing observation: ${drawingDescription}`,
    };
  }

  // Build OpenAI-compatible messages array: system first, then conversation
  const openAiMessages = [
    { role: 'system', content: systemPrompt },
    ...augmented
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content })),
  ];

  const body = {
    model: GROQ_CHAT_MODEL,
    messages: openAiMessages,
    temperature: 0.7,
    max_tokens: 150,
  };

  const response = await fetchWithBackoff(GROQ_API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Groq chat API error:', response.status, errText);
    throw new Error(`Groq chat request failed: ${response.status}`);
  }

  const json = await response.json();
  const text = json?.choices?.[0]?.message?.content;

  if (!text) {
    console.error('No text in Groq chat response:', JSON.stringify(json));
    throw new Error('No content received from Groq chat');
  }

  return text;
}
