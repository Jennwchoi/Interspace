// Gemini Flash 2.0 handler — visual analysis, chat, and image generation
// Replaces OpenAI (GPT-4, GPT-4o Vision, DALL-E 3) entirely

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

const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODEL = "gemini-2.0-flash";

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
    console.warn(`Gemini 429 rate limit — retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
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
    throw new Error("Invalid data URL format");
  }
  return { mimeType: match[1], data: match[2] };
}

/**
 * Analyze a drawing image using Gemini Flash 2.0 Vision.
 * Returns the same shape as the OpenAI version so callers need no changes.
 */
export async function analyzeDrawingWithGemini(
  request: VisionAnalysisRequest,
): Promise<VisionAnalysisResponse> {
  const { imageDataUrl, userKeywords } = request;

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const { mimeType, data } = parseDataUrl(imageDataUrl);

  const keywordContext =
    userKeywords && userKeywords.length > 0
      ? `\n\nThe user selected these intention keywords before drawing: ${userKeywords.join(", ")}.\nUse them to guide interpretation, not to force analysis. The drawing is always the primary source of truth.`
      : "";

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
    system_instruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: "Analyze this drawing. Return ONLY valid JSON — no markdown, no code fences.",
          },
          {
            inline_data: {
              mime_type: mimeType,
              data: data,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 800,
      responseMimeType: "application/json",
    },
  };

  const url = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const response = await fetchWithBackoff(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Gemini API error:", response.status, errText);
    throw new Error(`Gemini API request failed: ${response.status}`);
  }

  const json = await response.json();
  const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!raw) {
    console.error("No text in Gemini response:", JSON.stringify(json));
    throw new Error("No content received from Gemini");
  }

  console.log("Raw Gemini response:", raw);

  let parsed: Partial<VisionAnalysisResponse>;
  try {
    parsed = JSON.parse(raw);
  } catch (parseError) {
    console.error("JSON parse error. Raw:", raw, parseError);
    return {
      asciiArt: "○ · ○\n·   ·\n○ · ○",
      echoKeywords: ["trace", "stillness", "space"],
      visualDescription: "Visual analysis could not be parsed.",
      imagePrompt: "",
    };
  }

  return {
    asciiArt: parsed.asciiArt || "○ · ○\n·   ·\n○ · ○",
    echoKeywords: parsed.echoKeywords || ["trace", "stillness", "space"],
    visualDescription:
      parsed.visualDescription || "Visual analysis unavailable.",
    imagePrompt: parsed.imagePrompt || "",
  };
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  systemPrompt: string;
  drawingDescription?: string;
}

/**
 * Text chat using Gemini Flash 2.0.
 * Replaces callOpenAI (GPT-4) for the /chat endpoint.
 */
export async function generateChatWithGemini(
  request: ChatRequest,
): Promise<string> {
  const { messages, systemPrompt, drawingDescription } = request;

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  // Inject drawingDescription into the last user message (same as OpenAI version)
  const augmented = [...messages];
  if (drawingDescription && augmented.length > 0) {
    const last = augmented[augmented.length - 1];
    augmented[augmented.length - 1] = {
      ...last,
      content: `${last.content}\n\nDrawing observation: ${drawingDescription}`,
    };
  }

  // Convert to Gemini format: drop system messages, "assistant" → "model"
  const contents = augmented
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 150,
    },
  };

  const url = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const response = await fetchWithBackoff(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Gemini chat API error:", response.status, errText);
    throw new Error(`Gemini chat request failed: ${response.status}`);
  }

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    console.error("No text in Gemini chat response:", JSON.stringify(json));
    throw new Error("No content received from Gemini chat");
  }

  return text;
}

// ---------------------------------------------------------------------------
// Image generation (line drawing)
// ---------------------------------------------------------------------------

interface LineDrawingRequest {
  text: string;
  categoryHint?: string;
}

/**
 * Generate a monochrome line drawing from a text description using Gemini.
 * Replaces generateLineDrawingFromDescription (DALL-E 3) for the /line-drawing endpoint.
 * Returns a data URL (data:image/png;base64,...) instead of a hosted URL.
 */
/**
 * Generate a creative image from a prompt using Gemini image generation.
 * Returns a data URL (data:image/png;base64,...).
 */
export async function generateCreativeImageWithGemini(
  prompt: string,
): Promise<{ imageUrl: string }> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY environment variable is not set");

  console.log("[Gemini creative] Firing request. Prompt:", prompt.slice(0, 120));

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
  };

  const url = `${GEMINI_API_BASE}/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

  const response = await fetchWithBackoff(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  console.log("[Gemini creative] HTTP status:", response.status);

  if (!response.ok) {
    const errText = await response.text();
    console.error("[Gemini creative] API error:", response.status, errText);
    throw new Error(`Gemini creative image failed: ${response.status} — ${errText.slice(0, 200)}`);
  }

  const json = await response.json();
  console.log("[Gemini creative] Response candidates count:", json?.candidates?.length ?? 0);
  console.log("[Gemini creative] Finish reason:", json?.candidates?.[0]?.finishReason);

  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  console.log("[Gemini creative] Parts count:", parts.length, "| types:", parts.map((p: Record<string, unknown>) => Object.keys(p).join(",")));

  const imagePart = parts.find((p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData);

  if (!imagePart?.inlineData) {
    console.error("[Gemini creative] No inlineData. Full response:", JSON.stringify(json));
    throw new Error("No image received from Gemini creative");
  }

  const { mimeType, data } = imagePart.inlineData;
  console.log("[Gemini creative] Image received. mimeType:", mimeType, "| data length:", data.length);
  return { imageUrl: `data:${mimeType};base64,${data}` };
}

export async function generateLineDrawingWithGemini(
  request: LineDrawingRequest,
): Promise<{ imageUrl: string }> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const raw = (request.text ?? "").replace(/\s+/g, " ").trim().slice(0, 900);
  if (!raw) throw new Error("text required");

  const hint = (request.categoryHint ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  const prompt =
    `Black ink contour line drawing only on pure white background. No color, no shading, no cross-hatching, no text, no watermark. Simple continuous linework like a refined doodle. Depict clearly: ${raw}` +
    (hint ? ` (context: ${hint})` : "");

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ["IMAGE"] },
  };

  const url = `${GEMINI_API_BASE}/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

  const response = await fetchWithBackoff(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Gemini image gen error:", response.status, errText);
    throw new Error(`Gemini image generation failed: ${response.status}`);
  }

  const json = await response.json();
  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData);

  if (!imagePart?.inlineData) {
    console.error("No image in Gemini response:", JSON.stringify(json));
    throw new Error("No image received from Gemini");
  }

  const { mimeType, data } = imagePart.inlineData;
  return { imageUrl: `data:${mimeType};base64,${data}` };
}
