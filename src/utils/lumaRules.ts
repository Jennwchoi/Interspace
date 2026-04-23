// lumaRules.ts — types and description generators for Luma AI drawing analysis

export interface StrokeData {
  x: number;
  y: number;
  pressure: number;
  speed: number;
  timestamp: number;
}

export interface ShapeData {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceData {
  detected: boolean;
  mouthCurve: number;
  eyebrowAngle: number;
  eyeShape: 'none' | 'open' | 'closed' | 'squint';
  facePosition: { x: number; y: number };
}

export interface StickerData {
  name: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
}

export interface ColorData {
  palette: string[];
  dominantColor: string;
  dominance: number;
}

export interface CompositionData {
  boundingBoxes: Array<{ x: number; y: number; width: number; height: number }>;
  fillRatio: number;
  centeredness: number;
}

export interface LumaInput {
  strokeData: StrokeData[];
  shapeData: ShapeData[];
  faceData: FaceData;
  stickerData: StickerData[];
  colorData: ColorData;
  compositionData: CompositionData;
  strokeCount: number;
  straightLineRatio: number;
  curveLineRatio: number;
  angularShapes: number;
  roundShapes: number;
  strokeSpeed: number;
  strokePressure: number;
}

// Generate a factual drawing description for Luma's context
export function generateDrawingDescription(input: LumaInput, userContext?: string): string {
  const {
    strokeCount,
    straightLineRatio,
    curveLineRatio,
    angularShapes,
    roundShapes,
    strokeSpeed,
    strokePressure,
    colorData,
    stickerData,
    compositionData,
  } = input;

  if (strokeCount === 0) return '';

  const parts: string[] = [];

  // Stroke count
  parts.push(`${strokeCount} stroke${strokeCount !== 1 ? 's' : ''}`);

  // Line character
  if (straightLineRatio > 60) {
    parts.push('mostly straight lines');
  } else if (curveLineRatio > 60) {
    parts.push('mostly curved lines');
  } else {
    parts.push('mixed lines');
  }

  // Pressure / weight
  if (strokePressure > 25) {
    parts.push('heavy strokes');
  } else if (strokePressure < 10) {
    parts.push('light strokes');
  }

  // Shape tendency
  if (angularShapes > 50) {
    parts.push('angular shapes');
  } else if (roundShapes > 50) {
    parts.push('rounded shapes');
  }

  // Speed
  if (strokeSpeed > 3) {
    parts.push('drawn quickly');
  } else if (strokeSpeed < 1) {
    parts.push('drawn slowly');
  }

  // Color
  if (colorData.palette.length > 0) {
    parts.push(`dominant color: ${colorData.dominantColor}`);
  }

  // Fill
  if (compositionData.fillRatio > 70) {
    parts.push('canvas mostly filled');
  } else if (compositionData.fillRatio < 20) {
    parts.push('mostly empty canvas');
  }

  // Stickers
  if (stickerData.length > 0) {
    const names = stickerData.map(s => s.name).join(', ');
    parts.push(`stickers: ${names}`);
  }

  let description = `Drawing: ${parts.join(', ')}.`;

  if (userContext) {
    description += ` User said: "${userContext.slice(0, 100)}"`;
  }

  return description;
}

// Calculate emotion intensity for the meter display (0-100)
export function calculateEmotionForMeter(
  emotion: string,
  strokeCount: number,
  strokeSpeed: number,
  strokePressure: number
): number {
  if (strokeCount === 0) return 50;

  let base = 50;

  if (emotion === 'angry' || emotion === 'excited') {
    base += Math.min(30, strokeSpeed * 5 + strokePressure * 0.5);
  } else if (emotion === 'calm' || emotion === 'sad') {
    base += Math.max(-20, -(strokeSpeed * 3));
  } else if (emotion === 'anxious') {
    base += Math.min(25, strokeSpeed * 4);
  } else if (emotion === 'happy') {
    base += 15;
  }

  return Math.min(100, Math.max(10, Math.round(base)));
}
