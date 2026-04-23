/**
 * Visual Analysis System
 * Analyzes the entire drawing canvas as a holistic image
 * and generates Echo keywords based on visual perception
 */

interface VisualMetrics {
  density: number;           // How much of the canvas is filled
  distribution: string;      // 'centered' | 'scattered' | 'edge' | 'clustered'
  balance: number;          // -1 (left-heavy) to 1 (right-heavy)
  verticalBalance: number;  // -1 (top-heavy) to 1 (bottom-heavy)
  continuity: number;       // How connected strokes are (0-1)
  curvature: number;        // Average curvature (0 = straight, 1 = very curved)
  tension: number;          // Visual tension from sharp angles/density
  openness: number;         // Amount of negative space
  rhythm: number;           // Regularity of mark distribution
  directionality: string;   // 'vertical' | 'horizontal' | 'diagonal' | 'radial' | 'none'
  weight: string;           // 'light' | 'medium' | 'heavy'
  flow: number;             // Sense of movement (0-1)
}

// Echo keyword vocabulary organized by visual dimensions
const ECHO_VOCABULARY = {
  // Spatial qualities
  spatial: [
    'boundary', 'void', 'horizon', 'threshold', 'liminal', 
    'overflow', 'anchor', 'suspend', 'drift'
  ],
  
  // Temporal/movement qualities
  temporal: [
    'pulse', 'echo', 'linger', 'collapse', 'dissolve',
    'emerge', 'fade', 'accumulate', 'scatter'
  ],
  
  // Texture/material qualities
  material: [
    'trace', 'residue', 'fragment', 'opacity', 'blur',
    'noise', 'grain', 'vapor', 'deposit'
  ],
  
  // Emotional/atmospheric qualities
  atmospheric: [
    'silence', 'tension', 'calm', 'weight', 'lightness',
    'pressure', 'release', 'restrain', 'exhale'
  ],
  
  // Structural qualities
  structural: [
    'lattice', 'membrane', 'rupture', 'continuity', 'fracture',
    'network', 'fiber', 'gap', 'seam'
  ],
  
  // Perceptual qualities
  perceptual: [
    'distance', 'proximity', 'clarity', 'obscure', 'reveal',
    'surface', 'depth', 'layer', 'field'
  ]
};

// Flatten all keywords for anti-repetition tracking
const ALL_KEYWORDS = Object.values(ECHO_VOCABULARY).flat();

/**
 * Analyzes canvas image data to extract visual metrics
 */
export function analyzeVisualMetrics(imageDataUrl: string): Promise<VisualMetrics> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(getDefaultMetrics());
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const width = canvas.width;
      const height = canvas.height;

      // Collect ink pixels and their properties
      const inkPixels: Array<{ x: number; y: number; alpha: number }> = [];
      let totalAlpha = 0;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const alpha = data[i + 3];
          if (alpha > 30) {
            inkPixels.push({ x, y, alpha });
            totalAlpha += alpha;
          }
        }
      }

      if (inkPixels.length === 0) {
        resolve(getDefaultMetrics());
        return;
      }

      // Calculate density
      const density = inkPixels.length / (width * height);

      // Calculate balance
      const centerX = width / 2;
      const centerY = height / 2;
      let leftWeight = 0, rightWeight = 0;
      let topWeight = 0, bottomWeight = 0;

      inkPixels.forEach(p => {
        if (p.x < centerX) leftWeight += p.alpha;
        else rightWeight += p.alpha;
        
        if (p.y < centerY) topWeight += p.alpha;
        else bottomWeight += p.alpha;
      });

      const balance = (rightWeight - leftWeight) / totalAlpha;
      const verticalBalance = (bottomWeight - topWeight) / totalAlpha;

      // Calculate distribution
      const quadrants = [0, 0, 0, 0]; // TL, TR, BL, BR
      inkPixels.forEach(p => {
        const qIndex = (p.y < centerY ? 0 : 2) + (p.x < centerX ? 0 : 1);
        quadrants[qIndex]++;
      });
      
      const maxQuadrant = Math.max(...quadrants);
      const minQuadrant = Math.min(...quadrants);
      const distribution = maxQuadrant / inkPixels.length > 0.6 ? 'clustered' :
                          minQuadrant / inkPixels.length < 0.05 ? 'edge' :
                          density < 0.15 ? 'scattered' : 'centered';

      // Calculate continuity (proximity analysis)
      let connectedCount = 0;
      const sampleSize = Math.min(500, inkPixels.length);
      for (let i = 0; i < sampleSize; i++) {
        const p1 = inkPixels[Math.floor(Math.random() * inkPixels.length)];
        let hasNearby = false;
        
        for (let dy = -5; dy <= 5; dy++) {
          for (let dx = -5; dx <= 5; dx++) {
            if (dx === 0 && dy === 0) continue;
            const checkX = p1.x + dx;
            const checkY = p1.y + dy;
            if (checkX >= 0 && checkX < width && checkY >= 0 && checkY < height) {
              const i = (checkY * width + checkX) * 4;
              if (data[i + 3] > 30) {
                hasNearby = true;
                break;
              }
            }
          }
          if (hasNearby) break;
        }
        
        if (hasNearby) connectedCount++;
      }
      const continuity = connectedCount / sampleSize;

      // Calculate curvature (edge direction changes)
      let directionChanges = 0;
      let prevDx = 0, prevDy = 0;
      const sortedPixels = [...inkPixels].sort((a, b) => a.y - b.y || a.x - b.x);
      
      for (let i = 1; i < Math.min(1000, sortedPixels.length); i++) {
        const dx = sortedPixels[i].x - sortedPixels[i - 1].x;
        const dy = sortedPixels[i].y - sortedPixels[i - 1].y;
        
        if (i > 1) {
          const angle = Math.atan2(dy, dx) - Math.atan2(prevDy, prevDx);
          if (Math.abs(angle) > Math.PI / 4) directionChanges++;
        }
        
        prevDx = dx;
        prevDy = dy;
      }
      const curvature = Math.min(1, directionChanges / Math.min(500, sortedPixels.length));

      // Calculate tension (sharp angles + density variation)
      const tension = Math.min(1, curvature * 0.5 + (density > 0.3 ? 0.3 : 0) + Math.abs(balance) * 0.2);

      // Calculate openness (inverse of density with spatial awareness)
      const openness = Math.max(0, 1 - density * 2);

      // Calculate rhythm (regularity of spacing)
      const distances: number[] = [];
      for (let i = 0; i < Math.min(100, inkPixels.length - 1); i++) {
        const p1 = inkPixels[i];
        const p2 = inkPixels[i + 1];
        distances.push(Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2));
      }
      const avgDist = distances.reduce((a, b) => a + b, 0) / distances.length;
      const variance = distances.reduce((sum, d) => sum + (d - avgDist) ** 2, 0) / distances.length;
      const rhythm = Math.max(0, 1 - Math.min(1, variance / (avgDist * avgDist)));

      // Calculate directionality
      let horizontalStrength = 0, verticalStrength = 0, diagonalStrength = 0;
      
      for (let i = 1; i < Math.min(1000, sortedPixels.length); i++) {
        const dx = Math.abs(sortedPixels[i].x - sortedPixels[i - 1].x);
        const dy = Math.abs(sortedPixels[i].y - sortedPixels[i - 1].y);
        
        if (dx > dy * 2) horizontalStrength++;
        else if (dy > dx * 2) verticalStrength++;
        else diagonalStrength++;
      }
      
      const maxDir = Math.max(horizontalStrength, verticalStrength, diagonalStrength);
      const directionality = maxDir === horizontalStrength ? 'horizontal' :
                            maxDir === verticalStrength ? 'vertical' :
                            maxDir === diagonalStrength ? 'diagonal' : 'none';

      // Calculate weight
      const avgAlpha = totalAlpha / inkPixels.length;
      const weight = avgAlpha > 200 ? 'heavy' : avgAlpha > 120 ? 'medium' : 'light';

      // Calculate flow (continuity + directionality strength)
      const dirStrength = maxDir / Math.min(1000, sortedPixels.length);
      const flow = (continuity + dirStrength) / 2;

      resolve({
        density,
        distribution,
        balance,
        verticalBalance,
        continuity,
        curvature,
        tension,
        openness,
        rhythm,
        directionality,
        weight,
        flow
      });
    };

    img.src = imageDataUrl;
  });
}

/**
 * Generate Echo keywords based on visual analysis
 * with anti-repetition logic
 */
export function generateEchoKeywords(
  metrics: VisualMetrics,
  previousKeywords: string[] = []
): string[] {
  const candidates: Array<{ keyword: string; score: number; category: string }> = [];

  // Score keywords based on visual metrics
  
  // Spatial keywords
  if (metrics.openness > 0.6) {
    candidates.push({ keyword: 'void', score: metrics.openness, category: 'spatial' });
    candidates.push({ keyword: 'horizon', score: metrics.openness * 0.8, category: 'spatial' });
  }
  if (metrics.distribution === 'edge') {
    candidates.push({ keyword: 'boundary', score: 0.9, category: 'spatial' });
    candidates.push({ keyword: 'threshold', score: 0.85, category: 'spatial' });
  }
  if (metrics.distribution === 'scattered') {
    candidates.push({ keyword: 'drift', score: 0.9, category: 'spatial' });
    candidates.push({ keyword: 'scatter', score: 0.85, category: 'temporal' });
  }
  if (Math.abs(metrics.balance) > 0.4 || Math.abs(metrics.verticalBalance) > 0.4) {
    candidates.push({ keyword: 'suspend', score: 0.8, category: 'spatial' });
  }

  // Temporal keywords
  if (metrics.flow > 0.6) {
    candidates.push({ keyword: 'pulse', score: metrics.flow, category: 'temporal' });
    candidates.push({ keyword: 'emerge', score: metrics.flow * 0.8, category: 'temporal' });
  }
  if (metrics.rhythm > 0.6) {
    candidates.push({ keyword: 'echo', score: metrics.rhythm, category: 'temporal' });
  }
  if (metrics.continuity < 0.4) {
    candidates.push({ keyword: 'collapse', score: 1 - metrics.continuity, category: 'temporal' });
    candidates.push({ keyword: 'fracture', score: (1 - metrics.continuity) * 0.9, category: 'structural' });
  }
  if (metrics.density < 0.15) {
    candidates.push({ keyword: 'fade', score: 1 - metrics.density * 5, category: 'temporal' });
    candidates.push({ keyword: 'dissolve', score: 1 - metrics.density * 4, category: 'temporal' });
  }

  // Material keywords
  if (metrics.weight === 'light') {
    candidates.push({ keyword: 'trace', score: 0.9, category: 'material' });
    candidates.push({ keyword: 'vapor', score: 0.85, category: 'material' });
  }
  if (metrics.curvature < 0.3 && metrics.continuity > 0.5) {
    candidates.push({ keyword: 'grain', score: 0.8, category: 'material' });
  }
  if (metrics.density > 0.3 && metrics.density < 0.6) {
    candidates.push({ keyword: 'residue', score: metrics.density, category: 'material' });
    candidates.push({ keyword: 'deposit', score: metrics.density * 0.9, category: 'material' });
  }
  if (metrics.continuity > 0.5 && metrics.continuity < 0.8) {
    candidates.push({ keyword: 'fragment', score: 0.75, category: 'material' });
  }

  // Atmospheric keywords
  if (metrics.tension > 0.6) {
    candidates.push({ keyword: 'tension', score: metrics.tension, category: 'atmospheric' });
    candidates.push({ keyword: 'pressure', score: metrics.tension * 0.9, category: 'atmospheric' });
  }
  if (metrics.tension < 0.3) {
    candidates.push({ keyword: 'calm', score: 1 - metrics.tension, category: 'atmospheric' });
    candidates.push({ keyword: 'exhale', score: (1 - metrics.tension) * 0.8, category: 'atmospheric' });
  }
  if (metrics.openness > 0.5 && metrics.density < 0.2) {
    candidates.push({ keyword: 'silence', score: metrics.openness, category: 'atmospheric' });
  }
  if (metrics.weight === 'heavy') {
    candidates.push({ keyword: 'weight', score: 0.9, category: 'atmospheric' });
  }
  if (metrics.weight === 'light') {
    candidates.push({ keyword: 'lightness', score: 0.9, category: 'atmospheric' });
  }

  // Structural keywords
  if (metrics.continuity > 0.7 && metrics.rhythm > 0.5) {
    candidates.push({ keyword: 'lattice', score: (metrics.continuity + metrics.rhythm) / 2, category: 'structural' });
    candidates.push({ keyword: 'network', score: metrics.continuity * 0.9, category: 'structural' });
  }
  if (metrics.continuity > 0.6 && metrics.curvature > 0.4) {
    candidates.push({ keyword: 'membrane', score: 0.8, category: 'structural' });
  }
  if (metrics.continuity < 0.5) {
    candidates.push({ keyword: 'gap', score: 1 - metrics.continuity, category: 'structural' });
    candidates.push({ keyword: 'rupture', score: (1 - metrics.continuity) * 0.85, category: 'structural' });
  }

  // Perceptual keywords
  if (metrics.density > 0.4) {
    candidates.push({ keyword: 'proximity', score: metrics.density, category: 'perceptual' });
    candidates.push({ keyword: 'surface', score: metrics.density * 0.9, category: 'perceptual' });
  }
  if (metrics.density < 0.2) {
    candidates.push({ keyword: 'distance', score: 1 - metrics.density * 3, category: 'perceptual' });
  }
  if (metrics.openness > 0.5) {
    candidates.push({ keyword: 'field', score: metrics.openness, category: 'perceptual' });
  }

  // Apply anti-repetition penalty
  const recentKeywords = previousKeywords.slice(-6); // Last 6 keywords (3 sessions)
  candidates.forEach(c => {
    const timesUsed = recentKeywords.filter(k => k === c.keyword).length;
    if (timesUsed > 0) {
      c.score *= Math.pow(0.3, timesUsed); // Heavy penalty for repetition
    }
  });

  // Ensure category diversity
  const selected: string[] = [];
  const usedCategories = new Set<string>();
  
  // Sort by score
  candidates.sort((a, b) => b.score - a.score);
  
  // Pick top 3 from different categories when possible
  for (const candidate of candidates) {
    if (selected.length >= 3) break;
    
    // Prefer different categories, but allow same if score is much higher
    if (!usedCategories.has(candidate.category) || candidate.score > 0.85) {
      selected.push(candidate.keyword);
      usedCategories.add(candidate.category);
    }
  }

  // Fallback: if we don't have 3, add highest scoring remaining
  while (selected.length < 3 && candidates.length > selected.length) {
    const next = candidates.find(c => !selected.includes(c.keyword));
    if (next) selected.push(next.keyword);
    else break;
  }

  return selected.slice(0, 3);
}

/**
 * Generate visual reinterpretation based on analyzed metrics
 * Returns symbol distribution patterns that reflect the image's visual logic
 */
export function generateReinterpretationPatterns(metrics: VisualMetrics): {
  density: number;
  symbolCategories: string[];
  distribution: 'uniform' | 'clustered' | 'linear' | 'radial' | 'edge';
  rotation: number;
  scale: number;
} {
  // Map visual metrics to symbol rendering parameters
  
  // Density: reflect the original drawing's density
  const density = Math.max(0.3, Math.min(1.2, metrics.density * 3));

  // Symbol categories based on visual qualities
  const symbolCategories: string[] = [];
  
  if (metrics.curvature > 0.5) {
    symbolCategories.push('circles', 'curves');
  }
  if (metrics.curvature < 0.4 && metrics.directionality !== 'none') {
    symbolCategories.push('lines', 'angles');
  }
  if (metrics.tension > 0.6) {
    symbolCategories.push('sharp', 'dense');
  }
  if (metrics.openness > 0.5) {
    symbolCategories.push('sparse', 'dots');
  }
  if (metrics.rhythm > 0.6) {
    symbolCategories.push('regular', 'patterns');
  }
  
  // Ensure at least one category
  if (symbolCategories.length === 0) {
    symbolCategories.push('mixed');
  }

  // Distribution pattern
  let distribution: 'uniform' | 'clustered' | 'linear' | 'radial' | 'edge';
  
  if (metrics.distribution === 'scattered') {
    distribution = 'uniform';
  } else if (metrics.distribution === 'clustered') {
    distribution = 'clustered';
  } else if (metrics.distribution === 'edge') {
    distribution = 'edge';
  } else if (metrics.directionality === 'horizontal' || metrics.directionality === 'vertical') {
    distribution = 'linear';
  } else {
    distribution = 'radial';
  }

  // Rotation based on directionality
  const rotation = metrics.directionality === 'horizontal' ? 0 :
                   metrics.directionality === 'vertical' ? 90 :
                   metrics.directionality === 'diagonal' ? 45 : 
                   Math.random() * 360;

  // Scale based on weight
  const scale = metrics.weight === 'heavy' ? 1.3 :
                metrics.weight === 'light' ? 0.7 : 1.0;

  return {
    density,
    symbolCategories,
    distribution,
    rotation,
    scale
  };
}

function getDefaultMetrics(): VisualMetrics {
  return {
    density: 0,
    distribution: 'centered',
    balance: 0,
    verticalBalance: 0,
    continuity: 0,
    curvature: 0,
    tension: 0,
    openness: 1,
    rhythm: 0,
    directionality: 'none',
    weight: 'light',
    flow: 0
  };
}
