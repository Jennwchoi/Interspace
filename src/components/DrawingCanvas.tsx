import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { motion } from "motion/react";
import { useDrop } from "react-dnd";

// ========== Symbol Recompose Library ==========
const SYMBOLS = [
  // dots / bullets
  "·","•","∙","⋅","⋆","⋇","⋈","⋉","⋊","⋋","⋌","⋍","⋎","⋏","⋐","⋑","⋒","⋓","⋔","⋕","⋖","⋗","⋘","⋙","⋚","⋛","⋜","⋝","⋞","⋟",
  // stars / spark / asterisms
  "✢","✣","✤","✥","✦","✧","✩","✪","✫","✬","✭","✮","✯","✰","✱","✲","✳","✴","✵","✶","✷","✸","✹","✺","✻","✼","✽","✾","✿","❖",
  // diamonds / lozenges
  "◆","◇","◈","◊","⬖","⬗","⬘","⬙","⬠","⬡","⬢","⬣",
  // triangles
  "▲","△","▴","▵","▶","▷","▸","▹","▼","▽","▾","▿","◀","◁","◂","◃",
  // squares / blocks
  "■","□","▪","▫","▢","▣","▤","▥","▦","▧","▨","▩","◧","◨","◩","◪","◫",
  // circles / rings
  "○","◌","◍","◎","●","◐","◑","◒","◓","◔","◕","◖","◗","◘","◙","◚","◛","◜","◝","◞","◟",
  // plus / times / math operators
  "+","×","÷","=","≡","≢","∴","∵","∷","∸","∹","∺","∻","∼","≈","≋","≜","≝","≟","⊕","⊖","⊗","⊘","⊙","⊚","⊛",
  // set / logic-ish
  "∧","∨","¬","⊢","⊣","⊤","⊥","⊧","⊨","⊩","⊪","⊫","⊬","⊭","⊮","⊯",
  // brackets / corner marks
  "⌜","⌝","⌞","⌟","⎾","⎿","⏋","⏌","⏍","⏎",
  // box drawing / strokes (good for "brush-like" texture)
  "─","━","│","┃","┄","┅","┆","┇","┈","┉","┊","┋","┌","┍","┎","┏","┐","┑","┒","┓","└","┕","┖","┗","┘","┙","┚","┛","├","┝","┞","┟","┠","┡","┢","┣","┤","┥","┦","┧","┨","┩","┪","┫","┬","┭","┮","┯","┰","┱","┲","┳","┴","┵","┶","┷","┸","┹","┺","┻","┼","┽","┾","┿","╀","╁","╂","╃","╄","╅","╆","╇","╈","╉","╊","╋",
  // diag / slashes
  "╱","╲","╳","⟋","⟍","∕","∖","⧸","⧹",
  // misc glyphs that stay monochrome
  "⌁","⌂","⌃","⌄","⌅","⌆","⌇","⌌","⌍","⌎","⌏","⌐","⌑","⌒","⌓","⌔","⌕","⌖","⌗","⌘","⌙","⌜","⌝","⌞","⌟","⌠","⌡",
  "⍟","⍣","⍢","⍤","⍥","⍦","⍧","⍨","⍩","⍪","⍫","⍬","⍭","⍮","⍯"
] as const;

// ========== 얼굴 표정 인식 함수 ==========
const detectFaces = (
  ctx: CanvasRenderingContext2D | null,
  canvas: HTMLCanvasElement
): Array<{ type: 'happy' | 'sad' | 'angry' | 'neutral' | 'surprised'; confidence: number }> => {
  if (!ctx || !canvas || canvas.width === 0 || canvas.height === 0) return [];

  try {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;

    // 픽셀이 그려진 영역 찾기
    const pixels: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        const i = (y * width + x) * 4;
        if (data[i + 3] > 50) { // alpha > 50
          pixels.push({ x, y });
        }
      }
    }

    if (pixels.length < 100) return []; // 충분한 픽셀이 없으면 분석 안 함

    // 원형(얼굴) 패턴 감지
    const minX = Math.min(...pixels.map(p => p.x));
    const maxX = Math.max(...pixels.map(p => p.x));
    const minY = Math.min(...pixels.map(p => p.y));
    const maxY = Math.max(...pixels.map(p => p.y));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const radius = Math.max(maxX - minX, maxY - minY) / 2;

    // 얼굴 크기 필터 (너무 작거나 크면 무시)
    if (radius < 40 || radius > 300) return [];

    // 얼굴의 하단부(입) 영역 분석
    const mouthY = centerY + radius * 0.3;
    const mouthRegion: Array<{ x: number; y: number }> = [];

    for (let x = centerX - radius * 0.5; x <= centerX + radius * 0.5; x += 3) {
      for (let y = mouthY - 20; y <= mouthY + 20; y += 3) {
        const i = (Math.round(y) * width + Math.round(x)) * 4;
        if (x >= 0 && x < width && y >= 0 && y < height && data[i + 3] > 50) {
          mouthRegion.push({ x, y });
        }
      }
    }

    if (mouthRegion.length < 5) return []; // 입 영역이 없으면 얼굴이 아님

    // 입 모양 분석: 위쪽 곡선(웃음) vs 아래쪽 곡선(슬픔)
    let upCurve = 0;
    let downCurve = 0;
    let straight = 0;

    const mouthLeft = centerX - radius * 0.4;
    const mouthRight = centerX + radius * 0.4;
    const samples = 10;

    // 입의 양 끝과 중앙의 y 좌표를 수집
    const mouthPoints: Array<{ x: number; y: number; position: 'left' | 'center' | 'right' }> = [];

    for (let i = 0; i <= samples; i++) {
      const x = mouthLeft + (mouthRight - mouthLeft) * (i / samples);
      let foundY: number | null = null;
      let pixelCount = 0;

      // 각 x 위치에서 y값 스캔 (입 라인 찾기)
      for (let dy = -25; dy <= 25; dy++) {
        const y = mouthY + dy;
        const idx = (Math.round(y) * width + Math.round(x)) * 4;
        if (x >= 0 && x < width && y >= 0 && y < height && data[idx + 3] > 50) {
          if (foundY === null) {
            foundY = y;
          } else {
            // 여러 픽셀이 있으면 중간값 사용
            foundY = (foundY + y) / 2;
          }
          pixelCount++;
        }
      }

      if (foundY !== null && pixelCount > 0) {
        let position: 'left' | 'center' | 'right';
        if (i <= 2) position = 'left';
        else if (i >= samples - 2) position = 'right';
        else position = 'center';

        mouthPoints.push({ x, y: foundY, position });
      }
    }

    // 웃는 입 vs 슬픈 입 판단
    // 웃는 입 (U자): 중앙이 양 끝보다 아래에 있음 (Y값이 크다)
    // 슬픈 입 (역U자): 중앙이 양 끝보다 위에 있음 (Y값이 작다)
    if (mouthPoints.length >= 5) {
      const leftPoints = mouthPoints.filter(p => p.position === 'left');
      const centerPoints = mouthPoints.filter(p => p.position === 'center');
      const rightPoints = mouthPoints.filter(p => p.position === 'right');

      if (leftPoints.length > 0 && centerPoints.length > 0 && rightPoints.length > 0) {
        const avgLeftY = leftPoints.reduce((sum, p) => sum + p.y, 0) / leftPoints.length;
        const avgCenterY = centerPoints.reduce((sum, p) => sum + p.y, 0) / centerPoints.length;
        const avgRightY = rightPoints.reduce((sum, p) => sum + p.y, 0) / rightPoints.length;

        const avgEdgeY = (avgLeftY + avgRightY) / 2;
        const mouthCurvature = avgCenterY - avgEdgeY;

        console.log('👄 Mouth Analysis:', {
          avgLeftY,
          avgCenterY,
          avgRightY,
          avgEdgeY,
          mouthCurvature,
          interpretation: mouthCurvature > 5 ? '😊 SMILE (U-shape)' : mouthCurvature < -5 ? '😢 FROWN (inverted U)' : '😐 NEUTRAL'
        });

        // 양수: 중앙이 아래 (웃는 입 U자) - Canvas에서 Y가 클수록 아래
        // 음수: 중앙이 위 (슬픈 입 역U자) - Canvas에서 Y가 작을수록 위
        if (mouthCurvature > 3) {
          upCurve = Math.min(10, Math.floor(mouthCurvature));
        } else if (mouthCurvature < -3) {
          downCurve = Math.min(10, Math.floor(Math.abs(mouthCurvature)));
        } else {
          straight = 5;
        }
      }
    }

    // 눈물 감지 (얼굴 아래쪽 작은 점/선)
    let tearDrops = 0;
    const tearY = centerY + radius * 0.5;
    for (let x = centerX - radius * 0.5; x <= centerX + radius * 0.5; x += 5) {
      for (let y = tearY; y <= tearY + 30; y += 5) {
        const idx = (Math.round(y) * width + Math.round(x)) * 4;
        if (x >= 0 && x < width && y >= 0 && y < height && data[idx + 3] > 50) {
          // 파란색 또는 작은 점이면 눈물로 간주
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          if (b > r && b > g) { // 파란색
            tearDrops++;
          }
        }
      }
    }

    // 눈썹 영역 분석
    const eyebrowY = centerY - radius * 0.3;
    let angledBrows = 0; // V자 눈썹 (화남)
    let raisedBrows = 0; // ^자 눈썹 (놀람)

    for (let dx = -radius * 0.3; dx <= radius * 0.3; dx += 10) {
      const x = centerX + dx;
      let eyebrowFound = false;

      for (let dy = -15; dy <= 15; dy++) {
        const y = eyebrowY + dy;
        const idx = (Math.round(y) * width + Math.round(x)) * 4;
        if (x >= 0 && x < width && y >= 0 && y < height && data[idx + 3] > 50) {
          if (dx < 0 && dy > 5) angledBrows++; // 안쪽이 아래로 (화남)
          if (dx < 0 && dy < -5) raisedBrows++; // 안쪽이 위로 (놀람)
          eyebrowFound = true;
          break;
        }
      }
    }

    console.log('👤 Face Detection:', {
      upCurve,
      downCurve,
      straight,
      angledBrows,
      raisedBrows,
      tearDrops,
      radius,
      mouthPointsCount: mouthPoints.length
    });

    // 표정 결정 (우선순위 조정)
    const faces: Array<{ type: 'happy' | 'sad' | 'angry' | 'neutral' | 'surprised'; confidence: number }> = [];

    // 눈물이 있으면 무조건 슬픈 얼굴
    if (tearDrops >= 3) {
      faces.push({ type: 'sad', confidence: Math.min(95, 70 + tearDrops * 3) });
    }
    // 위로 올라간 입 (웃는 얼굴 U자)
    else if (upCurve >= 1) {
      faces.push({ type: 'happy', confidence: Math.min(90, 60 + upCurve * 5) });
    }
    // 아래로 처진 입 (슬픈 얼굴 역U자)
    else if (downCurve >= 1) {
      faces.push({ type: 'sad', confidence: Math.min(90, 60 + downCurve * 5) });
    }
    // V자 눈썹 (화난 얼굴)
    else if (angledBrows >= 2) {
      faces.push({ type: 'angry', confidence: Math.min(85, 55 + angledBrows * 10) });
    }
    // ^자 눈썹 (놀란 얼굴)
    else if (raisedBrows >= 2) {
      faces.push({ type: 'surprised', confidence: Math.min(85, 55 + raisedBrows * 10) });
    }
    // 입이 있지만 특징이 없으면 중립
    else if (mouthRegion.length > 5) {
      faces.push({ type: 'neutral', confidence: 65 });
    }

    return faces;
  } catch (e) {
    console.error('Face detection error:', e);
    return [];
  }
};

// Helper function for detecting circular patterns
const detectCircles = (imageData: ImageData, width: number, height: number) => {
  const circles: Array<{ x: number; y: number; radius: number }> = [];
  const data = imageData.data;
  
  // Find filled regions
  const pixels: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < height; y += 5) {
    for (let x = 0; x < width; x += 5) {
      const i = (y * width + x) * 4;
      if (data[i + 3] > 50) {
        pixels.push({ x, y });
      }
    }
  }

  if (pixels.length < 20) return [];

  // Find bounding box
  const minX = Math.min(...pixels.map(p => p.x));
  const maxX = Math.max(...pixels.map(p => p.x));
  const minY = Math.min(...pixels.map(p => p.y));
  const maxY = Math.max(...pixels.map(p => p.y));

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const radius = Math.max(maxX - minX, maxY - minY) / 2;

  if (radius >= 30 && radius <= 300) {
    circles.push({ x: centerX, y: centerY, radius });
  }

  return circles;
};

// ========== 이모지 인식 함수 ==========
const detectEmojis = (
  ctx: CanvasRenderingContext2D | null,
  canvas: HTMLCanvasElement,
  colorProps: Array<{ hue: number; saturation: number; brightness: number }>
): Array<{ type: 'smile' | 'frown' | 'heart' | 'star' | 'sun' | 'flower' | 'tear'; confidence: number }> => {
  if (!ctx || !canvas || canvas.width === 0 || canvas.height === 0) return [];

  try {
    const emojis: Array<{ type: 'smile' | 'frown' | 'heart' | 'star' | 'sun' | 'flower' | 'tear'; confidence: number }> = [];

    // 노란색 원형 = 스마일 이모지
    const hasYellow = colorProps.some(c => c.hue >= 45 && c.hue <= 65 && c.saturation > 50);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const circles = detectCircles(imageData, canvas.width, canvas.height);

    if (hasYellow && circles.length > 0) {
      emojis.push({ type: 'smile', confidence: 75 });
    }

    // 파란색 + 작은 점 = 눈물
    const hasBlue = colorProps.some(c => c.hue >= 180 && c.hue <= 240 && c.brightness < 60);
    if (hasBlue && detectSmallDots(imageData, canvas.width, canvas.height)) {
      emojis.push({ type: 'tear', confidence: 70 });
    }

    // 하트, 별, 태양, 꽃은 detectObjects에서 처리

    return emojis;
  } catch (e) {
    console.error('Emoji detection error:', e);
    return [];
  }
};

const detectSmallDots = (imageData: ImageData, width: number, height: number) => {
  let dotCount = 0;
  for (let y = 20; y < height - 20; y += 30) {
    for (let x = 20; x < width - 20; x += 30) {
      const index = (y * width + x) * 4;
      if (imageData.data[index + 3] > 100) {
        // 주변 픽셀이 비어있는지 확인 (작은 점)
        let surrounded = true;
        for (let dy = -15; dy <= 15; dy += 5) {
          for (let dx = -15; dx <= 15; dx += 5) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIndex = (ny * width + nx) * 4;
              if (imageData.data[nIndex + 3] > 100) {
                surrounded = false;
                break;
              }
            }
          }
        }
        if (surrounded) dotCount++;
      }
    }
  }
  return dotCount > 2;
};

// ========== 사물 인식 함수 (Quick Draw 기반) ==========
/**
 * Google Quick Draw 데이터셋 개념을 기반으로 사용자가 그린 객체를 인식합니다.
 * 
 * 인식 가능한 객체:
 * - 긍정적 (Positive): 하트, 별, 태양, 꽃, 나무, 무지개, 고양이, 개, 새, 물고기, 나비, 케이크, 피자, 풍선, 기타
 * - 중립적 (Neutral): 구름, 집, 우산, 책, 산
 * - 부정적 (Negative): 해골, 번개
 * 
 * 분석 요소:
 * - 색상 (RGB/HSL)
 * - 형태 (가로세로 비율, 원형도, 대칭성)
 * - 밀도 분포 (상단 집중, 하단 집중)
 * - 픽셀 패턴
 */
const detectObjects = (
  ctx: CanvasRenderingContext2D | null,
  canvas: HTMLCanvasElement,
  colorProps: Array<{ hue: number; saturation: number; brightness: number }>
): Array<{ 
  type: 'heart' | 'star' | 'sun' | 'cloud' | 'flower' | 'tree' | 'house' | 'rainbow' | 
        'cat' | 'dog' | 'bird' | 'fish' | 'butterfly' | 'cake' | 'pizza' | 
        'balloon' | 'umbrella' | 'book' | 'guitar' | 'skull' | 'lightning' | 'mountain'; 
  emotion: 'positive' | 'negative' | 'neutral'; 
  confidence: number;
  emotionWeight: number;
}> => {
  if (!ctx || !canvas) return [];

  // Check if canvas has valid dimensions
  if (canvas.width === 0 || canvas.height === 0) return [];

  const objects: Array<{ 
    type: 'heart' | 'star' | 'sun' | 'cloud' | 'flower' | 'tree' | 'house' | 'rainbow' | 
          'cat' | 'dog' | 'bird' | 'fish' | 'butterfly' | 'cake' | 'pizza' | 
          'balloon' | 'umbrella' | 'book' | 'guitar' | 'skull' | 'lightning' | 'mountain'; 
    emotion: 'positive' | 'negative' | 'neutral'; 
    confidence: number;
    emotionWeight: number;
  }> = [];

  try {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const width = canvas.width;
    const height = canvas.height;
    const data = imageData.data;

    // 픽셀 데이터 수집
    const pixels: Array<{ x: number; y: number; r: number; g: number; b: number }> = [];
    for (let y = 0; y < height; y += 3) {
      for (let x = 0; x < width; x += 3) {
        const i = (y * width + x) * 4;
        if (data[i + 3] > 50) {
          pixels.push({ 
            x, 
            y, 
            r: data[i], 
            g: data[i + 1], 
            b: data[i + 2] 
          });
        }
      }
    }

    if (pixels.length < 20) return [];

    // 바운딩 박스
    const minX = Math.min(...pixels.map(p => p.x));
    const maxX = Math.max(...pixels.map(p => p.x));
    const minY = Math.min(...pixels.map(p => p.y));
    const maxY = Math.max(...pixels.map(p => p.y));
    const drawingWidth = maxX - minX;
    const drawingHeight = maxY - minY;
    const aspectRatio = drawingWidth / Math.max(drawingHeight, 1);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // 상단, 하단 밀도
    const upperPixels = pixels.filter(p => p.y < centerY).length;
    const lowerPixels = pixels.filter(p => p.y >= centerY).length;
    const topHeavy = upperPixels > lowerPixels * 1.5;
    const bottomHeavy = lowerPixels > upperPixels * 1.5;

    // 색상 분석
    const hasRedPink = colorProps.some(c => (c.hue >= 330 || c.hue <= 20) && c.saturation > 50);
    const hasYellow = colorProps.some(c => c.hue >= 45 && c.hue <= 65 && c.saturation > 50);
    const hasOrange = colorProps.some(c => c.hue >= 20 && c.hue <= 45 && c.saturation > 60);
    const hasGreen = colorProps.some(c => c.hue >= 90 && c.hue <= 150);
    const hasBlue = colorProps.some(c => c.hue >= 180 && c.hue <= 240);
    const hasPurple = colorProps.some(c => c.hue >= 270 && c.hue <= 300);
    const hasBrown = colorProps.some(c => c.hue >= 20 && c.hue <= 40 && c.saturation < 60);
    const hasGray = colorProps.some(c => c.saturation < 20);
    const hasWhite = colorProps.some(c => c.saturation < 20 && c.brightness > 70);
    const hasBlack = colorProps.some(c => c.brightness < 30);
    const hasBrightColors = colorProps.some(c => c.brightness > 70 && c.saturation > 60);

    // ========== 형태 분석 (80% 가중치) ==========
    
    // 원형도 계산
    let circularityScore = 0;
    if (pixels.length > 50) {
      const radius = Math.max(drawingWidth, drawingHeight) / 2;
      let insideCount = 0;
      for (const p of pixels) {
        const dist = Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2));
        if (dist <= radius) insideCount++;
      }
      circularityScore = (insideCount / pixels.length) * 100;
    }

    // 좌우 대칭성
    const symmetryScore = 100 - Math.min(100, Math.abs(upperPixels - lowerPixels) / pixels.length * 100);

    // 경계선 비율
    let edgePixels = 0;
    for (const p of pixels) {
      const distToEdge = Math.min(p.x - minX, maxX - p.x, p.y - minY, maxY - p.y);
      if (distToEdge < Math.max(drawingWidth, drawingHeight) * 0.1) edgePixels++;
    }
    const edgeRatio = (edgePixels / pixels.length) * 100;

    // 하트 형태 감지 (상단 두 볼록 + 하단 뾰족)
    const topLeftQ = pixels.filter(p => p.x < centerX && p.y < centerY).length;
    const topRightQ = pixels.filter(p => p.x >= centerX && p.y < centerY).length;
    const bottomTip = pixels.filter(p => Math.abs(p.x - centerX) < drawingWidth * 0.2 && p.y > centerY + drawingHeight * 0.3).length;
    const hasHeartShape = topHeavy && topLeftQ > pixels.length * 0.15 && topRightQ > pixels.length * 0.15 &&
                          Math.abs(topLeftQ - topRightQ) < pixels.length * 0.15 &&
                          bottomTip < pixels.length * 0.2 &&
                          aspectRatio > 0.7 && aspectRatio < 1.4;

    // 별 형태 감지 (각진 형태)
    const hasStarShape = circularityScore < 70 && edgeRatio > 50;

    console.log('📐 Shape (80%):', {
      circularityScore: circularityScore.toFixed(1),
      aspectRatio: aspectRatio.toFixed(2),
      symmetryScore: symmetryScore.toFixed(1),
      edgeRatio: edgeRatio.toFixed(1),
      hasHeartShape,
      hasStarShape
    });

    // ========== 긍정적 객체 인식 (형태 80% + 색상 20%) ==========
    
    // 하트 ❤️ (형태 우선, 색상 보조)
    if (hasHeartShape) {
      let confidence = 75;
      if (hasRedPink) confidence += 15; // 색상 보너스 20%
      objects.push({ type: 'heart', emotion: 'positive', confidence, emotionWeight: 90 });
    }

    // 별 ⭐ (형태 우선: 각진 + 테두리 많음)
    if (hasStarShape) {
      let confidence = 70;
      if (hasYellow) confidence += 10; // 색상 보너스
      objects.push({ type: 'star', emotion: 'positive', confidence, emotionWeight: 70 });
    }

    // 태양 ☀️ (형태 우선: 원형)
    if (circularityScore > 65 && !hasHeartShape && !hasStarShape) {
      let confidence = 75;
      if (hasYellow || hasOrange) confidence += 10; // 색상 보너스
      objects.push({ type: 'sun', emotion: 'positive', confidence, emotionWeight: 85 });
    }

    // 꽃 🌸 (형태: 중간 원형도 + 중앙 밀집)
    if (circularityScore > 50 && circularityScore < 80 && !hasStarShape) {
      let confidence = 70;
      if (colorProps.length >= 2) confidence += 10; // 다양한 색상 보너스
      objects.push({ type: 'flower', emotion: 'positive', confidence, emotionWeight: 80 });
    }

    // 나무 🌳 (형태: 하단 무거움 + 세로로 김)
    if (bottomHeavy && aspectRatio < 0.9 && !hasHeartShape) {
      let confidence = 65;
      if (hasGreen || hasBrown) confidence += 10; // 색상 보너스
      objects.push({ type: 'tree', emotion: 'positive', confidence, emotionWeight: 60 });
    }

    // 무지개 🌈 (형태 우선: 가로로 매우 길고 상단 집중)
    if (aspectRatio > 1.8 && topHeavy && edgeRatio > 40) {
      let confidence = 80;
      if (colorProps.length >= 3) confidence += 15; // 다양한 색상 보너스
      objects.push({ type: 'rainbow', emotion: 'positive', confidence, emotionWeight: 95 });
    }

    // 고양이 🐱 (형태: 상단 집중 + 정사각형에 가까움)
    if (topHeavy && aspectRatio > 0.7 && aspectRatio < 1.3 && pixels.length > 100) {
      const topThird = pixels.filter(p => p.y < minY + drawingHeight * 0.3);
      if (topThird.length > pixels.length * 0.2) {
        let confidence = 60;
        objects.push({ type: 'cat', emotion: 'positive', confidence, emotionWeight: 75 });
      }
    }

    // 개 🐶 (형태: 하단 무거움 + 가로로 긴)
    if (bottomHeavy && aspectRatio > 1.2 && pixels.length > 100 && !hasHeartShape) {
      let confidence = 55;
      objects.push({ type: 'dog', emotion: 'positive', confidence, emotionWeight: 75 });
    }

    // 새 🐦 (형태: 상단 집중 + 가로로 긴)
    if (topHeavy && aspectRatio > 1.3 && aspectRatio < 2.5 && !hasStarShape) {
      let confidence = 60;
      objects.push({ type: 'bird', emotion: 'positive', confidence, emotionWeight: 70 });
    }

    // 물고기 🐟 (형태: 가로로 매우 긴)
    if (aspectRatio > 1.6 && !topHeavy && !bottomHeavy) {
      let confidence = 55;
      if (hasBlue) confidence += 10; // 색상 보너스
      objects.push({ type: 'fish', emotion: 'positive', confidence, emotionWeight: 65 });
    }

    // 나비 🦋 (형태: 가로로 길고 좌우 대칭)
    if (aspectRatio > 1.2 && aspectRatio < 2.0) {
      const leftP = pixels.filter(p => p.x < centerX).length;
      const rightP = pixels.filter(p => p.x >= centerX).length;
      const symmetry = Math.abs(leftP - rightP) / pixels.length;
      if (symmetry < 0.25) {
        let confidence = 65;
        if (colorProps.length >= 2) confidence += 10; // 색상 보너스
        objects.push({ type: 'butterfly', emotion: 'positive', confidence, emotionWeight: 80 });
      }
    }

    // 케이크 🎂 (형태: 세로로 길고 하단 무거움)
    if (aspectRatio < 0.8 && bottomHeavy && !hasHeartShape) {
      let confidence = 60;
      if (hasBrightColors) confidence += 10; // 색상 보너스
      objects.push({ type: 'cake', emotion: 'positive', confidence, emotionWeight: 85 });
    }

    // 피자 🍕 (형태: 원형)
    if (circularityScore > 70 && !hasStarShape && !hasHeartShape) {
      let confidence = 55;
      if (hasRedPink || hasYellow || hasOrange) confidence += 10; // 색상 보너스
      objects.push({ type: 'pizza', emotion: 'positive', confidence, emotionWeight: 70 });
    }

    // 풍선 🎈 (형태: 원형 + 상단 집중)
    if (circularityScore > 60 && topHeavy && !hasHeartShape) {
      let confidence = 65;
      if (hasBrightColors) confidence += 10; // 색상 보너스
      objects.push({ type: 'balloon', emotion: 'positive', confidence, emotionWeight: 85 });
    }

    // 기타 🎸 (형태: 매우 세로로 길고 하단 넓음)
    if (aspectRatio < 0.5 && bottomHeavy) {
      let confidence = 55;
      if (hasBrown || hasYellow) confidence += 10; // 색상 보너스
      objects.push({ type: 'guitar', emotion: 'positive', confidence, emotionWeight: 75 });
    }

    // ========== 중립적 객체 인식 (형태 80% + 색상 20%) ==========

    // 구름 ☁️ (형태: 불규칙한 원형)
    if (circularityScore > 45 && circularityScore < 75 && !hasHeartShape && !hasStarShape) {
      let confidence = 60;
      if (hasWhite || hasGray) confidence += 15; // 색상 보너스
      objects.push({ type: 'cloud', emotion: 'neutral', confidence, emotionWeight: 50 });
    }

    // 집 🏠 (형태: 정사각형에 가깝고 하단 무거움)
    if (aspectRatio > 0.7 && aspectRatio < 1.3 && bottomHeavy && !hasHeartShape) {
      let confidence = 60;
      objects.push({ type: 'house', emotion: 'neutral', confidence, emotionWeight: 60 });
    }

    // 우산 ☂️ (형태: 상단 넓고 세로로 긴)
    if (topHeavy && aspectRatio < 0.85 && !hasHeartShape) {
      let confidence = 55;
      objects.push({ type: 'umbrella', emotion: 'neutral', confidence, emotionWeight: 50 });
    }

    // 책 📖 (형태: 직사각형)
    if (aspectRatio > 1.3 && aspectRatio < 1.9 && edgeRatio > 50 && pixels.length > 80) {
      let confidence = 50;
      objects.push({ type: 'book', emotion: 'neutral', confidence, emotionWeight: 40 });
    }

    // 산 ⛰️ (형태: 삼각형 - 상단 집중 + 가로로 김)
    if (topHeavy && aspectRatio > 1.1 && aspectRatio < 2.5) {
      let confidence = 60;
      if (hasGray || hasBrown || hasGreen) confidence += 10; // 색상 보너스
      objects.push({ type: 'mountain', emotion: 'neutral', confidence, emotionWeight: 55 });
    }

    // ========== 부정적 객체 인식 (형태 80% + 색상 20%) ==========

    // 해골 💀 (형태: 원형 + 상단 집중)
    if (circularityScore > 55 && topHeavy && !hasHeartShape) {
      let confidence = 55;
      if (hasWhite || hasGray || hasBlack) confidence += 10; // 색상 보너스
      objects.push({ type: 'skull', emotion: 'negative', confidence, emotionWeight: -80 });
    }

    // 번개 ⚡ (형태: 세로로 길고 각진 - 지그재그)
    if (aspectRatio < 0.7 && circularityScore < 45 && edgeRatio > 40) {
      let confidence = 60;
      if (hasYellow) confidence += 10; // 색상 보너스
      objects.push({ type: 'lightning', emotion: 'negative', confidence, emotionWeight: -60 });
    }

    // 중복 제거: 가장 높은 신뢰도만 유지
    const uniqueObjects = objects.sort((a, b) => b.confidence - a.confidence).slice(0, 3);

    // Emoji mapping for better visualization
    const emojiMap: Record<string, string> = {
      heart: '❤️', star: '⭐', sun: '☀️', cloud: '☁️', flower: '🌸', tree: '🌳',
      house: '🏠', rainbow: '🌈', cat: '🐱', dog: '🐶', bird: '🐦', fish: '🐟',
      butterfly: '🦋', cake: '🎂', pizza: '🍕', balloon: '🎈', umbrella: '☂️',
      book: '📖', guitar: '🎸', skull: '💀', lightning: '⚡', mountain: '⛰️'
    };

    console.log('🎯 Object Detection (Quick Draw):', {
      totalDetected: objects.length,
      finalObjects: uniqueObjects.length,
      objects: uniqueObjects.map(o => `${emojiMap[o.type] || '🎨'} ${o.type} (${o.confidence}%, weight: ${o.emotionWeight})`),
      drawingStats: {
        aspectRatio: aspectRatio.toFixed(2),
        circularityScore: circularityScore.toFixed(1),
        topHeavy,
        bottomHeavy,
        edgeRatio: edgeRatio.toFixed(1),
        colors: colorProps.length
      }
    });

    return uniqueObjects;
  } catch (e) {
    console.error('Object detection error:', e);
    return [];
  }
};

interface PlacedSticker {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DrawingCanvasProps {
  tool?: 'pencil' | 'brush' | 'eraser' | 'fill' | 'eyedropper' | 'shape' | 'sticker';
  brushSize?: number;
  color?: string;
  onColorPick?: (color: string) => void;
  selectedShape?: 'circle' | 'rectangle' | 'line' | 'triangle';
  onSaveState?: (canvasData: string, stickers: PlacedSticker[]) => void;
  onDrawingAnalysis?: (analysis: DrawingAnalysis) => void;
  onStrokeEnd?: () => void;
  pendingSticker?: string | null;
  onStickerPlaced?: () => void;
}

export interface DrawingAnalysis {
  // 1. 색채 (Color)
  dominantColors: { color: string; ratio: number; hue: number; saturation: number; brightness: number }[];
  averageBrightness: number; // 0-100
  averageSaturation: number; // 0-100
  colorContrast: number; // 0-100
  colorDiversity: number; // 색상 종류 수
  
  // 2. 선 (Line)
  strokeSpeed: number; // px/ms
  strokePressure: number; // average thickness
  strokeTremor: number; // 0-100, 떨림/진동 정도
  straightLineRatio: number; // 0-100, 직선 비율
  curveLineRatio: number; // 0-100, 곡선 비율
  
  // 3. 형태 (Shape)
  angularShapes: number; // 0-100, 각진 형태 비율
  roundShapes: number; // 0-100, 둥근 형태 비율
  brokenShapes: number; // 0-100, 끊긴 형태
  
  // 4. 구성 (Composition)
  centroidDeviation: number; // 0-100, 중심에서 벗어난 정도
  symmetryScore: number; // 0-100, 대칭성
  
  // 5. 공간 사용률 (Space Density)
  canvasDensity: number; // 0-100
  
  // 6. 압력 (Pressure)
  pressureVariance: number; // 0-100, 압력 일관성
  
  // 7. 반복 패턴 (Repetition)
  repetitionScore: number; // 0-100
  
  // 8. 경계 사용 (Border Interaction)
  borderCrossing: number; // 0-100, 경계 벗어남
  
  // 9. 흐름 (Flow)
  flowContinuity: number; // 0-100, 흐름 연속성
  
  // 10. 방향성 (Direction)
  upwardDirection: number; // 0-100
  downwardDirection: number; // 0-100
  centerFocus: number; // 0-100
  
  // 11. 얼굴/표정 인식 (Face/Expression Detection)
  detectedFaces: Array<{
    type: 'happy' | 'sad' | 'angry' | 'neutral' | 'surprised';
    confidence: number;
  }>;
  
  // 12. 이모지 인식 (Emoji Detection)
  detectedEmojis: Array<{
    type: 'smile' | 'frown' | 'heart' | 'star' | 'sun' | 'flower' | 'tear';
    confidence: number;
  }>;
  
  // 13. 사물 인식 (Object Detection - Quick Draw 기반)
  detectedObjects: Array<{
    type: 'heart' | 'star' | 'sun' | 'cloud' | 'flower' | 'tree' | 'house' | 'rainbow' | 
          'cat' | 'dog' | 'bird' | 'fish' | 'butterfly' | 'cake' | 'pizza' | 
          'balloon' | 'umbrella' | 'book' | 'guitar' | 'skull' | 'lightning' | 'mountain';
    emotion: 'positive' | 'negative' | 'neutral';
    confidence: number;
    emotionWeight: number;
  }>;
  
  // 메타 데이터
  strokeCount: number;
  recentStrokes: number;
}

export interface DrawingCanvasHandle {
  saveState: () => { canvasData: string; stickers: PlacedSticker[] } | null;
  restoreState: (state: { canvasData: string; stickers: PlacedSticker[] }) => void;
  exportAsImage: () => string | null;
  exportAsSymbolImage: () => string | null;
}

export const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(({ tool = 'pencil', brushSize = 18, color = '#000000', onColorPick, selectedShape = 'circle', onSaveState, onDrawingAnalysis, onStrokeEnd, pendingSticker, onStickerPlaced }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [hasDrawn, setHasDrawn] = useState(false);
  const [placedStickers, setPlacedStickers] = useState<PlacedSticker[]>([]);
  const [shapeStartPos, setShapeStartPos] = useState({ x: 0, y: 0 });
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const tempCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // 🆕 스티커 배치 관련 상태
  const [isDraggingSticker, setIsDraggingSticker] = useState(false);
  const [stickerStart, setStickerStart] = useState<{ x: number; y: number } | null>(null);
  const [stickerPreview, setStickerPreview] = useState<{ 
    x: number; 
    y: number; 
    size: number; 
  } | null>(null);
  
  // Guard flag to prevent ResizeObserver from triggering during history restoration
  const isRestoringRef = useRef(false);

  // Symbol Recompose state
  const [symbolMode, setSymbolMode] = useState(false);
  const [symbolDensity, setSymbolDensity] = useState(0.65);
  const [symbolScale, setSymbolScale] = useState(1.0);

  // Drawing analysis tracking
  const strokeStartTime = useRef<number>(0);
  const strokeDistances = useRef<number[]>([]);
  const strokeTimes = useRef<number[]>([]);
  const usedColors = useRef<Set<string>>(new Set());
  const brushSizes = useRef<number[]>([]);
  const strokeCount = useRef<number>(0);
  const lastAnalysisTime = useRef<number>(Date.now());
  const strokePositions = useRef<{ x: number; y: number }[]>([]);
  const strokeAngles = useRef<number[]>([]);
  const pressureValues = useRef<number[]>([]);

  // Helper function to convert clientX/clientY to canvas coordinates
  // Returns logical coordinates (the transform handles scaling to physical pixels)
  const getCanvasPoint = (clientX: number, clientY: number): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  // RGB to HSL conversion
  const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return [h * 360, s * 100, l * 100];
  };

  // Calculate color properties
  const getColorProperties = (hexColor: string) => {
    const rgb = hexToRgb(hexColor);
    const [h, s, l] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
    return {
      hue: h,
      saturation: s,
      brightness: l
    };
  };

  // Calculate color brightness
  const getColorBrightness = (hexColor: string): number => {
    const rgb = hexToRgb(hexColor);
    // Use perceived brightness formula
    return (rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114) / 255 * 100;
  };

  // Send analysis to parent component
  const sendAnalysis = () => {
    if (!onDrawingAnalysis || strokeCount.current === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // 1. 색채 (Color) 분석
    const colorArray = Array.from(usedColors.current);
    const colorProps = colorArray.map(col => ({
      color: col,
      ratio: 1 / colorArray.length, // 간단한 균등 비율
      ...getColorProperties(col)
    }));

    const avgBrightness = colorProps.length > 0
      ? colorProps.reduce((sum, c) => sum + c.brightness, 0) / colorProps.length
      : 50;

    const avgSaturation = colorProps.length > 0
      ? colorProps.reduce((sum, c) => sum + c.saturation, 0) / colorProps.length
      : 50;

    const brightnessVariance = colorProps.length > 1
      ? Math.sqrt(colorProps.reduce((sum, c) => sum + Math.pow(c.brightness - avgBrightness, 2), 0) / colorProps.length)
      : 0;

    // 2. 선 (Line) 분석
    const avgSpeed = strokeDistances.current.length > 0
      ? strokeDistances.current.reduce((sum, dist, i) => {
          const time = strokeTimes.current[i] || 1;
          return sum + (dist / Math.max(time, 1));
        }, 0) / strokeDistances.current.length
      : 0;

    const avgBrushSize = brushSizes.current.length > 0
      ? brushSizes.current.reduce((a, b) => a + b, 0) / brushSizes.current.length
      : brushSize;

    // 떨림/진동 계산 (속도 변화의 표준편차)
    const speedVariance = strokeDistances.current.length > 1
      ? Math.sqrt(strokeDistances.current.reduce((sum, d, i) => {
          const speed = d / Math.max(strokeTimes.current[i] || 1, 1);
          return sum + Math.pow(speed - avgSpeed, 2);
        }, 0) / strokeDistances.current.length)
      : 0;
    const tremor = Math.min(100, speedVariance * 10);

    // 직선/곡선 비율 (각도 변화로 추정)
    const angleChanges = strokeAngles.current.length > 1
      ? strokeAngles.current.slice(1).map((angle, i) => 
          Math.abs(angle - strokeAngles.current[i]))
      : [];
    const avgAngleChange = angleChanges.length > 0
      ? angleChanges.reduce((a, b) => a + b, 0) / angleChanges.length
      : 0;
    const straightLineRatio = avgAngleChange < 10 ? 70 : Math.max(0, 70 - avgAngleChange);
    const curveLineRatio = 100 - straightLineRatio;

    // 3. 형태 (Shape) - 각도 변화로 추정
    const angularShapes = avgAngleChange > 30 ? Math.min(100, avgAngleChange * 2) : 0;
    const roundShapes = avgAngleChange < 15 ? Math.min(100, (15 - avgAngleChange) * 5) : 0;
    const brokenShapes = tremor > 40 ? tremor : 0;

    // 4. 구성 (Composition)
    const positions = strokePositions.current;
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const avgX = positions.length > 0
      ? positions.reduce((sum, p) => sum + p.x, 0) / positions.length
      : centerX;
    const avgY = positions.length > 0
      ? positions.reduce((sum, p) => sum + p.y, 0) / positions.length
      : centerY;
    
    const centroidDeviation = Math.min(100, 
      Math.sqrt(Math.pow(avgX - centerX, 2) + Math.pow(avgY - centerY, 2)) / 
      Math.max(rect.width, rect.height) * 200
    );

    // 대칭성 (좌우 분포 비교)
    const leftCount = positions.filter(p => p.x < centerX).length;
    const rightCount = positions.filter(p => p.x >= centerX).length;
    const symmetryScore = positions.length > 0
      ? Math.max(0, 100 - Math.abs(leftCount - rightCount) / positions.length * 100)
      : 50;

    // 5. 공간 사용률 (Space Density)
    const ctx = canvas.getContext('2d');
    let filledPixels = 0;
    if (ctx && canvas.width > 0 && canvas.height > 0) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const step = 4; // 성능을 위해 4픽셀마다 샘플링
      for (let i = 0; i < imageData.data.length; i += step * 4) {
        const alpha = imageData.data[i + 3];
        if (alpha > 0) filledPixels++;
      }
    }
    const totalSampledPixels = Math.floor((canvas.width * canvas.height) / 16);
    const canvasDensity = totalSampledPixels > 0
      ? Math.min(100, (filledPixels / totalSampledPixels) * 100)
      : 0;

    // 6. 압력 (Pressure) 변화
    const pressureVariance = pressureValues.current.length > 1
      ? Math.sqrt(pressureValues.current.reduce((sum, p) => {
          return sum + Math.pow(p - avgBrushSize, 2);
        }, 0) / pressureValues.current.length) / avgBrushSize * 100
      : 0;

    // 7. 반복 패턴 (유사한 거리/시간 패턴 감지)
    const repetitionScore = speedVariance < 2 && strokeCount.current > 5 ? 60 : 20;

    // 8. 경계 사용 (Border Interaction)
    const borderMargin = 20;
    const nearBorder = positions.filter(p => 
      p.x < borderMargin || p.x > rect.width - borderMargin ||
      p.y < borderMargin || p.y > rect.height - borderMargin
    ).length;
    const borderCrossing = positions.length > 0
      ? (nearBorder / positions.length) * 100
      : 0;

    // 9. 흐름 (Flow) 연속성
    const flowContinuity = tremor < 30 ? Math.max(0, 100 - tremor * 2) : Math.max(0, 100 - tremor);

    // 10. 방향성 (Direction)
    const upperHalf = positions.filter(p => p.y < centerY).length;
    const lowerHalf = positions.filter(p => p.y >= centerY).length;
    const upwardDirection = positions.length > 0 ? (upperHalf / positions.length) * 100 : 50;
    const downwardDirection = positions.length > 0 ? (lowerHalf / positions.length) * 100 : 50;
    const centerFocus = 100 - centroidDeviation;

    // ========== 11. 얼굴/표정 인식 (Face/Expression Detection) ==========
    const detectedFaces = detectFaces(ctx, canvas);

    // ========== 12. 이모지 인식 (Emoji Detection) ==========
    const detectedEmojis = detectEmojis(ctx, canvas, colorProps);

    // ========== 13. 사물 인식 (Object Detection) ==========
    const detectedObjects = detectObjects(ctx, canvas, colorProps);

    const analysis: DrawingAnalysis = {
      dominantColors: colorProps.slice(0, 3),
      averageBrightness: Math.round(avgBrightness),
      averageSaturation: Math.round(avgSaturation),
      colorContrast: Math.round(brightnessVariance),
      colorDiversity: colorArray.length,
      strokeSpeed: avgSpeed,
      strokePressure: avgBrushSize,
      strokeTremor: Math.round(tremor),
      straightLineRatio: Math.round(straightLineRatio),
      curveLineRatio: Math.round(curveLineRatio),
      angularShapes: Math.round(angularShapes),
      roundShapes: Math.round(roundShapes),
      brokenShapes: Math.round(brokenShapes),
      centroidDeviation: Math.round(centroidDeviation),
      symmetryScore: Math.round(symmetryScore),
      canvasDensity: Math.round(canvasDensity),
      pressureVariance: Math.round(pressureVariance),
      repetitionScore: Math.round(repetitionScore),
      borderCrossing: Math.round(borderCrossing),
      flowContinuity: Math.round(flowContinuity),
      upwardDirection: Math.round(upwardDirection),
      downwardDirection: Math.round(downwardDirection),
      centerFocus: Math.round(centerFocus),
      strokeCount: strokeCount.current,
      recentStrokes: strokeCount.current,
      detectedFaces: detectedFaces,
      detectedEmojis: detectedEmojis,
      detectedObjects: detectedObjects,
    };

    // 인식된 객체 요약 로그
    if (detectedObjects.length > 0) {
      console.log('✨ Quick Draw Recognition:', {
        total: detectedObjects.length,
        positive: detectedObjects.filter(o => o.emotion === 'positive').map(o => `${o.type} (${o.confidence}%)`),
        neutral: detectedObjects.filter(o => o.emotion === 'neutral').map(o => `${o.type} (${o.confidence}%)`),
        negative: detectedObjects.filter(o => o.emotion === 'negative').map(o => `${o.type} (${o.confidence}%)`)
      });
    }

    console.log('🎨 Drawing Analysis:', analysis);
    onDrawingAnalysis(analysis);
  };

// 5초마다 + 그림이 변경되었을 때만 분석
  const lastAnalyzedStrokeCount = useRef(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      // 스트로크가 추가되었을 때만 분석 (변경 감지)
      if (strokeCount.current > 0 && strokeCount.current !== lastAnalyzedStrokeCount.current) {
        sendAnalysis();
        lastAnalyzedStrokeCount.current = strokeCount.current;
      }
    }, 5000); // 5초마다

    return () => clearInterval(interval);
  }, [onDrawingAnalysis, brushSize]);

  // Helper function to render symbol recompose
  const renderSymbolRecompose = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0 || canvas.height === 0) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Create recompose canvas with same physical size as main canvas
    const recomposeCanvas = document.createElement('canvas');
    recomposeCanvas.width = canvas.width;
    recomposeCanvas.height = canvas.height;
    const recomposeCtx = recomposeCanvas.getContext('2d');
    if (!recomposeCtx) return null;

    // Apply same transform for logical coordinates
    recomposeCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // White background
    recomposeCtx.fillStyle = '#FFFFFF';
    recomposeCtx.fillRect(0, 0, rect.width, rect.height);

    // Black symbols
    recomposeCtx.fillStyle = '#000000';
    recomposeCtx.textAlign = 'center';
    recomposeCtx.textBaseline = 'middle';

    // Read main canvas pixels (in physical coordinates)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Calculate sample step based on density
    const baseStep = 6;
    const clampedDensity = Math.max(0.2, Math.min(1.5, symbolDensity));
    let step = Math.max(2, Math.min(18, Math.round(baseStep / clampedDensity)));

    // Count potential stamps
    let potentialStamps = 0;
    for (let y = 0; y < canvas.height; y += step) {
      for (let x = 0; x < canvas.width; x += step) {
        const i = (y * canvas.width + x) * 4;
        const alpha = data[i + 3];
        if (alpha > 30) {
          potentialStamps++;
        }
      }
    }

    // Cap at 30,000 stamps by adjusting step if needed
    const MAX_STAMPS = 30000;
    if (potentialStamps > MAX_STAMPS) {
      const scaleFactor = Math.sqrt(potentialStamps / MAX_STAMPS);
      step = Math.ceil(step * scaleFactor);
    }

    // Stamp symbols at ink pixels
    let stampCount = 0;
    for (let y = 0; y < canvas.height; y += step) {
      for (let x = 0; x < canvas.width; x += step) {
        const i = (y * canvas.width + x) * 4;
        const alpha = data[i + 3];
        
        // Treat alpha > 30 as "ink"
        if (alpha > 30) {
          if (stampCount >= MAX_STAMPS) break;
          
          // Convert physical to logical coordinates
          const logicalX = x / dpr;
          const logicalY = y / dpr;
          
          // Add jitter for organic feel
          const jitterX = (Math.random() - 0.5) * 3; // +/- 1.5px
          const jitterY = (Math.random() - 0.5) * 3;
          
          const finalX = logicalX + jitterX;
          const finalY = logicalY + jitterY;
          
          // Pick random symbol
          const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
          
          // Calculate font size
          const randomVariation = (Math.random() - 0.5) * 4; // +/- 2
          const fontSize = Math.max(6, Math.min(26, (brushSize * 0.55) * symbolScale + randomVariation));
          
          // Apply rotation (optional)
          const rotation = (Math.random() - 0.5) * 50 * (Math.PI / 180); // -25° to +25°
          
          recomposeCtx.save();
          recomposeCtx.translate(finalX, finalY);
          recomposeCtx.rotate(rotation);
          recomposeCtx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;
          recomposeCtx.fillText(symbol, 0, 0);
          recomposeCtx.restore();
          
          stampCount++;
        }
      }
      if (stampCount >= MAX_STAMPS) break;
    }

    console.log(`🔣 Symbol Recompose: ${stampCount} symbols stamped`);

    return recomposeCanvas.toDataURL('image/png');
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    restoreState: (state: { canvasData: string; stickers: PlacedSticker[] }) => {
      const canvas = canvasRef.current;
      const tempCanvas = tempCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      const tempCtx = tempCanvas?.getContext('2d');
      if (!ctx || !canvas) return;

      // Set restoring flag to prevent ResizeObserver from interfering
      isRestoringRef.current = true;

      // Restore canvas image
      if (state.canvasData) {
        const img = new Image();
        img.onload = () => {
          const dpr = window.devicePixelRatio || 1;
          
          // Reset transform to identity before drawing to avoid double scaling
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          
          // Clear canvas using physical pixel dimensions
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Draw restored image scaled to full canvas dimensions
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Re-apply DPR transform and restore drawing styles
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          // Clear temp canvas (preview layer)
          if (tempCtx && tempCanvas) {
            const rect = canvas.getBoundingClientRect();
            tempCtx.setTransform(1, 0, 0, 1, 0, 0);
            tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
            tempCtx.lineCap = 'round';
            tempCtx.lineJoin = 'round';
          }
          
          // Unset restoring flag
          isRestoringRef.current = false;
        };
        img.src = state.canvasData;
      } else {
        // If no canvas data, just clear
        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (tempCtx && tempCanvas) {
          tempCtx.setTransform(1, 0, 0, 1, 0, 0);
          tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
          tempCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
          tempCtx.lineCap = 'round';
          tempCtx.lineJoin = 'round';
        }
        
        isRestoringRef.current = false;
      }

      // Restore stickers
      setPlacedStickers(state.stickers || []);
    },
    saveState: () => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const canvasData = canvas.toDataURL();
      return { canvasData, stickers: placedStickers };
    },
    exportAsImage: () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return null;

      // Check if canvas has valid dimensions
      if (canvas.width === 0 || canvas.height === 0) return null;

      // Create a temporary canvas to combine drawing + stickers
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return null;

      // Draw white background
      tempCtx.fillStyle = '#FFFFFF';
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

      // Draw the main canvas
      tempCtx.drawImage(canvas, 0, 0);

      // Draw stickers on top
      placedStickers.forEach((sticker) => {
        // Check if it's an emoji
        const isEmoji = sticker.src.length <= 4 && !/^https?:\/\//.test(sticker.src) && !sticker.src.startsWith('figma:');
        
        if (isEmoji) {
          tempCtx.font = `${sticker.width * 0.7}px Arial`;
          tempCtx.textAlign = 'center';
          tempCtx.textBaseline = 'middle';
          tempCtx.fillText(sticker.src, sticker.x + sticker.width / 2, sticker.y + sticker.height / 2);
        }
      });

      return tempCanvas.toDataURL('image/png');
    },
    exportAsSymbolImage: () => {
      return renderSymbolRecompose();
    },
  }), [placedStickers, symbolDensity, symbolScale, brushSize]);

  // Track shift key state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'sticker',
    drop: (item: { src: string }, monitor) => {
      const offset = monitor.getClientOffset();
      const containerRect = containerRef.current?.getBoundingClientRect();
      
      if (offset && containerRect) {
        const x = offset.x - containerRect.left - 30; // Center the sticker (60px / 2)
        const y = offset.y - containerRect.top - 30;
        
        const newSticker: PlacedSticker = {
          id: `sticker-${Date.now()}-${Math.random()}`,
          src: item.src,
          x,
          y,
          width: 60,
          height: 60,
        };
        
        setPlacedStickers(prev => {
          const updated = [...prev, newSticker];
          // Save state after sticker placement
          if (onSaveState) {
            setTimeout(() => {
              const canvas = canvasRef.current;
              if (canvas) {
                const canvasData = canvas.toDataURL();
                onSaveState(canvasData, updated);
              }
            }, 0);
          }
          return updated;
        });
        setHasDrawn(true);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }), [onSaveState]);

  drop(containerRef);

  useEffect(() => {
    const canvas = canvasRef.current;
    const tempCanvas = tempCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !tempCanvas) return;
    
    const ctx = canvas.getContext('2d');
    const tempCtx = tempCanvas.getContext('2d');
    if (!ctx || !tempCtx) return;
    
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas size with device pixel ratio
    const setCanvasSize = () => {
      const rect = container.getBoundingClientRect();
      
      // Guard against zero sizes
      if (rect.width === 0 || rect.height === 0) return;
      
      // Save current drawing before resize
      const imageData = canvas.width > 0 && canvas.height > 0 
        ? ctx.getImageData(0, 0, canvas.width, canvas.height) 
        : null;
      
      // Set main canvas internal size using device pixel ratio
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      // Set main canvas CSS size
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      
      // Apply transform and restore styles for main canvas
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Set temp canvas size (for shape preview) - sync with main canvas
      tempCanvas.width = rect.width * dpr;
      tempCanvas.height = rect.height * dpr;
      tempCanvas.style.width = `${rect.width}px`;
      tempCanvas.style.height = `${rect.height}px`;
      
      // Apply transform and restore styles for temp canvas
      tempCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      tempCtx.lineCap = 'round';
      tempCtx.lineJoin = 'round';
      
      // Restore drawing if it existed
      if (imageData) {
        ctx.putImageData(imageData, 0, 0);
      }
    };
    
    // Try immediately
    setCanvasSize();
    
    // Also try after a short delay
    const timeout = setTimeout(setCanvasSize, 100);
    
    // Use ResizeObserver for reliable resize handling
    const resizeObserver = new ResizeObserver(() => {
      // Exit early if we're restoring history to prevent interference
      if (isRestoringRef.current) return;
      setCanvasSize();
    });
    
    resizeObserver.observe(container);
    
    return () => {
      clearTimeout(timeout);
      resizeObserver.disconnect();
    };
  }, []);

  const floodFill = (startX: number, startY: number, fillColor: string) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas || canvas.width === 0 || canvas.height === 0) return;

    // Convert logical coordinates to physical pixels
    const dpr = window.devicePixelRatio || 1;
    const physicalX = Math.floor(startX * dpr);
    const physicalY = Math.floor(startY * dpr);

    // Clamp coordinates to canvas bounds
    const clampedX = Math.max(0, Math.min(canvas.width - 1, physicalX));
    const clampedY = Math.max(0, Math.min(canvas.height - 1, physicalY));

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const targetColor = getPixelColor(imageData, clampedX, clampedY);
    const fillColorRgb = hexToRgb(fillColor);
    
    if (colorsMatch(targetColor, fillColorRgb)) return;

    const pixelsToCheck = [[clampedX, clampedY]];
    const checkedPixels = new Set<string>();

    while (pixelsToCheck.length > 0) {
      const [x, y] = pixelsToCheck.pop()!;
      const key = `${x},${y}`;
      
      if (checkedPixels.has(key)) continue;
      if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;
      
      checkedPixels.add(key);
      const currentColor = getPixelColor(imageData, x, y);
      
      if (colorsMatch(currentColor, targetColor)) {
        setPixelColor(imageData, x, y, fillColorRgb);
        pixelsToCheck.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
    }

    ctx.putImageData(imageData, 0, 0);
  };

  const getPixelColor = (imageData: ImageData, x: number, y: number) => {
    const index = (Math.floor(y) * imageData.width + Math.floor(x)) * 4;
    return [
      imageData.data[index],
      imageData.data[index + 1],
      imageData.data[index + 2],
      imageData.data[index + 3]
    ];
  };

  const setPixelColor = (imageData: ImageData, x: number, y: number, color: number[]) => {
    const index = (Math.floor(y) * imageData.width + Math.floor(x)) * 4;
    imageData.data[index] = color[0];
    imageData.data[index + 1] = color[1];
    imageData.data[index + 2] = color[2];
    imageData.data[index + 3] = 255;
  };

  const hexToRgb = (hex: string): number[] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16),
      255
    ] : [0, 0, 0, 255];
  };

  const colorsMatch = (a: number[], b: number[]) => {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
  };

  const getPixelColorFromCanvas = (x: number, y: number): string => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas || canvas.width === 0 || canvas.height === 0) return '#000000';

    // Convert logical coordinates to physical pixels for getImageData
    const dpr = window.devicePixelRatio || 1;
    const physicalX = Math.floor(x * dpr);
    const physicalY = Math.floor(y * dpr);

    // Clamp coordinates to canvas bounds
    const clampedX = Math.max(0, Math.min(canvas.width - 1, physicalX));
    const clampedY = Math.max(0, Math.min(canvas.height - 1, physicalY));

    const imageData = ctx.getImageData(clampedX, clampedY, 1, 1);
    const [r, g, b] = imageData.data;
    
    // Convert RGB to hex
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    // Capture pointer for reliable tracking
    e.currentTarget.setPointerCapture(e.pointerId);

    const { x, y } = getCanvasPoint(e.clientX, e.clientY);

   // 🆕 스티커 배치 모드 - 최우선 처리
    if (tool === 'sticker' && pendingSticker) {
      setIsDraggingSticker(true);
      setStickerStart({ x, y });
      setStickerPreview({ x, y, size: 60 }); // 기본 크기를 60으로
      setHasDrawn(true);
      return;
    }

    // Handle eyedropper tool
    if (tool === 'eyedropper') {
      const pickedColor = getPixelColorFromCanvas(x, y);
      if (onColorPick) {
        onColorPick(pickedColor);
      }
      return;
    }

    setHasDrawn(true);

    // Handle fill tool separately
    if (tool === 'fill') {
      floodFill(x, y, color);
      // Save state after fill
      if (onSaveState) {
        setTimeout(() => {
          const canvasData = canvas.toDataURL();
          onSaveState(canvasData, placedStickers);
        }, 0);
      }
      return;
    }

    // Handle shape tool
    if (tool === 'shape') {
      setIsDrawing(true);
      setShapeStartPos({ x, y });
      return;
    }

    setIsDrawing(true);
    setLastPos({ x, y });
    
    ctx.beginPath();
    ctx.moveTo(x, y);

    // Start tracking stroke
    strokeStartTime.current = Date.now();
    strokeDistances.current = [];
    strokeTimes.current = [];
    brushSizes.current = [];
    usedColors.current.add(color);
    strokeCount.current++;
  };

const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const { x, y } = getCanvasPoint(e.clientX, e.clientY);

    // 🆕 스티커 드래그 중 - 크기 계산 (isDrawing 체크 전에 먼저!)
    if (isDraggingSticker && stickerStart) {
      const dx = x - stickerStart.x;
      const dy = y - stickerStart.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const size = Math.max(40, Math.min(300, distance * 2)); // 40~300px

      setStickerPreview({ x: stickerStart.x, y: stickerStart.y, size });
      return;
    }

    // 🆕 스티커 배치 모드에서 마우스만 따라다님
    if (tool === 'sticker' && pendingSticker && !isDraggingSticker) {
      setStickerPreview({ x, y, size: 40 });
      return;
    }

    // 이제 다른 도구들 체크
    if (!isDrawing || tool === 'fill' || tool === 'eyedropper') return;

    // Handle shape drawing
    if (tool === 'shape') {
      drawShape(e);
      return;
    }

    // Track drawing metrics for emotion analysis
    const distance = Math.sqrt((x - lastPos.x) ** 2 + (y - lastPos.y) ** 2);
    const timeDiff = Date.now() - strokeStartTime.current;
    
    if (distance > 0) {
      strokeDistances.current.push(distance);
      strokeTimes.current.push(timeDiff);
      brushSizes.current.push(brushSize);
      pressureValues.current.push(brushSize);
      usedColors.current.add(color);
      strokePositions.current.push({ x, y });
      
      // Calculate angle for line direction
      const angle = Math.atan2(y - lastPos.y, x - lastPos.x) * (180 / Math.PI);
      strokeAngles.current.push(angle);
    }

    // Different effects for each tool
    if (tool === 'pencil') {
      // Pencil: Sharp, precise lines
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = brushSize * 0.5;
      ctx.strokeStyle = color;
      ctx.globalAlpha = 1;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(lastPos.x, lastPos.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      setLastPos({ x, y });
    } else if (tool === 'brush') {
      // Brush: Soft, textured strokes with varying opacity
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Draw multiple overlapping circles for soft brush effect
      const distance = Math.sqrt((x - lastPos.x) ** 2 + (y - lastPos.y) ** 2);
      const steps = Math.max(1, Math.floor(distance / 2));
      
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const cx = lastPos.x + (x - lastPos.x) * t;
        const cy = lastPos.y + (y - lastPos.y) * t;
        
        ctx.globalAlpha = 0.15 + Math.random() * 0.1;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      
      setLastPos({ x, y });
    } else if (tool === 'eraser') {
      // Eraser: Clean removal
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = brushSize;
      ctx.globalAlpha = 1;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineTo(x, y);
      ctx.stroke();
      setLastPos({ x, y });
    }
  };

const stopDrawing = () => {
    // 🆕 스티커 배치 완료
    if (isDraggingSticker && stickerPreview && pendingSticker) {
      // 스티커 시작점을 중심으로 배치
      const newSticker: PlacedSticker = {
        id: `sticker-${Date.now()}`,
        src: pendingSticker,
        x: stickerPreview.x - stickerPreview.size / 2,
        y: stickerPreview.y - stickerPreview.size / 2,
        width: stickerPreview.size,
        height: stickerPreview.size,
      };

      setPlacedStickers(prev => {
        const updated = [...prev, newSticker];
        // Save state after sticker placement
        if (onSaveState) {
          setTimeout(() => {
            const canvas = canvasRef.current;
            if (canvas) {
              const canvasData = canvas.toDataURL();
              onSaveState(canvasData, updated);
            }
          }, 0);
        }
        return updated;
      });
      
      // 리셋
      setIsDraggingSticker(false);
      setStickerStart(null);
      setStickerPreview(null);
      setHasDrawn(true);
      
      // 부모에게 알림
      onStickerPlaced?.();
      
      return;
    }

    if (tool === 'shape' && isDrawing) {
      finalizeShape();
    }
    if (isDrawing) {
      onStrokeEnd?.();
    }
    setIsDrawing(false);

    // Save state after drawing
    if (isDrawing && onSaveState) {
      const canvas = canvasRef.current;
      if (canvas) {
        const canvasData = canvas.toDataURL();
        onSaveState(canvasData, placedStickers);
      }
    }
  };

  const getCursorClass = () => {
    switch(tool) {
      case 'pencil': return 'cursor-crosshair';
      case 'brush': return 'cursor-pointer';
      case 'eraser': return 'cursor-not-allowed';
      case 'fill': return 'cursor-cell';
      case 'eyedropper': return 'cursor-copy';
      default: return 'cursor-crosshair';
    }
  };

  const drawShape = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const { x, y } = getCanvasPoint(e.clientX, e.clientY);

    // Draw shape on a temporary canvas
    const tempCanvas = tempCanvasRef.current;
    const tempCtx = tempCanvas?.getContext('2d');
    if (!tempCtx || !tempCanvas) return;

    // Clear the temp canvas in CSS pixel space (transform is already set up in useEffect)
    const rect = canvas.getBoundingClientRect();
    tempCtx.clearRect(0, 0, rect.width, rect.height);

    // Set drawing styles (lineCap/lineJoin already set in setCanvasSize)
    tempCtx.strokeStyle = color;
    tempCtx.lineWidth = brushSize * 0.5;

    if (selectedShape === 'circle') {
      let radius = Math.sqrt((x - shapeStartPos.x) ** 2 + (y - shapeStartPos.y) ** 2);
      
      // If shift is pressed, use the larger of width or height to make it a perfect circle
      if (isShiftPressed) {
        radius = Math.max(Math.abs(x - shapeStartPos.x), Math.abs(y - shapeStartPos.y));
      }
      
      tempCtx.beginPath();
      tempCtx.arc(shapeStartPos.x, shapeStartPos.y, radius, 0, Math.PI * 2);
      tempCtx.stroke();
    } else if (selectedShape === 'rectangle') {
      let width = x - shapeStartPos.x;
      let height = y - shapeStartPos.y;
      
      // If shift is pressed, make it a square
      if (isShiftPressed) {
        const size = Math.max(Math.abs(width), Math.abs(height));
        width = width >= 0 ? size : -size;
        height = height >= 0 ? size : -size;
      }
      
      tempCtx.beginPath();
      tempCtx.rect(shapeStartPos.x, shapeStartPos.y, width, height);
      tempCtx.stroke();
    } else if (selectedShape === 'line') {
      tempCtx.beginPath();
      tempCtx.moveTo(shapeStartPos.x, shapeStartPos.y);
      tempCtx.lineTo(x, y);
      tempCtx.stroke();
    } else if (selectedShape === 'triangle') {
      const width = x - shapeStartPos.x;
      const height = y - shapeStartPos.y;
      tempCtx.beginPath();
      tempCtx.moveTo(shapeStartPos.x + width / 2, shapeStartPos.y);
      tempCtx.lineTo(shapeStartPos.x, shapeStartPos.y + height);
      tempCtx.lineTo(shapeStartPos.x + width, shapeStartPos.y + height);
      tempCtx.closePath();
      tempCtx.stroke();
    }
  };

const finalizeShape = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const tempCanvas = tempCanvasRef.current;
    const tempCtx = tempCanvas?.getContext('2d');
    if (!tempCtx || !tempCanvas) return;

    // Commit temp canvas to main canvas in device-pixel space
    // to avoid double-scaling (since both are already scaled by dpr)
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Identity transform
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.restore();

    // Clear temp canvas in identity space
    tempCtx.save();
    tempCtx.setTransform(1, 0, 0, 1, 0, 0);
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.restore();
  };

// 🆕 스티커 프리뷰 렌더링
  useEffect(() => {
    const tempCanvas = tempCanvasRef.current;
    const tempCtx = tempCanvas?.getContext('2d');
    const canvas = canvasRef.current;
    
    if (!tempCtx || !tempCanvas || !canvas) return;

    const rect = canvas.getBoundingClientRect();

    // 항상 temp canvas를 clear (중요!)
    tempCtx.save();
    tempCtx.setTransform(1, 0, 0, 1, 0, 0); // identity transform
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.restore();

    // 스티커가 없으면 여기서 종료
    if (!stickerPreview || !pendingSticker) return;

    // 스티커 프리뷰 그리기
    tempCtx.save();
    tempCtx.font = `${stickerPreview.size}px Arial`;
    tempCtx.textAlign = 'center';
    tempCtx.textBaseline = 'middle';
    
    // 반투명 효과
    tempCtx.globalAlpha = 0.7;
    tempCtx.fillText(pendingSticker, stickerPreview.x, stickerPreview.y);
    
    // 드래그 중일 때 크기 표시
    if (isDraggingSticker && stickerStart) {
      tempCtx.globalAlpha = 0.5;
      tempCtx.strokeStyle = '#3B82F6';
      tempCtx.lineWidth = 2;
      tempCtx.setLineDash([5, 5]);
      tempCtx.strokeRect(
        stickerPreview.x - stickerPreview.size / 2,
        stickerPreview.y - stickerPreview.size / 2,
        stickerPreview.size,
        stickerPreview.size
      );
    }
    
tempCtx.restore();
  }, [stickerPreview, pendingSticker, isDraggingSticker, stickerStart, tool]); // tool 추가

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full bg-white rounded-lg border border-neutral-200 overflow-hidden ${
        isOver ? 'border-blue-400 border-2' : ''
      }`}
    >
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full ${getCursorClass()}`}
        style={{ touchAction: 'none' }}
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerLeave={stopDrawing}
      />
      
      {/* Temporary canvas for shape preview */}
      <canvas
        ref={tempCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      
      {/* Placed Stickers */}
      {placedStickers.map((sticker) => {
        // Check if src is an emoji (single character or emoji)
        const isEmoji = sticker.src.length <= 4 && !/^https?:\/\//.test(sticker.src) && !sticker.src.startsWith('figma:');
        
        return (
          <motion.div
            key={sticker.id}
            className="absolute pointer-events-none"
            style={{
              left: sticker.x,
              top: sticker.y,
              width: sticker.width,
              height: sticker.height,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            {isEmoji ? (
              <span 
                className="w-full h-full flex items-center justify-center select-none"
                style={{ fontSize: `${sticker.width * 0.7}px` }}
                role="img" 
                aria-label="Placed sticker"
              >
                {sticker.src}
              </span>
            ) : (
              <img 
                src={sticker.src} 
                alt="Placed sticker" 
                className="w-full h-full object-contain"
                draggable={false}
              />
            )}
          </motion.div>
        );
      })}
      
      {!hasDrawn && (
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0.5 }}
        >
          <svg className="w-9 h-9 text-neutral-400 mb-3" fill="none" viewBox="0 0 35 35">
            <path d="M27.3868 15.4189L28.141 14.6646L25.8782 12.4019L21.7332 8.25681L19.4704 5.99406L18.7162 6.74831L17.2077 8.25681L3.91146 21.553C3.21728 22.2472 2.71 23.1083 2.42966 24.0494L0.0667763 32.0859C-0.100094 32.6466 0.0534266 33.254 0.473939 33.6678C0.894452 34.0816 1.49518 34.2352 2.05587 34.075L10.0857 31.7121C11.0268 31.4317 11.8879 30.9244 12.582 30.2303L25.8782 16.9341L27.3868 15.4189ZM10.6797 26.6592L10.0723 28.1744C9.80532 28.3813 9.50495 28.5349 9.18456 28.635L3.96486 30.1702L5.50007 24.9572C5.59352 24.6301 5.75371 24.3297 5.96063 24.0694L7.47581 23.462V25.598C7.47581 26.1853 7.9564 26.6659 8.54378 26.6659H10.6797V26.6592ZM24.2095 1.24827L23.2484 2.21612L21.7399 3.72462L20.9789 4.47887L23.2417 6.74163L27.3868 10.8867L29.6495 13.1494L30.4038 12.3952L31.9123 10.8867L32.8801 9.91884C34.5488 8.25014 34.5488 5.54684 32.8801 3.87814L30.2569 1.24827C28.5882 -0.420431 25.8849 -0.420431 24.2162 1.24827H24.2095ZM21.0457 12.4619L11.434 22.0737C11.0201 22.4875 10.3393 22.4875 9.92546 22.0737C9.51163 21.6598 9.51163 20.979 9.92546 20.5652L19.5372 10.9534C19.951 10.5396 20.6319 10.5396 21.0457 10.9534C21.4595 11.3673 21.4595 12.0481 21.0457 12.4619Z" fill="currentColor"/>
          </svg>
          <p className="text-neutral-400">여기에 그림을 그려보세요</p>
          <p className="text-neutral-400 text-sm mt-1">사이드바의 도구를 사용하거나 스티커를 드래그하세요</p>
        </motion.div>
      )}
    </div>
  );
});