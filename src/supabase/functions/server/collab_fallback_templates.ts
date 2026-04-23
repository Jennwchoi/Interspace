/**
 * When the vision API is unavailable, draw category-aware strokes so turns
 * still feel like a partner (whiskers, body, etc.) — not the same zigzag every time.
 */
export type CollabTemplateStroke = {
  points: [number, number][];
  color: string;
  width: number;
};

/** Smooth arc as polyline — avoids sharp “lightning” zigzags */
function arcStroke(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  steps: number,
  color: string,
  width: number,
): CollabTemplateStroke {
  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = startAngle + (endAngle - startAngle) * t;
    points.push([
      Math.max(0, Math.min(1, cx + radius * Math.cos(a))),
      Math.max(0, Math.min(1, cy + radius * Math.sin(a))),
    ]);
  }
  return { points, color, width };
}

/** Gentle curves only (no diagonal zigzags) for unknown categories */
function softOrganicRound(round: number): CollabTemplateStroke[] {
  const r = ((round - 1) % 5) + 1;
  switch (r) {
    case 1:
      return [
        arcStroke(0.35, 0.45, 0.12, Math.PI * 0.9, Math.PI * 1.35, 10, "#4b5563", 2),
        arcStroke(0.65, 0.45, 0.12, -Math.PI * 0.35, Math.PI * 0.1, 10, "#4b5563", 2),
      ];
    case 2:
      return [
        arcStroke(0.5, 0.72, 0.18, Math.PI * 0.15, Math.PI * 0.85, 14, "#374151", 3),
      ];
    case 3:
      return [
        arcStroke(0.62, 0.55, 0.22, -Math.PI * 0.1, Math.PI * 0.45, 12, "#6b7280", 2),
      ];
    case 4:
      return [
        {
          points: [[0.38, 0.82], [0.38, 0.92]],
          color: "#374151",
          width: 2,
        },
        {
          points: [[0.62, 0.82], [0.62, 0.92]],
          color: "#374151",
          width: 2,
        },
      ];
    case 5:
      return [
        arcStroke(0.5, 0.32, 0.06, 0, Math.PI * 2, 16, "#1f2937", 2),
      ];
    default:
      return softOrganicRound(1);
  }
}

/** Cat / generic animal head helpers — coords assume subject ~center */
function catLike(round: number): CollabTemplateStroke[] {
  switch (round) {
    case 1: // whiskers both sides
      return [
        {
          points: [[0.42, 0.44], [0.32, 0.42], [0.22, 0.45], [0.14, 0.43]],
          color: "#111827",
          width: 2,
        },
        {
          points: [[0.42, 0.5], [0.3, 0.52], [0.18, 0.54]],
          color: "#111827",
          width: 2,
        },
        {
          points: [[0.58, 0.44], [0.68, 0.42], [0.78, 0.45], [0.86, 0.43]],
          color: "#111827",
          width: 2,
        },
        {
          points: [[0.58, 0.5], [0.7, 0.52], [0.82, 0.54]],
          color: "#111827",
          width: 2,
        },
      ];
    case 2: // body under head
      return [
        {
          points: [
            [0.46, 0.52],
            [0.44, 0.68],
            [0.46, 0.82],
            [0.52, 0.9],
            [0.58, 0.88],
            [0.6, 0.72],
            [0.56, 0.55],
          ],
          color: "#1f2937",
          width: 3,
        },
      ];
    case 3: // soft tail (smooth S, not sharp angles)
      return [
        arcStroke(0.62, 0.68, 0.2, Math.PI * 0.05, Math.PI * 0.42, 14, "#374151", 2),
      ];
    case 4: // paws / legs
      return [
        {
          points: [[0.44, 0.88], [0.42, 0.96]],
          color: "#111827",
          width: 3,
        },
        {
          points: [[0.56, 0.88], [0.58, 0.96]],
          color: "#111827",
          width: 3,
        },
      ];
    case 5: // nose + mouth hint
      return [
        {
          points: [[0.49, 0.46], [0.5, 0.48], [0.51, 0.46]],
          color: "#111827",
          width: 2,
        },
        {
          points: [[0.5, 0.5], [0.48, 0.54], [0.52, 0.54]],
          color: "#111827",
          width: 2,
        },
      ];
    default:
      return catLike(((round - 1) % 5) + 1);
  }
}

function dogLike(round: number): CollabTemplateStroke[] {
  switch (round) {
    case 1:
      return [
        {
          points: [[0.52, 0.48], [0.58, 0.52], [0.64, 0.55], [0.68, 0.58]],
          color: "#111827",
          width: 2,
        },
        {
          points: [[0.4, 0.38], [0.36, 0.28], [0.38, 0.22]],
          color: "#111827",
          width: 2,
        },
        {
          points: [[0.6, 0.38], [0.64, 0.28], [0.62, 0.22]],
          color: "#111827",
          width: 2,
        },
      ];
    case 2:
      return catLike(2);
    case 3:
      return catLike(3);
    case 4:
      return catLike(4);
    case 5:
      return [
        {
          points: [[0.46, 0.5], [0.54, 0.5]],
          color: "#111827",
          width: 2,
        },
      ];
    default:
      return dogLike(((round - 1) % 5) + 1);
  }
}

function birdLike(round: number): CollabTemplateStroke[] {
  switch (round) {
    case 1:
      return [
        {
          points: [[0.55, 0.42], [0.68, 0.38], [0.78, 0.45], [0.72, 0.52], [0.6, 0.5]],
          color: "#1f2937",
          width: 2,
        },
      ];
    case 2:
      return [
        {
          points: [[0.52, 0.48], [0.62, 0.55], [0.58, 0.62]],
          color: "#ea580c",
          width: 2,
        },
      ];
    case 3:
      return [
        {
          points: [[0.48, 0.65], [0.45, 0.82], [0.42, 0.92]],
          color: "#111827",
          width: 2,
        },
        {
          points: [[0.54, 0.65], [0.57, 0.82], [0.6, 0.92]],
          color: "#111827",
          width: 2,
        },
      ];
    case 4:
      return [
        {
          points: [[0.35, 0.48], [0.22, 0.52], [0.15, 0.48]],
          color: "#374151",
          width: 2,
        },
      ];
    case 5:
      return [
        {
          points: [[0.5, 0.35], [0.52, 0.32], [0.54, 0.35]],
          color: "#111827",
          width: 2,
        },
      ];
    default:
      return birdLike(((round - 1) % 5) + 1);
  }
}

function treeLike(round: number): CollabTemplateStroke[] {
  switch (round) {
    case 1:
      return [
        {
          points: [[0.5, 0.55], [0.5, 0.92]],
          color: "#78350f",
          width: 4,
        },
      ];
    case 2:
      return [
        {
          points: [[0.5, 0.55], [0.35, 0.35], [0.5, 0.25], [0.65, 0.35], [0.5, 0.55]],
          color: "#166534",
          width: 3,
        },
      ];
    case 3:
      return [
        {
          points: [[0.35, 0.42], [0.22, 0.38], [0.28, 0.48]],
          color: "#166534",
          width: 2,
        },
        {
          points: [[0.65, 0.42], [0.78, 0.38], [0.72, 0.48]],
          color: "#166534",
          width: 2,
        },
      ];
    case 4:
    case 5:
      return [
        {
          points: [[0.48, 0.3], [0.44, 0.22], [0.52, 0.18], [0.56, 0.26]],
          color: "#15803d",
          width: 2,
        },
      ];
    default:
      return treeLike(((round - 1) % 5) + 1);
  }
}

function houseLike(round: number): CollabTemplateStroke[] {
  switch (round) {
    case 1:
      return [
        {
          points: [[0.35, 0.65], [0.65, 0.65], [0.65, 0.9], [0.35, 0.9], [0.35, 0.65]],
          color: "#4b5563",
          width: 2,
        },
      ];
    case 2:
      return [
        {
          points: [[0.32, 0.65], [0.5, 0.42], [0.68, 0.65]],
          color: "#7c2d12",
          width: 3,
        },
      ];
    case 3:
      return [
        {
          points: [[0.46, 0.78], [0.46, 0.9], [0.54, 0.9], [0.54, 0.78]],
          color: "#92400e",
          width: 2,
        },
      ];
    case 4:
      return [
        {
          points: [[0.42, 0.52], [0.42, 0.58], [0.48, 0.58], [0.48, 0.52]],
          color: "#1e3a8a",
          width: 2,
        },
      ];
    case 5:
      return [
        {
          points: [[0.2, 0.88], [0.8, 0.88]],
          color: "#78716c",
          width: 2,
        },
      ];
    default:
      return houseLike(((round - 1) % 5) + 1);
  }
}

function carLike(round: number): CollabTemplateStroke[] {
  switch (round) {
    case 1:
      return [
        {
          points: [[0.25, 0.62], [0.75, 0.62], [0.78, 0.72], [0.22, 0.72], [0.25, 0.62]],
          color: "#1f2937",
          width: 3,
        },
      ];
    case 2:
      return [
        {
          points: [[0.35, 0.62], [0.42, 0.52], [0.58, 0.52], [0.65, 0.62]],
          color: "#374151",
          width: 2,
        },
      ];
    case 3:
      return [
        {
          points: [[0.32, 0.72], [0.38, 0.78], [0.3, 0.82]],
          color: "#111827",
          width: 3,
        },
        {
          points: [[0.62, 0.72], [0.68, 0.78], [0.6, 0.82]],
          color: "#111827",
          width: 3,
        },
      ];
    case 4:
      return [
        {
          points: [[0.78, 0.58], [0.88, 0.55], [0.9, 0.62]],
          color: "#6b7280",
          width: 2,
        },
      ];
    case 5:
      return [
        {
          points: [[0.5, 0.58], [0.5, 0.52]],
          color: "#9ca3af",
          width: 2,
        },
      ];
    default:
      return carLike(((round - 1) % 5) + 1);
  }
}

export function getCollabFallbackStrokes(
  category: string,
  roundNumber: number,
): CollabTemplateStroke[] {
  const c = (category || "").toLowerCase().trim();
  const r = Math.min(Math.max(roundNumber, 1), 5);

  // Unknown / legacy "object" → same gentle face-part sequence as cat (no zigzag generic)
  if (!c || c === "object") return catLike(r);

  if (c === "cat" || c === "animal") return catLike(r);
  if (c === "dog") return dogLike(r);
  if (c === "bird") return birdLike(r);
  if (c === "tree" || c === "flower") return treeLike(r);
  if (c === "house") return houseLike(r);
  if (c === "car") return carLike(r);
  if (c === "face" || c === "person") return catLike(r);
  if (c === "robot" || c === "guitar" || c === "chair" || c === "cup" || c === "food") {
    return softOrganicRound(r);
  }
  return softOrganicRound(r);
}

/** Short English caption for fallback strokes (same category/round logic). */
export function getCollabFallbackThought(category: string, roundNumber: number): string {
  const c = (category || "").toLowerCase().trim();
  const eff = !c || c === "object" ? "face" : c;
  const r = Math.min(Math.max(roundNumber, 1), 5);
  const idx = r - 1;

  if (eff === "cat" || eff === "animal" || eff === "face" || eff === "person") {
    const t = [
      "Whiskers on both sides of the face.",
      "A simple body under the head.",
      "A curved tail.",
      "Small front paws.",
      "A tiny nose and mouth.",
    ];
    return t[idx]!;
  }
  if (c === "dog") {
    const t = [
      "A snout and ear lines.",
      "Body under the head.",
      "Tail curve.",
      "Front legs.",
      "A simple mouth line.",
    ];
    return t[idx]!;
  }
  if (c === "bird") {
    const t = [
      "A wing shape.",
      "A beak.",
      "Legs.",
      "Tail feathers.",
      "A little crest.",
    ];
    return t[idx]!;
  }
  if (c === "tree" || c === "flower") {
    const t = [
      "Tree trunk.",
      "Crown outline.",
      "Extra branches.",
      "More foliage.",
      "Top detail.",
    ];
    return t[idx]!;
  }
  if (c === "house") {
    const t = [
      "Walls.",
      "Roof.",
      "Door.",
      "Window.",
      "Ground line.",
    ];
    return t[idx]!;
  }
  if (c === "car") {
    const t = [
      "Body outline.",
      "Roof / cabin.",
      "Wheels.",
      "Bumper or headlight.",
      "Detail line.",
    ];
    return t[idx]!;
  }
  return [
    "Side detail lines.",
    "A main shape continuation.",
    "A connecting curve.",
    "Support lines.",
    "A small accent.",
  ][idx]!;
}
