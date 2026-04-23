interface CreativeTransformRequest {
  imageDataUrl: string;
  mode: string;
  userKeywords?: string[];
}

interface CreativeTransformResponse {
  imageUrl: string;
  mode: string;
  prompt: string;
  error?: string;
}

const REPLICATE_API_URL = "https://api.replicate.com/v1/predictions";

function getReplicateToken(): string {
  const token = Deno.env.get("REPLICATE_API_TOKEN");
  if (!token) {
    throw new Error("REPLICATE_API_TOKEN environment variable is not set");
  }
  return token;
}

async function pollPrediction(
  predictionId: string,
  token: string,
  maxAttempts = 60,
  intervalMs = 2000,
): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`${REPLICATE_API_URL}/${predictionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to poll prediction: ${response.status}`);
    }

    const prediction = await response.json();

    if (prediction.status === "succeeded") {
      return prediction;
    }
    if (prediction.status === "failed" || prediction.status === "canceled") {
      throw new Error(
        `Prediction ${prediction.status}: ${prediction.error || "unknown error"}`,
      );
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error("Prediction timed out after maximum polling attempts");
}

const MODE_PROMPTS: Record<string, string> = {
  opposite:
    "Create the conceptual opposite of this image. Invert the mood, colors, and meaning while keeping a similar composition.",
  whatif:
    "Reimagine this image in an unexpected way. Combine it with a surprising element or place it in an unusual context.",
  expand:
    "Take one element from this image and create multiple variations of it, exploring different styles and expressions.",
  challenge:
    "Create something that completely defies expectations based on this image. Be bold and surprising.",
};

export async function generateCreativeResponse(
  request: CreativeTransformRequest,
): Promise<CreativeTransformResponse> {
  const { imageDataUrl, mode, userKeywords } = request;

  try {
    const token = getReplicateToken();
    const basePrompt = MODE_PROMPTS[mode] || MODE_PROMPTS.whatif;
    const keywordContext =
      userKeywords && userKeywords.length > 0
        ? ` Inspired by: ${userKeywords.join(", ")}.`
        : "";
    const prompt = basePrompt + keywordContext;

    const response = await fetch(REPLICATE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        version:
          "ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4",
        input: {
          image: imageDataUrl,
          prompt,
          num_inference_steps: 30,
          guidance_scale: 7.5,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`Replicate API error: ${JSON.stringify(err)}`);
    }

    const prediction = await response.json();
    const result = await pollPrediction(prediction.id, token);

    const outputUrl = Array.isArray(result.output)
      ? result.output[0]
      : result.output;

    return {
      imageUrl: outputUrl || "",
      mode,
      prompt,
    };
  } catch (error) {
    console.error("Replicate creative transform error:", error);
    return {
      imageUrl: "",
      mode,
      prompt: "",
      error:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

