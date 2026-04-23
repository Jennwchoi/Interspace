/**
 * Drawing Description Utilities
 * 
 * Strict factual description rules:
 * 1. Describe only: lines (shape, direction, thickness, curvature), colors visible, stickers used
 * 2. Ignore any sticker not in stickers_used
 * 3. If unclear, respond with uncertainty ("It looks like...")
 * 4. Describe line-only features first, stickers second, composition last
 * 5. Do not interpret emotion unless user asks
 * 6. Do not introduce symbolic objects unless they exist in metadata
 * 7. Provide factual description only
 * 8. End with one clarifying question
 */

// Helper: Describe lines factually (Rule 4 - lines first)
export function describeLines(
  straightLineRatio: number,
  curveLineRatio: number, 
  strokeSpeed: number,
  strokePressure: number,
  angularShapes: number,
  roundShapes: number
): string {
  const descriptions: string[] = [];
  
  // Line shape and direction
  if (straightLineRatio > 60) {
    descriptions.push("mostly straight lines");
  } else if (curveLineRatio > 60) {
    descriptions.push("mostly curved lines");
  } else if (straightLineRatio > 30 && curveLineRatio > 30) {
    descriptions.push("a mix of straight and curved lines");
  } else {
    descriptions.push("various line shapes");
  }
  
  // Thickness (from pressure)
  if (strokePressure > 25) {
    descriptions.push("thick strokes");
  } else if (strokePressure < 10) {
    descriptions.push("thin strokes");
  }
  
  // Shape characteristics
  if (angularShapes > 50) {
    descriptions.push("angular shapes");
  } else if (roundShapes > 50) {
    descriptions.push("rounded shapes");
  }
  
  if (descriptions.length === 0) {
    return "I see some lines in your drawing.";
  }
  
  return `I see ${descriptions.join(', ')}.`;
}

// Helper: Describe colors factually
export function describeColors(dominantColors: any[]): string {
  const colorNames = dominantColors.slice(0, 3).map(c => {
    const { hue, saturation, brightness } = c;
    
    // Rule 3: Be factual, handle uncertainty
    if (saturation < 20) {
      return brightness > 70 ? 'light gray' : brightness > 40 ? 'medium gray' : 'dark gray';
    }
    
    if (hue < 30 || hue > 330) return saturation > 50 ? 'red' : 'muted red';
    if (hue < 60) return saturation > 50 ? 'orange' : 'muted orange';
    if (hue < 150) return saturation > 40 ? 'green' : 'muted green';
    if (hue < 210) return saturation > 50 ? 'cyan' : 'muted cyan';
    if (hue < 270) return brightness > 50 ? 'blue' : 'dark blue';
    return saturation > 50 ? 'purple' : 'muted purple';
  });
  
  if (colorNames.length === 1) {
    return `The color is ${colorNames[0]}.`;
  } else if (colorNames.length === 2) {
    return `The colors are ${colorNames[0]} and ${colorNames[1]}.`;
  } else {
    return `The colors include ${colorNames.slice(0, -1).join(', ')}, and ${colorNames[colorNames.length - 1]}.`;
  }
}

// Helper: Full factual description for "describe" command (Rule 7)
export function describeDrawingFactually(
  dominantColors: any[],
  strokeCount: number,
  straightLineRatio: number,
  curveLineRatio: number,
  strokePressure: number,
  stickersUsed: Array<{ src: string; alt?: string }>
): string {
  if (strokeCount === 0 && stickersUsed.length === 0) {
    return "I do not see any drawing elements yet. Once you create something, I can describe what I observe.";
  }
  
  let description = '';
  
  // Lines first (Rule 4)
  if (strokeCount > 0) {
    if (straightLineRatio > 60) {
      description += "The drawing has mostly straight lines. ";
    } else if (curveLineRatio > 60) {
      description += "The drawing has mostly curved lines. ";
    } else {
      description += "The drawing has a mix of straight and curved lines. ";
    }
    
    // Thickness
    if (strokePressure > 25) {
      description += "The lines are thick. ";
    } else if (strokePressure < 10) {
      description += "The lines are thin. ";
    }
  }
  
  // Colors second
  if (dominantColors.length > 0) {
    description += describeColors(dominantColors) + ' ';
  }
  
  // Stickers last (Rule 2, 4)
  if (stickersUsed.length > 0) {
    description += `There ${stickersUsed.length === 1 ? 'is' : 'are'} ${stickersUsed.length} sticker${stickersUsed.length > 1 ? 's' : ''} in the composition. `;
  }
  
  // Rule 8: End with clarifying question
  description += "What would you like to know about it?";
  
  return description.trim();
}
