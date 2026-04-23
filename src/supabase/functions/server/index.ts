import { analyzeDrawingWithGemini, generateChatWithGemini } from "./gemini.tsx";
import { analyzeDrawingWithGroq, generateChatWithGroq, generateCreativeImagePromptWithGroq } from "./groq.tsx";
import { generateCreativeImageWithOpenAI } from "./openai.tsx";

const provider = Deno.env.get("AI_PROVIDER") ?? "gemini";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.split("/").pop();

  try {
    // POST /chat — Luma AI chat
    if (path === "chat" && req.method === "POST") {
      const { messages, systemPrompt, drawingDescription } = await req.json();
      const response = await (provider === "groq" ? generateChatWithGroq({ messages, systemPrompt, drawingDescription }) : generateChatWithGemini({ messages, systemPrompt, drawingDescription }));
      return new Response(
        JSON.stringify({ response }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /analyze-visual — GPT-4o Vision: ASCII + keywords + imagePrompt
    if (path === "analyze-visual" && req.method === "POST") {
      const { imageDataUrl, userKeywords } = await req.json();
      const result = await (provider === "groq" ? analyzeDrawingWithGroq({ imageDataUrl, userKeywords }) : analyzeDrawingWithGemini({ imageDataUrl, userKeywords }));
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /line-drawing — DALL-E 2 line art reconstruction
    if (path === "line-drawing" && req.method === "POST") {
      const { text, categoryHint } = await req.json();
      const prompt = `Black ink contour line drawing on white background. No color, no shading. Simple continuous linework. Depict: ${text}${categoryHint ? ` (context: ${categoryHint})` : ""}`;
      const result = await generateCreativeImageWithOpenAI(prompt);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /creative-response — Groq vision generates prompt → Gemini renders image
    if (path === "creative-response" && req.method === "POST") {
      const { imageDataUrl, mode, userKeywords } = await req.json();
      if (!imageDataUrl) {
        return new Response(
          JSON.stringify({ error: "imageDataUrl required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const imagePrompt = await generateCreativeImagePromptWithGroq({
        imageDataUrl,
        mode: mode || "whatif",
        userKeywords: userKeywords || [],
      });
      console.log(`Creative prompt [${mode}]:`, imagePrompt);
      const result = await generateCreativeImageWithOpenAI(imagePrompt);
      return new Response(
        JSON.stringify({ ...result, mode }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Server error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message, fallback: "I am here. What would you like to share?" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
