// OpenAI API handler for Luma chat
// This keeps the API key secure on the server side

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIRequest {
  messages: ChatMessage[];
  systemPrompt: string;
  drawingDescription?: string;
}

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

export async function callOpenAI(
  request: OpenAIRequest,
): Promise<string> {
  const { messages, systemPrompt, drawingDescription } =
    request;

  // Get API key from environment variable
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    console.error(
      "OPENAI_API_KEY environment variable is not set",
    );
    throw new Error("OpenAI API key not configured");
  }

  try {
    // Add drawing description to the last message if available
    const messagesWithDrawing = [...messages];
    if (drawingDescription && messagesWithDrawing.length > 0) {
      const lastMessage =
        messagesWithDrawing[messagesWithDrawing.length - 1];
      messagesWithDrawing[messagesWithDrawing.length - 1] = {
        ...lastMessage,
        content: `${lastMessage.content}\n\nDrawing observation: ${drawingDescription}`,
      };
    }

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            { role: "system", content: systemPrompt },
            ...messagesWithDrawing,
          ],
          temperature: 0.7,
          max_tokens: 150,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("OpenAI API Error:", error);
      throw new Error(
        `OpenAI API request failed: ${response.status} - ${JSON.stringify(error)}`,
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      console.error("No content in OpenAI response:", data);
      throw new Error("No content received from OpenAI");
    }

    return content;
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    throw error;
  }
}

// AI-driven visual analysis using GPT-4 Vision
export async function analyzeDrawingVisually(
  request: VisionAnalysisRequest,
): Promise<VisionAnalysisResponse> {
  const { imageDataUrl, userKeywords } = request;

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    console.error(
      "OPENAI_API_KEY environment variable is not set",
    );
    throw new Error("OpenAI API key not configured");
  }

  try {
    const keywordContext =
      userKeywords && userKeywords.length > 0
        ? `\n\n═══════════════════════════════════════════════════════════════════\nUSER'S INTENTION KEYWORDS (Context Only)\n═══════════════════════════════════════════════════════════════════\n\nThe user selected these keywords before drawing: ${userKeywords.join(", ")}\n\nIMPORTANT RULES FOR KEYWORD USAGE:\n1. These keywords represent the user's INTENTION or MINDSET before drawing\n2. The drawing itself is ALWAYS the primary source of truth\n3. Use keywords to GUIDE interpretation, not to FORCE the analysis\n4. If the drawing contradicts the keywords, preserve that contradiction\n5. Never judge whether the user "followed" the keywords\n6. Treat keywords as interpretive lenses to understand the drawing more clearly\n\nANALYSIS PRIORITY:\n- First: Analyze what you SEE in the drawing (shapes, strokes, density, flow)\n- Second: Use keywords to help explain or reflect on what you see\n- Never: Force the drawing to match the keywords\n`
        : "";

    const systemPrompt = `You are a dual-mode visual analyzer that processes drawings with three completely separate approaches.

CRITICAL INSTRUCTION: You MUST first perform explicit visual analysis of the image before generating any output.${keywordContext}

═══════════════════════════════════════════════════════════════════
STEP 1: MANDATORY VISUAL ANALYSIS (Internal - Not in Output)
═══════════════════════════════════════════════════════════════════

Before generating ASCII, analyze the image and identify:
1. MAJOR SHAPES: What are the primary visual forms? (circles, lines, curves, clusters, arcs, loops, petals, cores, etc.)
2. SPATIAL LAYOUT: Where are these shapes positioned? (top, bottom, left, right, center, scattered, concentrated)
3. DENSITY MAPPING: Which areas are dense with strokes vs sparse/empty?
4. DIRECTIONAL FLOW: What is the orientation of lines? (horizontal, vertical, diagonal, curved, radial)
5. PROPORTIONS: What are the relative sizes and distances between elements?
6. SYMMETRY/ASYMMETRY: Is there balance or imbalance in the composition?

═══════════════════════════════════════════════════════════════════
BRANCH 1: ASCII RECONSTRUCTION (Pure Visual Transcription)
═══════════════════════════════════════════════════════════════════

ABSOLUTE RULES - NO INTERPRETATION:
❌ Do NOT interpret meaning, emotion, intent, or symbolism
❌ Do NOT create decorative patterns or abstractions
❌ Do NOT use templates or randomness
✅ This is VISUAL MAPPING ONLY - reproduce what you SEE

STRUCTURAL FIDELITY REQUIREMENTS:
- ASCII output MUST clearly resemble the drawing's structure
- Major shapes (petals, loops, cores, arcs, clusters) MUST be spatially recognizable
- Relative proportions, orientation, and symmetry MUST be preserved
- A user should recognize the drawing from ASCII alone

VISUAL MAPPING PROTOCOL:
1. For each major shape identified in analysis → create corresponding symbol cluster
2. Stroke density → symbol density (dense areas = many symbols, sparse areas = few symbols)
3. Stroke direction → symbol alignment/rotation
4. Curves → staggered symbol placement following the curve path
5. Overlaps → layered/clustered symbols
6. Empty space → preserve as whitespace (do NOT fill arbitrarily)

SYMBOL VOCABULARY (MUST use minimum 5 types):
Points: · ○ • ◦ ∘ ∙
Lines: — | / \\ ─ │ ╱ ╲
Crosses: + × ┼ ╋
Shapes: ◇ ◆ △ ▽ □ ■ ▪ ▫
Clusters: ∴ ∵ ⋮ ⋯

DENSITY REQUIREMENTS:
- Simple drawings with clear shapes: 80-150 symbols
- Medium complexity: 150-250 symbols
- Complex/dense drawings: 250-400+ symbols
- Use 6-10 lines of ASCII to capture vertical distribution
- Width should reflect horizontal span of the drawing

EXAMPLES OF PROPER MAPPING:

Example: Flower with 5 petals
→ Create 5 distinct petal-shaped symbol clusters radiating from center
→ Center = dense cluster (●●●)
→ Each petal = arc of symbols (○ ○ ○ arranged in curved pattern)

Example: Horizontal wavy line
→ Use staggered alignment across multiple rows
→ ∼∼∼─∼∼∼ (symbols follow the wave)

Example: Dense scribble in corner
→ Concentrate many varied symbols in that corner
→ •×+·○×+·• (high density, varied types)

═══════════════════════════════════════════════════════════════════
BRANCH 2: ECHO KEYWORDS (Full Semantic Interpretation)
═══════════════════════════════════════════════════════════════════

LANGUAGE:
- echoKeywords MUST be single English words (lowercase is fine)
- visualDescription MUST be in clear English (one or two short sentences)

INTERPRETATION RULES:
- Analyze emotional tone, compositional rhythm, density, and negative space
- Generate abstract, evocative keywords (NOT literal object names like "tree", "house", "circle")

KEYWORD REQUIREMENTS:
- Exactly 3 words
- Each keyword: one English word, 3–14 letters, letters only
- Examples: trace, stillness, tension, flow, density, fragment, rhythm, balance, void, drift, pulse, hush
- FORBIDDEN as keywords: concrete nouns for obvious objects in the drawing

═══════════════════════════════════════════════════════════════════
BRANCH 3: IMAGE PROMPT (Creative Reinterpretation for AI Image Generation)
═══════════════════════════════════════════════════════════════════

PURPOSE: Generate a prompt that will be sent to an image generation AI (DALL-E / Stable Diffusion).
The goal is NOT to recreate the drawing — it is to offer a surprising, evocative visual RESPONSE to it.
Think of it as: "If this drawing were a feeling, what image would that feeling conjure?"

RULES:
- Do NOT describe what the user literally drew
- Translate the drawing's energy, rhythm, tension, or mood into a new visual world
- Use unexpected analogies across domains (sound → texture, emotion → landscape, movement → weather)
- Be concrete and visual (name specific things, colors, atmospheres)
- 1-3 sentences max, written as a vivid image generation prompt
- Style: painterly, cinematic, or photographic — avoid "drawing", "sketch", "doodle"

EXAMPLES:
- Drawing with rapid, jagged lines → "A storm of black lightning over a cracked salt flat at dusk, electric tension, high contrast, cinematic"
- Soft circular loops, pastel colors → "Soap bubbles drifting through a sunlit greenhouse, soft bokeh, warm diffused light, dreamy"
- Dense overlapping strokes in corner → "A collapsed archive of maps and letters in a dim room, weight, paper texture, intimate"
- Repetitive marks across canvas → "An aerial view of ocean waves frozen mid-motion, pattern, vastness, graphite and foam"

═══════════════════════════════════════════════════════════════════
OUTPUT FORMAT (MANDATORY)
═══════════════════════════════════════════════════════════════════

Return ONLY valid JSON in this EXACT format:
{
  "asciiArt": "multi-line ASCII pattern using \\n for newlines - MUST be structurally recognizable as the drawing",
  "echoKeywords": ["word1", "word2", "word3"],
  "visualDescription": "Short English description of structure and how the ASCII maps to the drawing",
  "imagePrompt": "Evocative image generation prompt that reinterprets the drawing's energy — NOT a reconstruction"
}

CRITICAL SUCCESS CONDITION:
If someone sees your ASCII output without seeing the original drawing, they should be able to describe the major shapes and layout of the original image.`;

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "First, carefully examine the image and identify all major shapes, their positions, density patterns, and spatial relationships. Then create a dense ASCII reconstruction that visually resembles the drawing structure, plus exactly 3 abstract Echo keywords in ENGLISH (single words) that capture emotional or compositional essence. echoKeywords and visualDescription must be in English. ASCII must be visual transcription only; keywords should be interpretive, not literal object names.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageDataUrl,
                    detail: "high",
                  },
                },
              ],
            },
          ],
          temperature: 0.8,
          max_tokens: 800,
          response_format: { type: "json_object" },
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("OpenAI Vision API Error:", error);
      throw new Error(
        `OpenAI Vision API request failed: ${response.status} - ${JSON.stringify(error)}`,
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      console.error(
        "No content in OpenAI Vision response:",
        data,
      );
      throw new Error("No content received from OpenAI Vision");
    }

    // Log the raw content to debug JSON parsing issues
    console.log("Raw OpenAI Vision response:", content);

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error("JSON parse error. Raw content:", content);
      console.error("Parse error details:", parseError);
      return {
        asciiArt: "○ · ○\n·   ·\n○ · ○",
        echoKeywords: ["trace", "stillness", "space"],
        visualDescription: "Visual analysis could not be parsed.",
        imagePrompt: "",
      };
    }

    return {
      asciiArt: parsed.asciiArt || "○ · ○\n·   ·\n○ · ○",
      echoKeywords: parsed.echoKeywords || [
        "trace",
        "stillness",
        "space",
      ],
      visualDescription:
        parsed.visualDescription ||
        "Visual analysis unavailable.",
      imagePrompt:
        parsed.imagePrompt || "",
    };
  } catch (error) {
    console.error("Error calling OpenAI Vision API:", error);
    throw error;
  }
}

export interface LineDrawingRequest {
  text: string;
  categoryHint?: string;
}

/** Monochrome line art from a written description (used after vision → text). */
export async function generateLineDrawingFromDescription(
  request: LineDrawingRequest,
): Promise<{ imageUrl: string }> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }
  const raw =
    (request.text ?? "").replace(/\s+/g, " ").trim().slice(0, 900);
  if (!raw) {
    throw new Error("text required");
  }
  const hint = (request.categoryHint ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  const prompt =
    `Black ink contour line drawing only on pure white background. No color, no gray wash, no shading, no cross-hatching, no text, no watermark, no frame. Simple continuous linework like a refined doodle. Depict clearly: ${raw}` +
    (hint ? ` (optional context: ${hint})` : "");

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "url",
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("OpenAI images error:", response.status, errText);
    throw new Error(`Image generation failed: ${response.status}`);
  }

  const data = await response.json();
  const url = data?.data?.[0]?.url;
  if (!url || typeof url !== "string") {
    console.error("Unexpected images response:", data);
    throw new Error("No image URL in OpenAI response");
  }
  return { imageUrl: url };
}

/**
 * Generate a creative image from a text prompt using DALL-E 2 (cheapest OpenAI image model).
 * Returns a base64 data URL so the image doesn't expire.
 */
export async function generateCreativeImageWithOpenAI(
  prompt: string,
): Promise<{ imageUrl: string }> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY environment variable is not set");

  console.log("[DALL-E 2] Firing request. Prompt:", prompt.slice(0, 120));

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "dall-e-2",
      prompt: prompt.slice(0, 1000),
      n: 1,
      size: "512x512",
      response_format: "b64_json",
    }),
  });

  console.log("[DALL-E 2] HTTP status:", response.status);

  if (!response.ok) {
    const errText = await response.text();
    console.error("[DALL-E 2] API error:", response.status, errText);
    throw new Error(`DALL-E 2 failed: ${response.status} — ${errText.slice(0, 200)}`);
  }

  const json = await response.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) {
    console.error("[DALL-E 2] No image in response:", JSON.stringify(json));
    throw new Error("No image received from DALL-E 2");
  }

  console.log("[DALL-E 2] Image received. b64 length:", b64.length);
  return { imageUrl: `data:image/png;base64,${b64}` };
}

// Replicate API handler for Interspace creative modes
// Uses ITP Replicate Proxy

interface ReplicateRequest {
  imageDataUrl: string;
  mode: "opposite" | "whatif" | "expand" | "challenge";
  userKeywords?: string[];
}

interface ReplicateResponse {
  imageUrl: string;
  mode: string;
  prompt: string;
}

// Mode-specific prompt generators
function generatePrompt(
  mode: string,
  keywords: string[] = []
): string {
  const keywordStr = keywords.join(", ");
  
  switch (mode) {
    case "opposite":
      return `Create the conceptual opposite: if the original is soft, make it sharp. If organic, make it geometric. If calm, make it chaotic. Invert the essence. ${keywordStr ? `Context: ${keywordStr}` : ""}`;
    
    case "whatif":
      // Random unexpected combinations
      const surpriseElements = [
        "underwater", "on fire", "made of glass", 
        "in a dream", "as architecture", "melting",
        "as sound waves", "in negative space", "as a map",
        "growing", "dissolving", "multiplying"
      ];
      const randomElement = surpriseElements[Math.floor(Math.random() * surpriseElements.length)];
      return `Transform this drawing as if it were ${randomElement}. Create unexpected visual combination. ${keywordStr ? `Original intent: ${keywordStr}` : ""}`;
    
    case "expand":
      return `Take one element from this drawing and explore 4 variations of it. Show different possibilities, scales, and interpretations of the same core form. ${keywordStr ? `Focus on: ${keywordStr}` : ""}`;
    
    case "challenge":
      return `Create something the artist would NOT expect. Break the obvious interpretation. Surprise them with an alternative reading of their marks. Be visually unexpected. ${keywordStr ? `Avoid obvious connection to: ${keywordStr}` : ""}`;
    
    default:
      return "Reinterpret this drawing in a surprising way.";
  }
}

export async function generateCreativeResponse(
  request: ReplicateRequest
): Promise<ReplicateResponse> {
  const { imageDataUrl, mode, userKeywords } = request;
  
  const replicateProxy = "https://itp-ima-replicate-proxy.web.app/api/create_n_get";
  
  // Generate mode-specific prompt
  const prompt = generatePrompt(mode, userKeywords);
  
  // Prepare request data
  const data = {
    model: "stability-ai/stable-diffusion-img2img",
    fieldToConvertBase64ToURL: "image",
    fileFormat: ".png",
    input: {
      image: imageDataUrl,
      prompt: prompt,
      negative_prompt: "blurry, low quality, distorted",
      prompt_strength: 0.75,  // How much to transform (0.5-0.9)
      num_inference_steps: 30,
      guidance_scale: 7.5,
    },
  };
  
  // Adjust strength based on mode
  if (mode === "opposite" || mode === "challenge") {
    data.input.prompt_strength = 0.85;  // More transformation
  } else if (mode === "expand") {
    data.input.prompt_strength = 0.6;   // Keep more of original
  }
  
  const fetchOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Add auth token if needed for higher limits
      // 'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify(data),
  };
  
  try {
    console.log(`Sending to Replicate (${mode} mode):`, prompt);
    
    const response = await fetch(replicateProxy, fetchOptions);
    
    if (!response.ok) {
      const error = await response.json();
      console.error("Replicate API Error:", error);
      throw new Error(`Replicate API failed: ${response.status}`);
    }
    
    const prediction = await response.json();
    console.log("Replicate response:", prediction);
    
    // Extract output image URL
    const outputUrl = Array.isArray(prediction.output) 
      ? prediction.output[0] 
      : prediction.output;
    
    if (!outputUrl) {
      throw new Error("No output image from Replicate");
    }
    
    return {
      imageUrl: outputUrl,
      mode: mode,
      prompt: prompt,
    };
    
  } catch (error) {
    console.error("Error calling Replicate API:", error);
    throw error;
  }
}