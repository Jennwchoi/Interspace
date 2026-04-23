import { useRef, useEffect, useState } from "react";

interface ColorWheelProps {
  color: string;
  onChange: (color: string) => void;
}

export function ColorWheel({ color, onChange }: ColorWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'hue' | 'sb' | null>(null);
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [brightness, setBrightness] = useState(100);
  const animationFrameRef = useRef<number | null>(null);

  // Convert hex to HSV
  useEffect(() => {
    const hsv = hexToHSV(color);
    setHue(hsv.h);
    setSaturation(hsv.s);
    setBrightness(hsv.v);
  }, [color]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Draw color wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const centerX = size / 2;
    const centerY = size / 2;
    const outerRadius = size / 2 - 2;
    const innerRadius = outerRadius * 0.25;

    ctx.clearRect(0, 0, size, size);

    // Enable anti-aliasing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw outer hue ring (thinner)
    for (let angle = 0; angle < 360; angle += 0.5) {
      const startAngle = (angle - 90) * Math.PI / 180;
      const endAngle = (angle + 0.5 - 90) * Math.PI / 180;

      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
      ctx.arc(centerX, centerY, outerRadius * 0.88, endAngle, startAngle, true);
      ctx.closePath();

      ctx.fillStyle = `hsl(${angle}, 100%, 50%)`;
      ctx.fill();
    }

    // Add subtle outer shadow to the ring
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw inner saturation/brightness gradient
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, outerRadius * 0.82);
    gradient.addColorStop(0, `hsl(${hue}, 0%, 100%)`);
    gradient.addColorStop(1, `hsl(${hue}, 100%, 50%)`);

    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius * 0.82, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Add brightness overlay
    const brightnessGradient = ctx.createLinearGradient(centerX, centerY - outerRadius * 0.82, centerX, centerY + outerRadius * 0.82);
    brightnessGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    brightnessGradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');

    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius * 0.82, 0, Math.PI * 2);
    ctx.fillStyle = brightnessGradient;
    ctx.fill();

    // Draw center preview circle with shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = hsvToHex(hue, saturation, brightness);
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Draw hue indicator with shadow (centered in the thinner ring)
    // Reverse the angle for display to match the reversed interaction
    const displayHue = (360 - hue) % 360;
    const hueAngle = (displayHue - 90) * Math.PI / 180;
    const hueX = centerX + Math.cos(hueAngle) * outerRadius * 0.94;
    const hueY = centerY + Math.sin(hueAngle) * outerRadius * 0.94;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1;

    ctx.beginPath();
    ctx.arc(hueX, hueY, 7, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Draw saturation/brightness indicator
    const maxRadius = outerRadius * 0.82;
    const satDistance = (saturation / 100) * maxRadius;
    const brightnessFactor = (brightness / 100);
    const angle = 0; // We'll use vertical movement for brightness
    
    const sbX = centerX + Math.cos(angle) * satDistance;
    const sbY = centerY - (brightnessFactor - 0.5) * maxRadius * 2;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1;

    ctx.beginPath();
    ctx.arc(sbX, sbY, 7, 0, Math.PI * 2);
    ctx.fillStyle = hsvToHex(hue, saturation, brightness);
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }, [hue, saturation, brightness]);

  const handleInteraction = (e: React.MouseEvent<HTMLCanvasElement>, forceMode?: 'hue' | 'sb' | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      const size = canvas.width;
      const centerX = size / 2;
      const centerY = size / 2;
      const outerRadius = size / 2 - 2;

      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;

      const mode = forceMode || dragMode;

      // Check if on outer ring (hue) - thinner ring
      if (mode === 'hue' || (!mode && distance > outerRadius * 0.86 && distance <= outerRadius)) {
        let newHue = (angle + 360) % 360;
        // Reverse the hue direction to match standard color wheels
        newHue = (360 - newHue) % 360;
        setHue(newHue);
        onChange(hsvToHex(newHue, saturation, brightness));
      }
      // Check if on inner circle (saturation/brightness)
      else if (mode === 'sb' || (!mode && distance < outerRadius * 0.82)) {
        const maxRadius = outerRadius * 0.82;
        const newSaturation = Math.min(100, (distance / maxRadius) * 100);
        
        // Brightness based on vertical position (top = bright, bottom = dark)
        const normalizedY = (dy + maxRadius) / (maxRadius * 2);
        const newBrightness = Math.max(0, Math.min(100, normalizedY * 100));

        setSaturation(newSaturation);
        setBrightness(newBrightness);
        onChange(hsvToHex(hue, newSaturation, newBrightness));
      }
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const size = canvas.width;
    const centerX = size / 2;
    const centerY = size / 2;
    const outerRadius = size / 2 - 2;

    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Determine which area was clicked
    if (distance > outerRadius * 0.86 && distance <= outerRadius) {
      setDragMode('hue');
    } else if (distance < outerRadius * 0.82) {
      setDragMode('sb');
    }

    setIsDragging(true);
    handleInteraction(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      handleInteraction(e, dragMode);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragMode(null);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  return (
    <div className="relative w-full aspect-square">
      <canvas
        ref={canvasRef}
        width={280}
        height={280}
        className="w-full h-full cursor-crosshair rounded-xl shadow-sm"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-neutral-500 bg-white/90 backdrop-blur-sm px-2 py-1 rounded">
        {hsvToHex(hue, saturation, brightness)}
      </div>
    </div>
  );
}

// Helper functions
function hexToHSV(hex: string): { h: number; s: number; v: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;

  let h = 0;
  if (diff !== 0) {
    if (max === r) {
      h = 60 * (((g - b) / diff) % 6);
    } else if (max === g) {
      h = 60 * ((b - r) / diff + 2);
    } else {
      h = 60 * ((r - g) / diff + 4);
    }
  }
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : (diff / max) * 100;
  const v = max * 100;

  return { h, s, v };
}

function hsvToHex(h: number, s: number, v: number): string {
  s = s / 100;
  v = v / 100;

  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else if (h >= 300 && h < 360) {
    r = c; g = 0; b = x;
  }

  const rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0');
  const gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0');
  const bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
}
