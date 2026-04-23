export type AnchorStroke = {
  points: [number, number][];
  color: string;
  width: number;
};

/**
 * Shift template strokes so they sit on/near the user's ink instead of a fixed canvas center.
 */
export async function anchorStrokesToDrawingContent(
  imageDataUrl: string,
  strokes: AnchorStroke[],
): Promise<AnchorStroke[]> {
  if (!imageDataUrl || strokes.length === 0) return strokes;

  const img = new Image();
  const loaded = new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("image load failed"));
    img.src = imageDataUrl;
  });

  try {
    await loaded;
  } catch {
    return strokes;
  }

  const sampleW = Math.min(img.naturalWidth || img.width, 320);
  const sampleH = Math.min(img.naturalHeight || img.height, 320);
  if (sampleW < 8 || sampleH < 8) return strokes;

  const c = document.createElement("canvas");
  c.width = sampleW;
  c.height = sampleH;
  const ctx = c.getContext("2d");
  if (!ctx) return strokes;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, sampleW, sampleH);
  ctx.drawImage(img, 0, 0, sampleW, sampleH);

  const { data } = ctx.getImageData(0, 0, sampleW, sampleH);
  const lumThreshold = 245;
  let minX = 1,
    minY = 1,
    maxX = 0,
    maxY = 0;
  let sumX = 0,
    sumY = 0,
    count = 0;

  const step = 2;
  for (let y = 0; y < sampleH; y += step) {
    for (let x = 0; x < sampleW; x += step) {
      const i = (y * sampleW + x) * 4;
      const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (lum < lumThreshold) {
        const nx = x / sampleW;
        const ny = y / sampleH;
        minX = Math.min(minX, nx);
        minY = Math.min(minY, ny);
        maxX = Math.max(maxX, nx);
        maxY = Math.max(maxY, ny);
        sumX += nx;
        sumY += ny;
        count++;
      }
    }
  }

  if (count < 12) return strokes;

  const cx = sumX / count;
  const cy = sumY / count;
  const bw = Math.max(maxX - minX, 0.06);
  const bh = Math.max(maxY - minY, 0.06);
  const spread = Math.max(bw, bh);
  const scale = Math.min(1.35, Math.max(0.45, 0.42 / spread));

  const tx0 = 0.5;
  const ty0 = 0.48;

  return strokes.map((s) => ({
    ...s,
    points: s.points.map(([tx, ty]) => {
      const dx = (tx - tx0) * scale;
      const dy = (ty - ty0) * scale;
      return [
        Math.max(0.02, Math.min(0.98, cx + dx)),
        Math.max(0.02, Math.min(0.98, cy + dy)),
      ] as [number, number];
    }),
  }));
}
