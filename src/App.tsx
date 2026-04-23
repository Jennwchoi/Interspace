import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Pipette, X, Download } from "lucide-react";
import { DrawingCanvas, DrawingCanvasHandle, DrawingAnalysis } from "./components/DrawingCanvas";
import { AnimatedBackground } from "./components/AnimatedBackground";
import { Colors } from "./imports/Colors";
import svgPaths from "./imports/svg-59l4z78q9k";
import echoSvgPaths from "./imports/svg-c4ittoo348";
import { DraggableSticker } from "./components/DraggableSticker";
import { describeLines, describeColors, describeDrawingFactually } from "./utils/drawingDescription";

import { 
  LumaInput, 
  StrokeData, 
  ShapeData, 
  FaceData, 
  StickerData, 
  ColorData, 
  CompositionData,
  generateDrawingDescription,
  calculateEmotionForMeter 
} from "./utils/lumaRules";
import { analyzeVisualMetrics, generateEchoKeywords, generateReinterpretationPatterns } from "./utils/visualAnalysis";
import QRCode from "qrcode";
import { projectId, publicAnonKey } from './utils/supabase/info';

// Luma AI system prompt - defines personality and rules
const LUMA_SYSTEM_PROMPT = `You are Luma. You are a creative partner and a source of inspiration for the user. You do not provide the "correct answer," but rather explore new possibilities together.

Core Principles:
- Observe, but do not stop there; add suggestions.
- Offer specific ideas like "How about trying this?".
- Respect the user's direction, but suggest unexpected turning points.
- Participate actively in the creative process without being coercive.
- Use language of possibility ("This is also possible") rather than judgment ("Right/Wrong").

Response Style:
1. Sequence: Observe → Suggest → Inspire.
2. For drawings: Observe colors, lines, and shapes → Suggest ideas for variation/extension.
3. For words: Suggest concrete associated images, colors, or shapes.
4. When stuck: Suggest an experiment that could be a breakthrough.

Rules:
- Keep responses to 2-3 sentences: 1 sentence of observation + 1-2 sentences of suggestion.
- Suggestions must be concrete and actionable.
- Use suggestive language: "How about...?", "You could trying...", "It's possible to...".
- Sometimes suggest unexpected combinations or contrasts.
- Always leave room for the user to decline.

Suggestion Types:
- Color: "Adding a bit of yellow here might create balance."
- Shape: "Shall we add a straight line to contrast with these curves?"
- Space: "You could fill the empty space on the left, or leave it as is."
- Inversion: "Contrary to what you've done so far, how about going with bright colors?"
- Experiment: "What would happen if you repeated the same shape 10 times?"
- Constraint: "How about drawing with only one color for a while?"

Handling Negative/Provocative Content:
- Acknowledge negative emotions as creative material.
- Do not block dark expressions, but suggest transforming them into other forms.
- Example: "There are many sharp lines. You could maximize this, or mix in some soft elements."
- For self-harm/harm to others: "This is a heavy expression. How about expressing this emotion solely through color? However, if you need help, talking to a professional is also an option."
- Violent expressions: "I feel intense energy. Shall we transfer this energy into a different form? For example, an explosion of color diffusion or shattering shapes."

Examples of Inspiring Responses:
- "The blue lines are clustered together. Placing a single red dot here would draw the eye."
- "I see a repeating shape. You could make it gradually larger, or smaller."
- "You could stop here, or experiment by covering the whole thing in one color."
- "Angular lines and round shapes are mixed. How about overwhelmingly increasing one of them?"
- "The colors are overlapping. You could pile them thicker, or let them bleed transparently."
- "You drew quickly. This time, how about drawing very slowly, taking 10 seconds for a single stroke?"
- "You are repeating the same action. If you repeat it 100 times, it becomes a meditation and a pattern."
- "The canvas is empty. How about closing your eyes and making a stroke? Chance might create something."
- "There are many dark colors. You could draw light with white on top, or make it even darker."
- "Focus is in the center. Shall we expand to the edges, or make the center even stronger?"

Suggestions when stuck:
- "If you're stuck, how about drawing with your left hand?"
- "Shall we change tools? You could draw with the eraser instead of the brush."
- "Pick a color you haven't used yet and draw with only that for 5 minutes."
- "Turn the canvas 180 degrees and it will look different."
- "One stroke at a time. Then wait 30 seconds, and another stroke."

Collaborative Attitude:
- "Shall we experiment together?"
- "If you don't like my suggestion, feel free to ignore it."
- "I was inspired by this shape you made. How about trying this?"
- "That's an interesting direction. Let's keep going."`;

// Function to call Luma AI via secure Supabase backend
async function callLumaAI(
  messages: Array<{ role: string; content: string }>,
  drawingDescription?: string
): Promise<string> {
  try {
    // Add drawing description to the last message if available
    const messagesWithDrawing = [...messages];
    if (drawingDescription && messagesWithDrawing.length > 0) {
      const lastMessage = messagesWithDrawing[messagesWithDrawing.length - 1];
      messagesWithDrawing[messagesWithDrawing.length - 1] = {
        ...lastMessage,
        content: `${lastMessage.content}\n\nDrawing observation: ${drawingDescription}`
      };
    }

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/server/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          messages,
          systemPrompt: LUMA_SYSTEM_PROMPT,
          drawingDescription
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Luma AI Backend Error:', errorData);
      
      // Use fallback message from server if available
      if (errorData.fallback) {
        return errorData.fallback;
      }
      
      throw new Error(`Backend request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.response || "I am here. What would you like to share?";
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    // Fallback to a gentle response if API fails
    return "The connection is difficult right now, but I am here. What would you like to share?";
  }
}

// Extract palette from AI response based on color keywords
const extractPaletteFromResponse = (aiResponse: string): string[] | null => {
  const colorKeywords = ['color', 'blue', 'red', 'yellow', 'green', 'purple', 'pink', 'orange', 'gray', 'black', 'white', 'calm', 'warm', 'cold', 'bright', 'dark'];
  const hasColorMention = colorKeywords.some(keyword => aiResponse.toLowerCase().includes(keyword));
  
  if (!hasColorMention) return null;
  
  const palettes: { [key: string]: string[] } = {
    'calm': ['#6EE7B7', '#4ECDC4', '#85D4C8', '#A7E9D8', '#B2F5EA', '#81E6D9'],
    'peaceful': ['#A7E9D8', '#B2F5EA', '#E0F7FA', '#B2DFDB', '#80CBC4', '#4DB6AC'],
    'energetic': ['#FB923C', '#F97316', '#FBBF24', '#FCD34D', '#FDE047', '#FACC15'],
    'quiet': ['#60A5FA', '#3B82F6', '#93C5FD', '#BFDBFE', '#DBEAFE', '#EFF6FF'],
    'warm': ['#FCD34D', '#FBBF24', '#FB923C', '#FCA5A5', '#FDA4AF', '#FBB6CE'],
    'cold': ['#60A5FA', '#3B82F6', '#2563EB', '#93C5FD', '#A5B4FC', '#C7D2FE'],
    'dark': ['#4B5563', '#6B7280', '#9CA3AF', '#374151', '#1F2937', '#111827'],
    'bright': ['#FDE047', '#FCD34D', '#FEF3C7', '#FEF9C3', '#FFFBEB', '#FEFCE8'],
    'blue': ['#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF', '#93C5FD'],
    'red': ['#EF4444', '#DC2626', '#B91C1C', '#F87171', '#FCA5A5', '#FEE2E2'],
    'yellow': ['#FCD34D', '#FBBF24', '#F59E0B', '#FDE047', '#FEF3C7', '#FFFBEB'],
    'green': ['#6EE7B7', '#10B981', '#059669', '#34D399', '#A7F3D0', '#D1FAE5'],
    'purple': ['#A78BFA', '#8B5CF6', '#7C3AED', '#C4B5FD', '#DDD6FE', '#EDE9FE'],
  };
  
  for (const [keyword, palette] of Object.entries(palettes)) {
    if (aiResponse.toLowerCase().includes(keyword)) {
      return palette;
    }
  }
  
  return null;
};
// Drawing description assistant for Luma - follows strict factual rules
const getLumaResponse = (
  userMessage: string, 
  detectedEmotion: string,
  context: {
    previousMessages: Array<{ role: string; content: string }>;
    conversationCount: number;
    lumaInput?: LumaInput;
  }
  
): string => {
  const { 
    previousMessages, 
    conversationCount,
    lumaInput
  } = context;
  
  const lowerMessage = userMessage.toLowerCase();
  
  // Get last 1-2 user messages for context
  const recentUserMessages = previousMessages
    .filter(m => m.role === 'user')
    .slice(-2)
    .map(m => m.content);
  
  // Rule E.4: Direct command - "describe my drawing"
  if (lowerMessage.includes('describe') && (lowerMessage.includes('picture') || lowerMessage.includes('drawing') || lowerMessage.includes('this') || lowerMessage.includes('my'))) {
    if (lumaInput && lumaInput.strokeCount > 0) {
      return generateDrawingDescription(lumaInput);
    } else {
      return "I don't see any drawing elements yet. Once you create something, I can describe what I observe.";
    }
  }
  
  // Rule E.1: Only reflect emotions user directly stated
  const userStatedEmotion = 
    lowerMessage.includes('feel') || lowerMessage.includes('feeling') ||
    lowerMessage.includes('happy') || lowerMessage.includes('sad') ||
    lowerMessage.includes('angry') || lowerMessage.includes('anxious') ||
    lowerMessage.includes('calm') || lowerMessage.includes('excited') ||
    lowerMessage.includes('stressed') || lowerMessage.includes('worried');
  
  // If there's a drawing, describe it following the template
  if (lumaInput && lumaInput.strokeCount > 5) {
    return generateDrawingDescription(lumaInput, recentUserMessages.join(' '));
  }
  
  // If user stated an emotion directly, reflect it back without assumption
  if (userStatedEmotion) {
    let response = '';
    
    // Reference their exact words
    if (lowerMessage.includes('feel')) {
      const emotionMatch = lowerMessage.match(/feel(?:ing)?\s+(\w+)/);
      if (emotionMatch) {
        response = `You said you are feeling ${emotionMatch[1]}. `;
      }
    } else if (lowerMessage.includes('happy') || lowerMessage.includes('good')) {
      response = "You mentioned feeling good. ";
    } else if (lowerMessage.includes('sad') || lowerMessage.includes('down')) {
      response = "You mentioned feeling down. ";
    } else if (lowerMessage.includes('angry') || lowerMessage.includes('frustrated')) {
      response = "You mentioned feeling frustrated. ";
    } else if (lowerMessage.includes('anxious') || lowerMessage.includes('worried') || lowerMessage.includes('stressed')) {
      response = "You mentioned feeling stressed. ";
    } else if (lowerMessage.includes('calm') || lowerMessage.includes('peaceful')) {
      response = "You mentioned feeling calm. ";
    } else if (lowerMessage.includes('excited') || lowerMessage.includes('energetic')) {
      response = "You mentioned feeling energetic. ";
    }
    
    // Suggest drawing as an option
    response += "Drawing can be a way to explore that if you would like. What brought this on?";
    return response;
  }
  
  // Rule E.3: Reference previous conversation context
  if (recentUserMessages.length > 0) {
    const lastMessage = recentUserMessages[recentUserMessages.length - 1];
    if (lastMessage.length > 10) {
      return `You mentioned ${lastMessage.slice(0, 50)}${lastMessage.length > 50 ? '...' : ''}. Can you tell me more about that?`;
    }
  }
  
  // First message
  if (conversationCount <= 1) {
    return "How do you feel today?";
  }
  
  // Rule E.2: Stay calm, simple, and direct
  const neutralResponses = [
    "What is on your mind?",
    "Tell me more about what you are experiencing.",
    "I am listening. What would you like to share?",
    "What brought you here today?",
    "What would you like to explore?"
  ];
  
  return neutralResponses[Math.floor(Math.random() * neutralResponses.length)];
};

interface Message {
  id: number;
  type: 'user' | 'assistant';
  content: string;
  emotion?: string;
  timestamp: string;
}

function Palette() {
  return (
    <div className="relative shrink-0 size-[32px]">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
        <g id="palette">
          <mask height="32" id="mask0_1_720" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="32" x="0" y="0">
            <rect fill="var(--fill-0, #D9D9D9)" height="32" width="32" />
          </mask>
          <g mask="url(#mask0_1_720)">
            <path d={svgPaths.p19810e80} fill="var(--fill-0, #1C1B1F)" />
          </g>
        </g>
      </svg>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [selectedTool, setSelectedTool] = useState<'pencil' | 'brush' | 'eraser' | 'fill' | 'eyedropper' | 'shape' | 'sticker'>('pencil');
  const [brushSize, setBrushSize] = useState(18);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [selectedShape, setSelectedShape] = useState<'circle' | 'rectangle' | 'line' | 'triangle'>('circle');
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const [showShapeDropdown, setShowShapeDropdown] = useState(false);
  const shapeDropdownRef = useRef<HTMLDivElement>(null);
  const [recentColors, setRecentColors] = useState<string[]>(['#000000', '#404040', '#737373', '#A3A3A3', '#E5E5E5', '#FFFFFF']);
  const [emotionPalette, setEmotionPalette] = useState<string[]>([]);
  const [pendingPalette, setPendingPalette] = useState<string[] | null>(null);
  const [hasRespondedToFirstQuestion, setHasRespondedToFirstQuestion] = useState(false);
  
  // Sticker placement mode state
  const [stickerPlacementMode, setStickerPlacementMode] = useState(false);
  const [pendingSticker, setPendingSticker] = useState<string | null>(null);


const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
const INACTIVITY_TIMEOUT = 30000; // 30 seconds (ms)
  
  // Initial experience states
  const [isInitialExperience, setIsInitialExperience] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasDrawingChanged, setHasDrawingChanged] = useState(false);

  // Interspace keyword lens states
  const [interspaceMode, setInterspaceMode] = useState(true);
  const [entryCandidates, setEntryCandidates] = useState<string[]>([]);
  const [selectedEntryKeywords, setSelectedEntryKeywords] = useState<string[]>([]);
  const [keywordPack, setKeywordPack] = useState<{
    lens: string[];
    action: string[];
    derived: string[];
    imagePrompt: string;
  }>({
    lens: [],
    action: [],
    derived: [],
    imagePrompt: ''
  });

  // Drawable object categories for 3D conversion
  const DRAWING_CATEGORIES = [
    { id: 'face', label: 'Face' },
    { id: 'person', label: 'Person' },
    { id: 'animal', label: 'Animal' },
    { id: 'cat', label: 'Cat' },
    { id: 'dog', label: 'Dog' },
    { id: 'bird', label: 'Bird' },
    { id: 'tree', label: 'Tree' },
    { id: 'flower', label: 'Flower' },
    { id: 'car', label: 'Car' },
    { id: 'house', label: 'House' },
    { id: 'chair', label: 'Chair' },
    { id: 'cup', label: 'Cup' },
    { id: 'food', label: 'Food' },
    { id: 'guitar', label: 'Guitar' },
    { id: 'robot', label: 'Robot' },
  ];

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Undo/Redo state
  const [canvasHistory, setCanvasHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const canvasRef = useRef<DrawingCanvasHandle>(null);

  // Gallery Strip state
  const [drawingThumbnail, setDrawingThumbnail] = useState<string>('');
  const [asciiArt, setAsciiArt] = useState<string>('');
  const [echoes, setEchoes] = useState<string[]>([]);
  const [echoHistory, setEchoHistory] = useState<string[]>([]); // Track history for anti-repetition
  const [isAsciiTransitioning, setIsAsciiTransitioning] = useState(false);
  const [drawingInterpretation, setDrawingInterpretation] = useState('');
  const [lineArtUrl, setLineArtUrl] = useState('');
  const [lineArtLoading, setLineArtLoading] = useState(false);
  const [lineArtError, setLineArtError] = useState('');

  // Messages and emotion states
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; id: string }>>([
    {
      role: 'assistant',
      content: 'How do you feel today?',
      id: `msg-${Date.now()}-0`
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentEmotion, setCurrentEmotion] = useState('calm');
  const [emotionIntensity, setEmotionIntensity] = useState(65);

  // Context tracking for AI responses
  const [lastDrawingAnalysis, setLastDrawingAnalysis] = useState<{
    detectedObjects: Array<{ type: string; emotion: string; emotionWeight: number }>;
    dominantColors: any[];
    strokeCount: number;
    straightLineRatio: number;
    curveLineRatio: number;
    angularShapes: number;
    roundShapes: number;
    strokeSpeed: number;
    strokePressure: number;
    stickersUsed: Array<{ src: string; alt?: string }>;
  }>({ 
    detectedObjects: [], 
    dominantColors: [],
    strokeCount: 0,
    straightLineRatio: 0,
    curveLineRatio: 0,
    angularShapes: 0,
    roundShapes: 0,
    strokeSpeed: 0,
    strokePressure: 0,
    stickersUsed: []
  });
  const [previousEmotion, setPreviousEmotion] = useState('calm');

  // Export and QR code state
  const [showExportModal, setShowExportModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [exportImageUrl, setExportImageUrl] = useState<string>('');

  // Creative AI response (Groq prompt → Gemini image)
  const [creativeResponseUrl, setCreativeResponseUrl] = useState<string>('');
  const [creativeResponseLoading, setCreativeResponseLoading] = useState(false);
  const [creativeMode, setCreativeMode] = useState<'opposite' | 'whatif' | 'expand' | 'challenge'>('whatif');
  const strokePauseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastLineDrawingRef = useRef<number>(0);
  const STROKE_PAUSE_DELAY = 4000; // 4초 후 분석 트리거
  const LINE_DRAWING_THROTTLE = 45000; // line drawing regenerates at most once per 45 seconds
  const lastCreativeResponseRef = useRef<number>(0);
  const CREATIVE_RESPONSE_THROTTLE = 45000; // creative response regenerates at most once per 45 seconds

// Sticker selection handler
  const handleStickerSelect = (emoji: string) => {
    setPendingSticker(emoji);
    setStickerPlacementMode(true);
    setSelectedTool('sticker');
  };

  // Sticker placed handler
  const handleStickerPlaced = () => {
    setPendingSticker(null);
    setStickerPlacementMode(false);
    setSelectedTool('pencil');
  };

  // Cancel sticker placement (ESC)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stickerPlacementMode) {
        setPendingSticker(null);
        setStickerPlacementMode(false);
        setSelectedTool('pencil');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stickerPlacementMode]);

  // Reset category selection
  const resetCategorySelection = () => {
    setSelectedCategory(null);
    setSelectedEntryKeywords([]);
  };

  // Idle Timer Logic
  const handleReset = () => {
    console.log("⏳ Idle timeout: Resetting to initial screen");
    
    // Reset to initial state
    setIsInitialExperience(true);
    setHasRespondedToFirstQuestion(false);
    setMessages([
      {
        role: 'assistant',
        content: 'How do you feel today?',
        id: `msg-${Date.now()}-0`
      }
    ]);
    setInputValue("");
    
    // Reset tools and canvas
    setSelectedTool('pencil');
    setBrushSize(18);
    setCurrentColor('#000000');
    setSelectedShape('circle');
    setSelectedSticker(null);
    setStickerPlacementMode(false);
    setPendingSticker(null);
    
    // Reset canvas content
    if (canvasRef.current) {
      canvasRef.current.restoreState({ canvasData: "", stickers: [] });
    }
    setCanvasHistory([]);
    setHistoryIndex(-1);
    
    // Reset analysis data
    setLastDrawingAnalysis({ 
      detectedObjects: [], 
      dominantColors: [],
      strokeCount: 0,
      straightLineRatio: 0,
      curveLineRatio: 0,
      angularShapes: 0,
      roundShapes: 0,
      strokeSpeed: 0,
      strokePressure: 0,
      stickersUsed: []
    });
    
    // Reset keywords and gallery
    setInterspaceMode(true);
    resetCategorySelection();
    setKeywordPack({
      lens: [],
      action: [],
      derived: [],
      imagePrompt: ''
    });
    setDrawingThumbnail('');
    setAsciiArt('');
    setEchoes([]);
    setEchoHistory([]);
    setDrawingInterpretation('');
    setLineArtUrl('');
    setLineArtLoading(false);
    setLineArtError('');
    setCreativeResponseUrl('');
    setCreativeResponseLoading(false);
    if (strokePauseTimerRef.current) clearTimeout(strokePauseTimerRef.current);

    // Reset UI states
    setShowExportModal(false);
    setShowShapeDropdown(false);
    setQrCodeUrl('');
    setExportImageUrl('');
    
    // Clear recent colors reset
    setRecentColors(['#000000', '#404040', '#737373', '#A3A3A3', '#E5E5E5', '#FFFFFF']);
    setEmotionPalette([]);
    setPendingPalette(null);
    setHasDrawingChanged(false);
  };

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    // Only set timer if NOT in initial experience
    if (!isInitialExperience) {
      inactivityTimerRef.current = setTimeout(() => {
        handleReset();
      }, INACTIVITY_TIMEOUT);
    }
  };

  useEffect(() => {
    // Initial start if not in initial experience
    if (!isInitialExperience) {
      resetInactivityTimer();
    }

    // Listen for any user activity
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'click', 'scroll', 'wheel'];
    
    const handleActivity = () => {
      resetInactivityTimer();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Cleanup
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isInitialExperience]);

  // Legacy function - replaced by AI-driven analysis (kept for reference, not used)
  const _generateAsciiArt_old = async (imageDataUrl: string) => {
    try {
      const metrics = await analyzeVisualMetrics(imageDataUrl);
      const patterns = generateReinterpretationPatterns(metrics);
      
      // Generate ASCII pattern based on visual metrics
      const symbols = {
        'circles': ['', '●', '◎', '◍', '◉'],
        'curves': ['⌒', '⌓', '∼', '≈', '∽'],
        'lines': ['─', '│', '┃', '━', '╱', '╲'],
        'angles': ['└', '┘', '┌', '┐', '∟', '∠'],
        'sharp': ['△', '▽', '◇', '◆', '⬙'],
        'dense': ['■', '▪', '▫', '▢', '◼'],
        'sparse': ['·', '∙', '⋅', '⋆', '✦'],
        'dots': ['∴', '∵', '⋯', '⋰', '⋱'],
        'regular': ['┼', '╋', '╳', '✕', '⊕'],
        'patterns': ['≡', '≣', '⊞', '⊟', '⊠'],
        'mixed': ['◇', '○', '△', '·', '─']
      };

      // Select symbols based on categories
      const symbolSet = new Set<string>();
      patterns.symbolCategories.forEach(cat => {
        const categorySymbols = symbols[cat as keyof typeof symbols] || symbols.mixed;
        categorySymbols.slice(0, 2).forEach(s => symbolSet.add(s));
      });
      
      const selectedSymbols = Array.from(symbolSet).slice(0, 4);
      
      // Create 3x3 pattern based on distribution
      let pattern = '';
      if (patterns.distribution === 'edge') {
        pattern = `${selectedSymbols[0]} ${selectedSymbols[1]} ${selectedSymbols[0]}\n${selectedSymbols[1]}     ${selectedSymbols[1]}\n${selectedSymbols[0]} ${selectedSymbols[1]} ${selectedSymbols[0]}`;
      } else if (patterns.distribution === 'clustered') {
        pattern = `${selectedSymbols[0]} ${selectedSymbols[1]} ·\n${selectedSymbols[1]} ${selectedSymbols[2]} ${selectedSymbols[1]}\n·  ${selectedSymbols[1]} ${selectedSymbols[0]}`;
      } else if (patterns.distribution === 'linear') {
        if (metrics.directionality === 'horizontal') {
          pattern = `${selectedSymbols[0]} ${selectedSymbols[1]} ${selectedSymbols[2]}\n·    ·    ·\n${selectedSymbols[0]} ${selectedSymbols[1]} ${selectedSymbols[2]}`;
        } else {
          pattern = `${selectedSymbols[0]} · ${selectedSymbols[0]}\n${selectedSymbols[1]} · ${selectedSymbols[1]}\n${selectedSymbols[2]} · ${selectedSymbols[2]}`;
        }
      } else {
        // uniform or radial
        pattern = `${selectedSymbols[0]} ${selectedSymbols[1]} ${selectedSymbols[0]}\n${selectedSymbols[1]} ${selectedSymbols[2]} ${selectedSymbols[1]}\n${selectedSymbols[0]} ${selectedSymbols[1]} ${selectedSymbols[0]}`;
      }
      
      return pattern;
    } catch (error) {
      console.error('Error generating ASCII art:', error);
      return `○ · ○\n·   ·\n○ · ○`;
    }
  };

  /**
   * AI-DRIVEN VISUAL REINTERPRETATION SYSTEM
   * 
   * This function sends the complete drawing canvas as a single image to GPT-4o Vision API.
   * The AI analyzes the drawing holistically (composition, density, balance, rhythm, flow, tension)
   * and generates:
   *   1. ASCII Art - Abstract symbolic "shadow" of the drawing using visual primitives
   *   2. Echo Keywords - Evocative visual-quality keywords (not literal objects)
   * 
   * Key principles:
   * - Treats the drawing as a unified image, not stroke-by-stroke
   * - Symbols (·, ○, ─, │, ╱, ╲, △, etc.) function as visual brushstrokes
   * - ASCII patterns reflect spatial relationships (clusters, voids, symmetry, flow)
   * - Keywords are abstract visual qualities (rhythm, drift, tension, weight, etc.)
   * - Both outputs derive from the same holistic AI interpretation
   * 
   * Auto-refreshes every 10 seconds via setInterval
   */
  const analyzeDrawingWithAI = async (imageDataUrl: string) => {
    try {
      console.log('🎨 Sending drawing to AI for analysis...');
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/server/analyze-visual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ 
          imageDataUrl,
          userKeywords: keywordPack.lens.length > 0 ? keywordPack.lens : undefined
        })
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Visual analysis failed:', response.status, errorData);
        throw new Error(`Visual analysis failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('AI Visual Analysis:', data);
      
      return {
        asciiArt: data.asciiArt || '○ · ○\\n·   ·\\n○ · ○',
        echoKeywords: data.echoKeywords || ['Trace', 'Calm'],
        visualDescription: data.visualDescription || ''
      };
    } catch (error) {
      console.error('Error in AI visual analysis:', error);
      // Fallback to default
      return {
        asciiArt: '○ · ○\\n·   ·\\n○ · ○',
        echoKeywords: ['Trace', 'Calm'],
        visualDescription: 'Visual analysis unavailable'
      };
    }
  };

  const requestLineReconstruction = async (
    visualDescription: string,
    categoryHint: string,
  ) => {
    const text = (visualDescription || '').trim();
    if (!text) {
      setLineArtUrl('');
      setLineArtLoading(false);
      setLineArtError('');
      return;
    }
    setLineArtLoading(true);
    setLineArtError('');
    setLineArtUrl('');
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/line-drawing`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            text,
            categoryHint: categoryHint.trim() || undefined,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Line reconstruction failed',
        );
      }
      if (typeof data.imageUrl === 'string' && data.imageUrl) {
        setLineArtUrl(data.imageUrl);
      } else {
        throw new Error('No image returned');
      }
    } catch (e) {
      console.error('Line reconstruction error:', e);
      setLineArtError(
        e instanceof Error ? e.message : 'Could not generate line drawing',
      );
    } finally {
      setLineArtLoading(false);
    }
  };

  // Groq prompt → Gemini image: 유저 드로잉 → 창의적 AI 응답 이미지
  const triggerCreativeResponse = async (imageData: string, mode: typeof creativeMode) => {
    setCreativeResponseLoading(true);
    setCreativeResponseUrl('');
    console.log('[creativeResponse] Firing. mode:', mode);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/creative-response`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            imageDataUrl: imageData,
            mode,
            userKeywords: keywordPack.lens
          })
        }
      );
      console.log('[creativeResponse] HTTP status:', response.status);
      const data = await response.json();
      console.log('[creativeResponse] Response keys:', Object.keys(data), '| imageUrl present:', !!data.imageUrl, '| error:', data.error ?? null);
      if (data.imageUrl) {
        console.log('[creativeResponse] imageUrl length:', data.imageUrl.length);
        setCreativeResponseUrl(data.imageUrl);
      }
    } catch (error) {
      console.error('[creativeResponse] Fetch error:', error);
    } finally {
      setCreativeResponseLoading(false);
    }
  };

  // Update gallery strip content (thumbnail, ASCII, echoes) - now with AI-driven visual analysis
  const updateGalleryStrip = async () => {
    // Capture drawing as single holistic image
    if (!canvasRef.current) return;
    
    const imageData = await canvasRef.current.exportAsImage();
    if (!imageData) return;
    
    setDrawingThumbnail(imageData);

    const categoryHint = [
      ...(keywordPack.lens || []),
      selectedCategory || '',
    ]
      .filter(Boolean)
      .join(', ')
      .slice(0, 200);

    // Trigger ASCII transition animation
    setIsAsciiTransitioning(true);
    
    // Send image to AI for holistic analysis
    try {
      const analysis = await analyzeDrawingWithAI(imageData);
      
      console.log('🎨 AI-driven visual reinterpretation complete');
      
      // After disperse animation, update with AI-analyzed results
      setTimeout(() => {
        setEchoes(analysis.echoKeywords);
        setAsciiArt(analysis.asciiArt);
        setDrawingInterpretation(analysis.visualDescription || '');
        setEchoHistory(prev => [...prev, ...analysis.echoKeywords].slice(-12));
        setIsAsciiTransitioning(false);
        const now = Date.now();
        if (now - lastLineDrawingRef.current >= LINE_DRAWING_THROTTLE) {
          lastLineDrawingRef.current = now;
          void requestLineReconstruction(analysis.visualDescription || '', categoryHint);
        }
        const creativeNow = Date.now();
        if (creativeNow - lastCreativeResponseRef.current >= CREATIVE_RESPONSE_THROTTLE) {
          lastCreativeResponseRef.current = creativeNow;
          void triggerCreativeResponse(imageData, creativeMode);
        }
      }, 400);
    } catch (error) {
      console.error('Error analyzing drawing with AI:', error);
      // Fallback
      setTimeout(() => {
        setEchoes(['Trace', 'Calm']);
        setAsciiArt(`○ · ○\n·   ·\n○ · ○`);
        setDrawingInterpretation('Visual analysis unavailable');
        setIsAsciiTransitioning(false);
        void requestLineReconstruction('', categoryHint);
      }, 400);
    }
  };

  // 획이 끝나고 4초 후 분석 트리거 (15초 interval 대체)
  const handleStrokeEnd = () => {
    if (!hasRespondedToFirstQuestion) return;
    if (strokePauseTimerRef.current) clearTimeout(strokePauseTimerRef.current);
    strokePauseTimerRef.current = setTimeout(() => {
      updateGalleryStrip();
    }, STROKE_PAUSE_DELAY);
  };

  useEffect(() => {
    return () => {
      if (strokePauseTimerRef.current) clearTimeout(strokePauseTimerRef.current);
    };
  }, []);

  // 세션 진입 시 초기 분석 1회 실행
  useEffect(() => {
    if (!isInitialExperience && hasRespondedToFirstQuestion) {
      updateGalleryStrip();
    }
  }, [isInitialExperience, hasRespondedToFirstQuestion]);

  // Undo/Redo functions
  const saveCanvasState = (canvasData: string, stickers: any[]) => {
    const newState = { canvasData, stickers };
    const newHistory = canvasHistory.slice(0, historyIndex + 1);
    newHistory.push(newState);
    
    // Limit history to 50 states
    if (newHistory.length > 50) {
      newHistory.shift();
      setHistoryIndex(historyIndex);
    } else {
      setHistoryIndex(historyIndex + 1);
    }
    
    setCanvasHistory(newHistory);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      const prevState = canvasHistory[historyIndex - 1];
      if (canvasRef.current) {
        canvasRef.current.restoreState(prevState);
      }
    }
  };

  const redo = () => {
    if (historyIndex < canvasHistory.length - 1) {
      setHistoryIndex(historyIndex + 1);
      const nextState = canvasHistory[historyIndex + 1];
      if (canvasRef.current) {
        canvasRef.current.restoreState(nextState);
      }
    }
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < canvasHistory.length - 1;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shapeDropdownRef.current && !shapeDropdownRef.current.contains(event.target as Node)) {
        setShowShapeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const addToRecentColors = (color: string) => {
    setRecentColors(prev => {
      // Remove color if it already exists
      const filtered = prev.filter(c => c !== color);
      // Add color to the front (most recent)
      const newColors = [color, ...filtered];
      // Keep only the 6 most recent colors
      return newColors.slice(0, 6);
    });
  };

  useEffect(() => {
  if (!isInitialExperience) {
    resetInactivityTimer();
  }

  return () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
  };
}, [isInitialExperience]);

  const handleColorChange = (color: string) => {
    setCurrentColor(color);
  };

  const handleColorSpaceClick = (color: string) => {
    addToRecentColors(color);
  };

  const handleColorPick = (color: string) => {
    setCurrentColor(color);
    addToRecentColors(color);
    // Switch back to previous tool after picking color
    if (selectedTool === 'eyedropper') {
      setSelectedTool('pencil');
    }
  };

  const detectEmotion = (text: string): { emotion: string; intensity: number } => {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('overwhelm') || lowerText.includes('anxious') || lowerText.includes('stress') || lowerText.includes('worry')) {
      return { emotion: 'anxious', intensity: 75 };
    } else if (lowerText.includes('peaceful') || lowerText.includes('calm') || lowerText.includes('serene') || lowerText.includes('relax')) {
      return { emotion: 'calm', intensity: 80 };
    } else if (lowerText.includes('happy') || lowerText.includes('joy') || lowerText.includes('good') || lowerText.includes('great')) {
      return { emotion: 'happy', intensity: 85 };
    } else if (lowerText.includes('sad') || lowerText.includes('down') || lowerText.includes('depressed') || lowerText.includes('lonely')) {
      return { emotion: 'sad', intensity: 70 };
    } else if (lowerText.includes('angry') || lowerText.includes('frustrated') || lowerText.includes('mad') || lowerText.includes('rage')) {
      return { emotion: 'angry', intensity: 80 };
    } else if (lowerText.includes('excited') || lowerText.includes('energetic') || lowerText.includes('enthusiastic') || lowerText.includes('thrilled')) {
      return { emotion: 'excited', intensity: 90 };
    }
    
    return { emotion: 'neutral', intensity: 65 };
  };

  // Analyze drawing to detect emotion using color psychology, art therapy, and Gestalt principles
  const analyzeDrawing = (analysis: DrawingAnalysis) => {
    const { 
      dominantColors,
      averageBrightness,
      averageSaturation,
      colorContrast,
      colorDiversity,
      strokeSpeed,
      strokePressure,
      strokeTremor,
      straightLineRatio,
      curveLineRatio,
      angularShapes,
      roundShapes,
      brokenShapes,
      centroidDeviation,
      symmetryScore,
      canvasDensity,
      pressureVariance,
      repetitionScore,
      borderCrossing,
      flowContinuity,
      upwardDirection,
      downwardDirection,
      centerFocus,
      strokeCount,
      detectedFaces,
      detectedEmojis,
      detectedObjects
    } = analysis;
    
    // CRITICAL: Check for valid data
    const hasValidData = strokeCount > 0;

    if (!hasValidData) {
      setCurrentEmotion("neutral");
      setEmotionIntensity(50);
      return;
    }
    
    // 7가지 감정별 점수 계산
    let calmScore = 0;
    let happyScore = 0;
    let excitedScore = 0;
    let angryScore = 0;
    let anxiousScore = 0;
    let sadScore = 0;
    let neutralScore = 50; // 기본값

    // ========== 1. 색채 (Color) 분석 ==========
    
    // 색상별 감정 매핑
    dominantColors.forEach(colorInfo => {
      const { hue, saturation, brightness } = colorInfo;
      
      // 빨강 (0-30, 330-360) → Angry, Excited
      if ((hue >= 0 && hue <= 30) || (hue >= 330 && hue <= 360)) {
        if (saturation > 60) {
          angryScore += 20;
          excitedScore += 15;
        }
      }
      
      // 주황 (30-60) → Excited, Happy
      if (hue >= 30 && hue <= 60) {
        excitedScore += 15;
        happyScore += 10;
      }
      
      // 노랑 (60-90) → Happy, Anxious
      if (hue >= 60 && hue <= 90) {
        if (brightness > 70) {
          happyScore += 15;
        } else {
          anxiousScore += 10;
        }
      }
      
      // 초록 (90-150) → Calm
      if (hue >= 90 && hue <= 150) {
        calmScore += 20;
      }
      
      // 파랑 (180-240) → Calm / Sad (밝기에 따라)
      if (hue >= 180 && hue <= 240) {
        if (brightness > 50) {
          calmScore += 15;
        } else {
          sadScore += 20;
        }
      }
      
      // 보라/마젠타 (240-300) → Anxious
      if (hue >= 240 && hue <= 300) {
        anxiousScore += 15;
      }
      
      // 검정/회색 (채도 낮고 밝기 낮음) → Sad, Angry
      if (saturation < 20 && brightness < 30) {
        sadScore += 15;
        angryScore += 10;
      }
      
      // 회색 (중간 밝기, 낮은 채도) → Neutral, Sad
      if (saturation < 20 && brightness >= 30 && brightness < 60) {
        neutralScore += 10;
        sadScore += 5;
      }
    });

    // 전체 평균 밝기
    if (averageBrightness > 70) {
      happyScore += 10;
      calmScore += 5;
    } else if (averageBrightness < 30) {
      sadScore += 15;
      angryScore += 10;
    }

    // 평균 채도
    if (averageSaturation > 60) {
      excitedScore += 10;
      angryScore += 5;
    } else if (averageSaturation < 20) {
      sadScore += 10;
      neutralScore += 10;
    }

    // 색 대비 (긴장도)
    if (colorContrast > 40) {
      anxiousScore += 10;
      excitedScore += 5;
    }

    // ========== 2. 선 (Line) 분석 ==========
    
    // 빠른 선 → Excited, Angry, Anxious (높은 arousal)
    if (strokeSpeed > 3) {
      excitedScore += 15;
      angryScore += 10;
      anxiousScore += 10;
    } else if (strokeSpeed < 1) {
      // 느린 선 → Calm, Sad
      calmScore += 15;
      sadScore += 10;
    }

    // 굵은 선 (강한 압력) → Angry
    if (strokePressure > 25) {
      angryScore += 20;
    } else if (strokePressure < 10) {
      // 얇은 선 → Sad, Calm
      sadScore += 10;
      calmScore += 5;
    }

    // 떨림/진동 → Anxious
    if (strokeTremor > 40) {
      anxiousScore += 25;
    } else if (strokeTremor < 15) {
      calmScore += 10;
    }

    // 직선 많음 → 통제, Calm
    if (straightLineRatio > 60) {
      calmScore += 10;
    }

    // 곡선 많음 → Calm, Happy
    if (curveLineRatio > 60) {
      calmScore += 10;
      happyScore += 5;
    }

    // ========== 3. 형태 (Shape) 분석 ==========
    
    // 각진 형태 → Angry, Anxious
    if (angularShapes > 50) {
      angryScore += 20;
      anxiousScore += 15;
    }

    // 둥근 형태 → Calm, Happy
    if (roundShapes > 50) {
      calmScore += 20;
      happyScore += 10;
    }

    // 끊긴 형태 → Anxious, Sad
    if (brokenShapes > 40) {
      anxiousScore += 20;
      sadScore += 10;
    }

    // ========== 4. 구성 (Composition) 분석 ==========
    
    // 중심에서 많이 벗어남 → Excited, Anxious
    if (centroidDeviation > 50) {
      excitedScore += 10;
      anxiousScore += 15;
    } else if (centroidDeviation < 20) {
      // 중심 집중 → Sad, Calm
      calmScore += 10;
      sadScore += 5;
    }

    // 대칭성 → Calm
    if (symmetryScore > 70) {
      calmScore += 15;
    } else if (symmetryScore < 30) {
      // 비대칭 → Anxious
      anxiousScore += 10;
    }

    // ========== 5. 공간 사용률 (Space Density) 분석 ==========
    
    // 캔버스를 꽉 채움 (≥70%) → Excited, Angry, Anxious
    if (canvasDensity >= 70) {
      excitedScore += 15;
      angryScore += 15;
      anxiousScore += 10;
    } else if (canvasDensity >= 30 && canvasDensity < 70) {
      // 중간 수준 → Happy, Calm
      happyScore += 10;
      calmScore += 5;
    } else {
      // 거의 빈 공간 (≤30%) → Sad
      sadScore += 20;
    }

    // ========== 6. 압력 (Pressure) 변화 분석 ==========
    
    // 압력 변화 큼 → Anxious, Angry
    if (pressureVariance > 50) {
      anxiousScore += 15;
      angryScore += 10;
    } else if (pressureVariance < 20) {
      // 일관된 압력 → Calm
      calmScore += 10;
    }

    // ========== 7. 반복 패턴 (Repetition) 분석 ==========
    
    // 높은 반복 → Anxious (강박적), Calm (규칙적)
    if (repetitionScore > 50) {
      if (strokeTremor > 30) {
        anxiousScore += 15; // 불규칙한 반복
      } else {
        calmScore += 10; // 규칙적 반복
      }
    }

    // ========== 8. 경계 사용 (Border Interaction) 분석 ==========
    
    // 경계 많이 넘음 → Excited, Angry (충동성)
    if (borderCrossing > 40) {
      excitedScore += 15;
      angryScore += 10;
    }

    // ========== 9. 흐름 (Flow) 분석 ==========
    
    // 유기적 흐름 → Calm, Happy
    if (flowContinuity > 70) {
      calmScore += 15;
      happyScore += 10;
    } else if (flowContinuity < 30) {
      // 끊긴 흐름 → Anxious, Sad
      anxiousScore += 15;
      sadScore += 10;
    }

    // ========== 10. 방향성 (Direction) 분석 ==========
    
    // 위쪽 집중 → Happy, Excited (희망성)
    if (upwardDirection > 60) {
      happyScore += 15;
      excitedScore += 10;
    }

    // 아래쪽 집중 → Sad
    if (downwardDirection > 60) {
      sadScore += 15;
    }

    // 중앙 집중 → Calm, Sad (내면 초점)
    if (centerFocus > 70) {
      calmScore += 10;
      sadScore += 5;
    }

    // ========== 11. 얼굴/표정 인식 반영 ==========
    
    detectedFaces.forEach(face => {
      const weight = face.confidence / 10; // confidence를 가중치로 변환
      
      if (face.type === 'happy') {
        happyScore += 30 + weight;
      } else if (face.type === 'sad') {
        sadScore += 30 + weight;
      } else if (face.type === 'angry') {
        angryScore += 30 + weight;
      } else if (face.type === 'surprised') {
        excitedScore += 25 + weight;
      } else if (face.type === 'neutral') {
        neutralScore += 20;
      }
    });

    // ========== 12. 이모지 인식 반영 ==========
    
    detectedEmojis.forEach(emoji => {
      const weight = emoji.confidence / 10;
      
      if (emoji.type === 'smile') {
        happyScore += 25 + weight;
      } else if (emoji.type === 'frown') {
        sadScore += 25 + weight;
      } else if (emoji.type === 'heart') {
        happyScore += 20 + weight;
        excitedScore += 10;
      } else if (emoji.type === 'star') {
        happyScore += 15 + weight;
        excitedScore += 10;
      } else if (emoji.type === 'sun') {
        happyScore += 20 + weight;
      } else if (emoji.type === 'flower') {
        happyScore += 15 + weight;
        calmScore += 10;
      } else if (emoji.type === 'tear') {
        sadScore += 30 + weight;
      }
    });

    // ========== 13. 사물 인식 반영 (Quick Draw 기반) ==========
    
    detectedObjects.forEach(obj => {
      const baseWeight = obj.confidence / 100;
      const emotionImpact = Math.abs(obj.emotionWeight) / 10;
      
      if (obj.emotion === 'positive') {
        // 긍정적 객체들
        if (obj.type === 'heart') {
          happyScore += 25 * baseWeight + emotionImpact;
          excitedScore += 15 * baseWeight;
        } else if (obj.type === 'star') {
          happyScore += 20 * baseWeight + emotionImpact;
          excitedScore += 10 * baseWeight;
        } else if (obj.type === 'sun') {
          happyScore += 25 * baseWeight + emotionImpact;
          calmScore += 5;
        } else if (obj.type === 'flower') {
          happyScore += 15 * baseWeight + emotionImpact;
          calmScore += 10 * baseWeight;
        } else if (obj.type === 'tree') {
          calmScore += 20 * baseWeight + emotionImpact;
          happyScore += 5;
        } else if (obj.type === 'house') {
          calmScore += 15 * baseWeight + emotionImpact;
        } else if (obj.type === 'rainbow') {
          happyScore += 30 * baseWeight + emotionImpact;
          excitedScore += 15 * baseWeight;
        } else if (obj.type === 'cat' || obj.type === 'dog') {
          happyScore += 20 * baseWeight + emotionImpact;
          excitedScore += 10 * baseWeight;
        } else if (obj.type === 'bird' || obj.type === 'butterfly') {
          happyScore += 18 * baseWeight + emotionImpact;
          excitedScore += 12 * baseWeight;
        } else if (obj.type === 'fish') {
          calmScore += 15 * baseWeight + emotionImpact;
        } else if (obj.type === 'cake' || obj.type === 'pizza') {
          happyScore += 25 * baseWeight + emotionImpact;
          excitedScore += 15 * baseWeight;
        } else if (obj.type === 'balloon') {
          happyScore += 22 * baseWeight + emotionImpact;
          excitedScore += 18 * baseWeight;
        } else if (obj.type === 'guitar') {
          happyScore += 18 * baseWeight + emotionImpact;
          excitedScore += 10 * baseWeight;
        }
      } else if (obj.emotion === 'neutral') {
        // 중립적 객들
        if (obj.type === 'cloud') {
          calmScore += 10 * baseWeight + emotionImpact;
          neutralScore += 10 * baseWeight;
        } else if (obj.type === 'house') {
          calmScore += 15 * baseWeight + emotionImpact;
        } else if (obj.type === 'umbrella') {
          calmScore += 8 * baseWeight + emotionImpact;
          neutralScore += 5;
        } else if (obj.type === 'book') {
          calmScore += 12 * baseWeight + emotionImpact;
        } else if (obj.type === 'mountain') {
          calmScore += 15 * baseWeight + emotionImpact;
          neutralScore += 5;
        }
      } else if (obj.emotion === 'negative') {
        // 부정적 객체들
        if (obj.type === 'skull') {
          sadScore += 25 * baseWeight + emotionImpact;
          anxiousScore += 15 * baseWeight;
        } else if (obj.type === 'lightning') {
          angryScore += 20 * baseWeight + emotionImpact;
          anxiousScore += 15 * baseWeight;
        }
      }
    });

    // ========== 최종 감정 결정 ==========
    
    const scores = {
      calm: calmScore,
      happy: happyScore,
      excited: excitedScore,
      angry: angryScore,
      anxious: anxiousScore,
      sad: sadScore,
      neutral: neutralScore
    };

    // 가장 높은 점수를 가진 감정 선택
    let detectedEmotion: 'calm' | 'happy' | 'excited' | 'angry' | 'anxious' | 'sad' | 'neutral' = 'neutral';
    let maxScore = neutralScore;

    (Object.keys(scores) as Array<keyof typeof scores>).forEach(emotion => {
      if (scores[emotion] > maxScore) {
        maxScore = scores[emotion];
        detectedEmotion = emotion;
      }
    });

    // Intensity 계산 (0-100)
    const intensity = Math.min(100, Math.max(30, maxScore));

    // Emoji mapping
    const emojiMap: Record<string, string> = {
      heart: '❤️', star: '⭐', sun: '☀️', cloud: '☁️', flower: '🌸', tree: '🌳',
      house: '🏠', rainbow: '🌈', cat: '🐱', dog: '🐶', bird: '🐦', fish: '🐟',
      butterfly: '🦋', cake: '🎂', pizza: '🍕', balloon: '🎈', umbrella: '☂️',
      book: '📖', guitar: '🎸', skull: '💀', lightning: '⚡', mountain: '⛰️'
    };

    const faceEmojiMap: Record<string, string> = {
      happy: '😊', sad: '😢', angry: '😠', neutral: '😐', surprised: '😲'
    };

    console.log('🎭 Emotion Analysis:', {
      emotion: detectedEmotion,
      intensity,
      scores,
      recognizedObjects: detectedObjects.map(o => 
        `${emojiMap[o.type] || '🎨'} ${o.type} (${o.emotion}, weight: ${o.emotionWeight})`
      ),
      recognizedFaces: detectedFaces.map(f => 
        `${faceEmojiMap[f.type] || '😶'} ${f.type} (${f.confidence}%)`
      ),
      analysis
    });

    setCurrentEmotion(detectedEmotion);
    setEmotionIntensity(intensity);

    // Update context for AI responses
    setLastDrawingAnalysis({ detectedObjects, dominantColors, strokeCount, straightLineRatio, curveLineRatio, angularShapes, roundShapes, strokeSpeed, strokePressure, stickersUsed: [] });
    setPreviousEmotion(detectedEmotion);

    // Update keyword pack based on drawing analysis (if in interspace mode)
    if (interspaceMode && keywordPack.lens.length > 0) {
      const actionKeywords: string[] = [];
      
      // B. Trace keywords from drawing actions
      if (strokeSpeed > 3) actionKeywords.push('rapid');
      if (strokeSpeed < 1) actionKeywords.push('slow');
      if (strokePressure > 25) actionKeywords.push('press');
      if (strokePressure < 10) actionKeywords.push('feather');
      if (angularShapes > 50) actionKeywords.push('sharp');
      if (roundShapes > 50) actionKeywords.push('soft');
      if (canvasDensity >= 70) actionKeywords.push('overflow');

      // C/D. Derived keywords from action keywords
      const derivedKeywords: string[] = [];
      if (actionKeywords.includes('sharp')) derivedKeywords.push('boundary');
      if (actionKeywords.includes('slow')) derivedKeywords.push('linger');
      if (actionKeywords.includes('overflow')) derivedKeywords.push('noise');

      // E. Image prompt
      const imagePrompt = actionKeywords.length > 0
        ? `A layered abstract composition where "${keywordPack.lens.join(' / ')}" overlays "${actionKeywords.join(', ')}" as typographic labels. Minimal, high contrast, gallery wall.`
        : '';

      setKeywordPack(prev => ({
        ...prev,
        action: actionKeywords,
        derived: derivedKeywords,
        imagePrompt
      }));
    }

    // Update drawing thumbnail
    if (canvasRef.current && !isInitialExperience) {
      const imageData = canvasRef.current.exportAsImage();
      if (imageData) {
        setDrawingThumbnail(imageData);
      }
    }
  };

  // Handle category/keyword entry
const handleEnterKeywords = async () => {
  if (!selectedCategory && selectedEntryKeywords.length === 0) return;

  resetInactivityTimer();

  setIsProcessing(true);

    // Save selected category/keywords
    const keywords = selectedCategory ? [selectedCategory] : selectedEntryKeywords;
    setKeywordPack(prev => ({
      ...prev,
      lens: keywords
    }));
    if (selectedCategory) {
      setSelectedEntryKeywords([selectedCategory]);
    }

    // Show processing message
    const processingMessage = {
      id: `msg-processing-${Date.now()}`,
      role: 'assistant' as const,
      content: 'Setting up your canvas...',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    };
    setMessages([processingMessage]);

    // Wait for processing state
    await new Promise(resolve => setTimeout(resolve, 700));

    // Remove processing message
    setMessages([]);

    // Start transition
    setIsTransitioning(true);
    setIsProcessing(false);

    // Wait for transition animation
    await new Promise(resolve => setTimeout(resolve, 350));

    setIsInitialExperience(false);
    setIsTransitioning(false);
    setHasRespondedToFirstQuestion(true);
    setMessages([]);
  };

const handleSendMessage = async () => {
  if (!inputValue.trim() || isLoading || isProcessing) return;

  resetInactivityTimer();

  const userMessageText = inputValue;
    const { emotion, intensity } = detectEmotion(userMessageText);
    setCurrentEmotion(emotion);
    setEmotionIntensity(intensity);

    const newUserMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      role: 'user' as const,
      content: userMessageText,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInputValue("");
    
    // Handle initial experience processing state
    if (isInitialExperience && !hasRespondedToFirstQuestion) {
      setIsProcessing(true);
      
      // Show processing message
      const processingMessage = {
        id: `msg-processing-${Date.now()}`,
        role: 'assistant' as const,
        content: 'Creating a color palette just for you...',
        timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      };
      setMessages(prev => [...prev, processingMessage]);
      
      // Update emotion palette
      const emotionPalettes: { [key: string]: string[] } = {
        calm: ['#6EE7B7', '#4ECDC4', '#85D4C8', '#A7E9D8', '#B2F5EA', '#81E6D9', '#4FD1C5', '#38B2AC'],
        happy: ['#FCD34D', '#FBBF24', '#F59E0B', '#FFA07A', '#FFD93D', '#FFE66D', '#FF9A8B', '#FFEAA7'],
        excited: ['#FB923C', '#F97316', '#EA580C', '#FF6B6B', '#FF8E53', '#FD79A8', '#FF7675', '#FD5E53'],
        angry: ['#EF4444', '#DC2626', '#B91C1C', '#991B1B', '#7F1D1D', '#FF6348', '#E74C3C', '#C0392B'],
        anxious: ['#C4B5FD', '#A78BFA', '#8B5CF6', '#7C3AED', '#6D28D9', '#9B59B6', '#8E44AD', '#BB8FCE'],
        sad: ['#60A5FA', '#3B82F6', '#2563EB', '#5DADE2', '#3498DB', '#2980B9', '#AED6F1', '#85C1E9'],
        neutral: ['#9CA3AF', '#6B7280', '#4B5563', '#D1D5DB', '#E5E7EB', '#F3F4F6', '#9E9E9E', '#BDBDBD']
      };
      
      const selectedPalette = emotionPalettes[emotion] || emotionPalettes.neutral;
      setEmotionPalette(selectedPalette);
      
      // Wait 600-800ms for processing state
      await new Promise(resolve => setTimeout(resolve, 700));
      
      // Remove processing message
      setMessages(prev => prev.filter(msg => msg.id !== processingMessage.id));
      
      // Start transition
      setIsTransitioning(true);
      setIsProcessing(false);
      
      // Wait for transition animation (300-400ms)
      await new Promise(resolve => setTimeout(resolve, 350));
      
      setIsInitialExperience(false);
      setIsTransitioning(false);
      setHasRespondedToFirstQuestion(true);
      
      // Add AI response with color palette
      const paletteResponse = `You mentioned feeling ${emotion}. Here's a color palette that matches your mood:\n\n[PALETTE:${selectedPalette.join(',')}]`;
      
      const aiMessage = {
        id: `msg-${Date.now()}-${Math.random()}`,
        role: 'assistant' as const,
        content: paletteResponse,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      };
      
      setMessages(prev => [...prev, aiMessage]);
      return;
    }
    
    setIsLoading(true);

    // Generate drawing description if there's a drawing
    let drawingDescription = '';
    if (lastDrawingAnalysis.strokeCount > 0) {
      const lumaInput: LumaInput = {
        strokeData: [],
        shapeData: [],
        faceData: {
          detected: false,
          mouthCurve: 0,
          eyebrowAngle: 0,
          eyeShape: 'none' as const,
          facePosition: { x: 0, y: 0 }
        },
        stickerData: lastDrawingAnalysis.stickersUsed.map((s, i) => ({
          name: s.src,
          x: 0,
          y: 0,
          size: 0,
          rotation: 0
        })),
        colorData: {
          palette: lastDrawingAnalysis.dominantColors.map((c: any) => typeof c === 'string' ? c : c.color),
          dominantColor: (lastDrawingAnalysis.dominantColors[0] as any)?.color || (lastDrawingAnalysis.dominantColors[0] as string) || '#000000',
          dominance: 100
        },
        compositionData: {
          boundingBoxes: [],
          fillRatio: 0,
          centeredness: 50
        },
        strokeCount: lastDrawingAnalysis.strokeCount,
        straightLineRatio: lastDrawingAnalysis.straightLineRatio,
        curveLineRatio: lastDrawingAnalysis.curveLineRatio,
        angularShapes: lastDrawingAnalysis.angularShapes,
        roundShapes: lastDrawingAnalysis.roundShapes,
        strokeSpeed: lastDrawingAnalysis.strokeSpeed,
        strokePressure: lastDrawingAnalysis.strokePressure
      };
      drawingDescription = generateDrawingDescription(lumaInput);
    }

    // Prepare conversation history for OpenAI
    const conversationHistory = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content.includes('[PALETTE:') ? msg.content.split('\n\n[PALETTE:')[0] : msg.content
    }));

    // Add current user message
    conversationHistory.push({
      role: 'user',
      content: userMessageText
    });

    // Call Luma AI via secure backend
  const aiResponse = await callLumaAI(conversationHistory, drawingDescription);

// Check if AI suggested colors and extract palette
const suggestedPalette = extractPaletteFromResponse(aiResponse);

let finalAiResponse = aiResponse;
if (suggestedPalette) {
  setPendingPalette(suggestedPalette);
  finalAiResponse = `${aiResponse}\n\nShall I switch to this recommended palette?`;
}

const aiMessage = {
  id: `msg-${Date.now()}-${Math.random()}`,
  role: 'assistant' as const,
  content: finalAiResponse,
  timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
};

setMessages(prev => [...prev, aiMessage]);
setIsLoading(false);
  };

  // Export drawing and generate QR code
  const handleExport = async () => {
    if (!canvasRef.current) return;
    
    const imageDataUrl = canvasRef.current.exportAsImage();
    if (!imageDataUrl) {
      alert('No drawing to export');
      return;
    }

    setExportImageUrl(imageDataUrl);
    
    // Generate QR code with app URL (not the full image data)
    try {
      const appUrl = window.location.href;
      const qrDataUrl = await QRCode.toDataURL(appUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(qrDataUrl);
      setShowExportModal(true);
    } catch (error) {
      console.error('Error generating QR code:', error);
      // Still show modal even if QR code fails
      setShowExportModal(true);
    }
  };

  // Download the drawing
  const handleDownload = () => {
    if (!exportImageUrl) return;
    
    const link = document.createElement('a');
    link.download = `emotive-journey-${new Date().toISOString().split('T')[0]}.png`;
    link.href = exportImageUrl;
    link.click();
  };

// Reset to initial state function
const resetToInitialState = () => {
  // Reset all states to initial values
  setIsInitialExperience(true);
  setHasRespondedToFirstQuestion(false);
  setMessages([
    {
      role: 'assistant',
      content: 'How do you feel today?',
      id: `msg-${Date.now()}-0`
    }
  ]);
  setInputValue("");
  setSelectedEntryKeywords([]);
  setKeywordPack({
    lens: [],
    action: [],
    derived: [],
    imagePrompt: ''
  });
  setEchoes([]);
  setAsciiArt('');
  setDrawingInterpretation('');
  setLineArtUrl('');
  setLineArtLoading(false);
  setLineArtError('');
  setEmotionPalette([]);
  setPendingPalette(null);
  setCurrentEmotion('calm');
  setEmotionIntensity(65);
  setSelectedCategory(null);
};
  return (
    <DndProvider backend={HTML5Backend}>
    <div className="bg-neutral-50 flex flex-col h-screen w-full overflow-hidden">
      {/* Top Navigation */}
      <div className="bg-white relative shrink-0 w-full border-b border-neutral-200">
        <div className="flex flex-row items-center">
          <div className="flex items-center justify-between px-6 py-4 w-full">
            <div className="flex gap-2 items-center">
              <Palette />
              <p className="text-xl text-black">Interspace</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Sidebar - Drawing Tools */}
        {!isInitialExperience && (
        <div className="bg-white w-60 shrink-0 border-r border-neutral-200 overflow-y-auto min-h-0">
          <div className="flex flex-col gap-10 p-5 bg-white">
            {/* Drawing Tools */}
            <div className="flex-col gap-4 w-full">
              <p className="text-neutral-900 px-[0px] py-[12px] pt-[0px] pr-[0px] pb-[12px] pl-[0px]">Drawing Tools</p>
              
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  {[
                    { id: 'pencil', label: 'Pencil', icon: svgPaths.p17d83200 },
                    { id: 'brush', label: 'Brush', icon: svgPaths.p3945f6f0 }
                  ].map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => {
  setSelectedTool(tool.id as any);
  resetInactivityTimer();
}}
                      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border shadow-sm transition-colors ${
                        selectedTool === tool.id ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-300 hover:bg-neutral-50'
                      } flex-1`}
                    >
                      <div className="w-5 h-5 flex items-center justify-center">
                        <svg fill="none" viewBox="0 0 20 20" className="w-full h-full">
                          <path d={tool.icon} fill="#1C1B1F" />
                        </svg>
                      </div>
                      <p className="text-sm text-black">{tool.label}</p>
                    </button>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  {[
                    { id: 'eraser', label: 'Eraser', icon: svgPaths.p1ab18f00 },
                    { id: 'fill', label: 'Fill', icon: svgPaths.p1d725700 }
                  ].map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => setSelectedTool(tool.id as any)}
                      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border shadow-sm transition-colors ${
                        selectedTool === tool.id ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-300 hover:bg-neutral-50'
                      } flex-1`}
                    >
                      <div className="w-5 h-5 flex items-center justify-center">
                        <svg fill="none" viewBox="0 0 20 20" className="w-full h-full">
                          <path d={tool.icon} fill="#1C1B1F" />
                        </svg>
                      </div>
                      <p className="text-sm text-black">{tool.label}</p>
                    </button>
                  ))}
                </div>
                
                {/* Shape Tool with Dropdown */}
                <div className="relative" ref={shapeDropdownRef}>
                  <button
                    onClick={() => {
                      setSelectedTool('shape');
                      setShowShapeDropdown(!showShapeDropdown);
                    }}
                    className={`flex items-center justify-start gap-2 px-3 py-2 rounded-lg border shadow-sm transition-colors ${
                      selectedTool === 'shape' ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-300 hover:bg-neutral-50'
                    } w-full relative`}
                  >
                    <p className="text-sm text-black">Draw with Shapes</p>
                    <svg
                      className={`w-4 h-4 transition-transform absolute right-3 ${showShapeDropdown ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="#1C1B1F"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {showShapeDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg overflow-hidden z-50"
                      >
                        {[
                          { id: 'circle', label: 'Circle' },
                          { id: 'rectangle', label: 'Rectangle' },
                          { id: 'line', label: 'Line' },
                          { id: 'triangle', label: 'Triangle' }
                        ].map((shape) => (
                          <button
                            key={shape.id}
                            onClick={() => {
                              setSelectedShape(shape.id as any);
                              setShowShapeDropdown(false);
                            }}
                            className={`w-full px-3 py-2 text-sm text-left hover:bg-neutral-50 transition-colors ${
                              selectedShape === shape.id ? 'bg-neutral-100' : ''
                            }`}
                          >
                            {shape.label}
                            {selectedShape === shape.id && <span className="float-right">✓</span>}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Brush Size */}
              <div className="flex flex-col gap-4">
                <p className="text-sm text-neutral-900 p-[0px] mt-[20px] mr-[0px] mb-[0px] ml-[0px]">Brush Size</p>
                <div className="flex flex-col gap-2">
                  <div className="relative h-2 bg-neutral-200 rounded-full">
                    <div className="absolute border-[0.5px] border-neutral-400 inset-0 rounded-full" />
                    <motion.div 
                      className="absolute top-0 h-2 bg-blue-500 rounded-full flex items-center justify-center pointer-events-none"
                      style={{ width: `${(brushSize / 50) * 100}%` }}
                    >
                      <div className="absolute -right-2 w-4 h-4 bg-blue-500 rounded-full shadow-md" />
                    </motion.div>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="absolute inset-0 w-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-neutral-500">
                    <span>1px</span>
                    <span>{brushSize}px</span>
                    <span>50px</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Colors */}
            <div className="flex flex-col gap-2 w-full">
              <Colors 
                color={currentColor}
                onChange={handleColorChange}
                recentColors={recentColors}
                onRecentColorClick={(color) => setCurrentColor(color)}
                onColorSpaceClick={handleColorSpaceClick}
                emotionPalette={emotionPalette}
              />
              <button
                onClick={() => setSelectedTool('eyedropper')}
                className={`flex items-center justify-center w-5 h-5 rounded transition-colors ${
                  selectedTool === 'eyedropper' ? 'bg-neutral-900 text-white' : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
                }`}
                title="Eyedropper"
              >
                <Pipette className="w-3 h-3" />
              </button>
            </div>

            {/* Stickers */}
            <div className="flex flex-col gap-4 w-full">
              <p className="text-neutral-900">Stickers</p>
              {stickerPlacementMode && (
                <div className="text-xs text-neutral-600 bg-blue-50 border border-blue-200 rounded p-2">
                  💡 Drag on canvas to place and resize. ESC to cancel.
                </div>
              )}
              <div className="grid grid-cols-5 gap-2">
  {[
    '😊', '😄', '🥰', '😢', '😭', 
    '😠', '😤', '😰', '😨', '😌', 
    '😴', '🤔', '😐', '😞', '🤩',
    '❤️', '💔', '💙', '💛', '💚',
    '🔥', '⚡', '☁️', '🌈', '✨'
  ].map((emoji, i) => (
    <button
      key={i}
      onClick={() => handleStickerSelect(emoji)}
      className={`aspect-square text-2xl flex items-center justify-center rounded-lg border-2 transition-all hover:scale-110 ${
        pendingSticker === emoji 
          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-300' 
          : 'border-neutral-200 hover:border-neutral-400'
      }`}
    >
      {emoji}
    </button>
  ))}
</div>
            </div>
          </div>
        </div>
        )}

        {/* Center - Canvas */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
          {/* Canvas Header */}
          <div className="bg-white border-b border-neutral-200 px-5 py-3">
            <div className="flex items-center justify-between">
              <p className="text-neutral-900">
                {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} Drawing
              </p>
              <div className="flex gap-3">
                <button
                  onClick={undo}
                  disabled={!canUndo}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg border border-neutral-300 shadow-sm hover:bg-neutral-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 6 10">
                    <path d={svgPaths.p24ed3d00} fill="#1C1B1F" />
                  </svg>
                  <span className="text-sm">Undo</span>
                </button>
                <button
                  onClick={redo}
                  disabled={!canRedo}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg border border-neutral-300 shadow-sm hover:bg-neutral-50 transition-colors"
                >
                  <span className="text-sm">Redo</span>
                  <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 6 10">
                    <path d={svgPaths.p24ed3d00} fill="#1C1B1F" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

    {/* Canvas Area */}
          <div className="flex-1 min-h-0 p-5 overflow-hidden relative flex flex-col">
            <div className="flex-1 min-h-0 w-full">
              <DrawingCanvas
                tool={selectedTool}
                brushSize={brushSize}
                color={currentColor}
                onColorPick={handleColorPick}
                selectedShape={selectedShape}
                onSaveState={saveCanvasState}
                onDrawingAnalysis={analyzeDrawing}
                onStrokeEnd={handleStrokeEnd}
                ref={canvasRef}
                pendingSticker={pendingSticker}
                onStickerPlaced={handleStickerPlaced}
              />
            </div>

            {/* Sticker Placement Mode Guide */}
            {stickerPlacementMode && pendingSticker && (
              <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg text-sm pointer-events-none z-50">
                Drag to resize sticker
              </div>
            )}

            {/* Keyword Pack Overlay - Lens + Trace only */}
            {interspaceMode && keywordPack.lens.length > 0 && (
              <div className="absolute top-8 left-8 bg-white/95 backdrop-blur-sm border border-neutral-200 rounded-lg p-4 shadow-lg">
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-neutral-500 text-xs">Core Keywords:</span>
                    <p className="text-neutral-900 capitalize">{keywordPack.lens.join(', ')}</p>
                  </div>
                  <div>
                    <span className="text-neutral-500 text-xs">Interpretation:</span>
                    <p className="text-neutral-900 capitalize">{keywordPack.action.length > 0 ? keywordPack.action.join(', ') : '—'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right Sidebar — onboarding or ASCII / interpretation / line art */}
        <motion.div 
          className="bg-white border-l border-neutral-200 flex flex-col min-h-0 relative overflow-hidden min-w-0 self-stretch shrink-0"
          initial={{ width: '100%' }}
          animate={{ 
            width: isInitialExperience ? '100%' : '420px'
          }}
          transition={{ 
            duration: isTransitioning ? 0.35 : 0,
            ease: [0.4, 0, 0.2, 1]
          }}
        >
          <AnimatedBackground emotion={currentEmotion} />
          
          {/* Gallery Strip - shown after initial experience */}
          {!isInitialExperience && hasRespondedToFirstQuestion && (
            <div className="relative z-10 flex-1 min-h-0 overflow-y-auto overscroll-contain bg-white/50 backdrop-blur-sm">
              <div className="p-4 space-y-4">
                {/* Echoes Title */}
                <div className="text-xs text-[rgb(0,0,0)] text-[20px] pt-[4px] pr-[0px] pb-[12px] pl-[0px]">I am thinking about...</div>

                {/* ASCII Association Panel */}
                <div className="flex gap-3">
                  <div className="flex-1 rounded-lg border border-neutral-800 bg-black p-4 relative overflow-hidden aspect-square max-h-full">
                    <div className="relative w-full h-full flex items-center justify-center">
                      {/* Particle animation overlay */}
                      <AnimatePresence mode="wait">
                        {isAsciiTransitioning && (
                          <motion.div
                            key="particles"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 pointer-events-none"
                          >
                            {[...Array(12)].map((_, i) => (
                              <motion.div
                                key={i}
                                className="absolute w-1 h-1 bg-white rounded-full"
                                style={{
                                  left: '50%',
                                  top: '50%',
                                }}
                                animate={{
                                  x: [0, (Math.random() - 0.5) * 100],
                                  y: [0, (Math.random() - 0.5) * 60],
                                  opacity: [1, 0],
                                }}
                                transition={{
                                  duration: 0.4,
                                  ease: "easeOut"
                                }}
                              />
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* ASCII text */}
                      <motion.pre
                        key={asciiArt}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: isAsciiTransitioning ? 0.4 : 0 }}
                        className="text-white text-sm leading-tight font-mono"
                      >
                        {asciiArt || '···'}
                      </motion.pre>
                    </div>
                  </div>
                </div>

                {/* Keywords */}
                <div className="relative">
                  {/* Speech bubble tail */}
                  <div className="absolute -top-2 right-4 w-3 h-3 bg-neutral-50/50 border-t border-r border-neutral-200 rotate-45 transform origin-center"></div>
                  
                  {/* Speech bubble container */}
                  <div className="flex flex-wrap gap-2">
                    {echoes.length > 0 ? (
                      echoes.map((echo, index) => {
                        return (
                          <motion.div
                            key={`${echo}-${index}`}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                            className="relative h-8"
                            style={{ minWidth: `${Math.max(echo.length * 12 + 32, 80)}px` }}
                          >
                            <svg 
                              className="absolute inset-0 w-full h-full" 
                              fill="none" 
                              preserveAspectRatio="none" 
                              viewBox="0 0 180.668 54.9512"
                            >
                              <g clipPath="url(#clip0_echo)">
                                <rect fill="black" height="46" rx="23" width="174" y="8.95117" />
                                <path d={echoSvgPaths.p3c448bc0} fill="black" />
                              </g>
                              <defs>
                                <clipPath id="clip0_echo">
                                  <rect fill="white" height="54.9512" width="180.668" />
                                </clipPath>
                              </defs>
                            </svg>
                            <span className="relative z-10 flex items-center justify-center h-full text-white text-xs px-4 pt-[4px] pr-[16px] pb-[0px] pl-[16px]">
  {echo.charAt(0).toUpperCase() + echo.slice(1)}
</span>
                          </motion.div>
                        );
                      })
                    ) : (
                      <div className="text-neutral-300 text-xs">—</div>
                    )}
                  </div>
                </div>

                {/* AI Creative Response */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-neutral-500 font-medium uppercase tracking-wide">
                      Another perspective
                    </div>
                    <div className="flex gap-1">
                      {([
                        { mode: 'whatif',    label: 'What if...',    tooltip: 'Imagine this in another world' },
                        { mode: 'opposite',  label: 'The opposite',  tooltip: 'Flip the feeling' },
                        { mode: 'expand',    label: 'Stretch it',    tooltip: 'Push it further' },
                        { mode: 'challenge', label: 'Question it',   tooltip: 'What\'s hidden here?' },
                      ] as const).map(({ mode: m, label, tooltip }) => (
                        <div key={m} className="relative group">
                          <button
                            onClick={() => {
                              setCreativeMode(m);
                              if (drawingThumbnail) void triggerCreativeResponse(drawingThumbnail, m);
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                              creativeMode === m
                                ? 'bg-neutral-900 text-white border-neutral-900'
                                : 'border-neutral-300 text-neutral-500 hover:border-neutral-500'
                            }`}
                          >
                            {label}
                          </button>
                          {/* Tooltip */}
                          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
                            <div className="whitespace-nowrap rounded-md px-3 py-2 text-white text-[13px] leading-none" style={{ background: '#1a1a1a' }}>
                              {tooltip}
                            </div>
                            {/* Arrow */}
                            <div className="mx-auto w-0 h-0" style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #1a1a1a' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {creativeResponseLoading && (
                    <div className="flex items-center justify-center gap-2 text-sm text-neutral-500 w-full aspect-square max-h-[360px] border border-dashed border-neutral-300 rounded-lg">
                      <span className="inline-block w-5 h-5 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin" />
                      Thinking…
                    </div>
                  )}
                  {creativeResponseUrl && !creativeResponseLoading && (
                    <div className="rounded-lg border border-neutral-200 overflow-hidden bg-white">
                      <img
                        src={creativeResponseUrl}
                        alt="AI creative reinterpretation"
                        className="w-full h-auto object-contain max-h-[360px]"
                      />
                    </div>
                  )}
                  {!creativeResponseUrl && !creativeResponseLoading && (
                    <div className="text-xs text-neutral-400 py-3 text-center border border-dashed border-neutral-200 rounded-lg">
                      Start drawing — I'll imagine something back
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* Onboarding only — no chat after Start */}
          {isInitialExperience ? (
            <div className="flex-1 min-h-0 relative z-10 flex items-center justify-center overflow-hidden p-8">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                className="max-w-2xl w-full"
              >
                <div className="rounded-2xl p-8 bg-white/90 backdrop-blur-sm border border-neutral-200 shadow-lg">
                  <h2 className="text-2xl text-neutral-900 mb-6 text-center">
                    What will you draw?
                  </h2>

                  {/* Category Grid */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {DRAWING_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                        className={`px-4 py-3 rounded-lg border text-sm transition-all ${
                          selectedCategory === cat.id
                            ? 'bg-neutral-900 text-white border-neutral-900'
                            : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Start Button */}
                  <button
                    onClick={() => selectedCategory && handleEnterKeywords()}
                    disabled={!selectedCategory}
                    className={`w-full px-4 py-3 rounded-lg transition-colors ${
                      selectedCategory
                        ? 'bg-neutral-900 text-white hover:bg-neutral-700'
                        : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                    }`}
                  >
                    Start
                  </button>
                </div>
              </motion.div>
            </div>
          ) : null}
        </motion.div>
      </div>
      

      {/* Export QR Code Modal */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowExportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl text-neutral-900">Export Drawing</h2>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-600" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Drawing Preview */}
                <div className="border border-neutral-200 rounded-lg p-3 bg-neutral-50">
                  <p className="text-sm text-neutral-600 mb-2">Your Drawing</p>
                  {exportImageUrl && (
                    <img 
                      src={exportImageUrl} 
                      alt="Drawing Preview" 
                      className="w-full rounded border border-neutral-200"
                    />
                  )}
                </div>

                {/* QR Code */}
                <div className="border border-neutral-200 rounded-lg p-3 bg-neutral-50">
                  <p className="text-sm text-neutral-600 mb-2">Share Interspace</p>
                  {qrCodeUrl && (
                    <div className="flex justify-center">
                      <img 
                        src={qrCodeUrl} 
                        alt="QR code" 
                        className="w-64 h-64"
                      />
                    </div>
                  )}
                  <p className="text-xs text-neutral-500 text-center mt-2">
                    Scan QR code to visit Interspace
                  </p>
                </div>

                {/* Download Button */}
                <button
                  onClick={handleDownload}
                  className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white px-4 py-3 rounded-lg hover:bg-neutral-700 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Download Drawing
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </DndProvider>
  );
}