// Creative Mode Selector Component
// Allows users to choose transformation mode: opposite, whatif, expand, challenge

import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  CreativeMode, 
  CREATIVE_MODES, 
  creativeTransform 
} from '../utils/creativeApi';

interface CreativeModeSelectorProps {
  onTransform: (imageUrl: string, mode: CreativeMode) => void;
  getCanvasImage: () => string | null;
  userKeywords?: string[];
  disabled?: boolean;
}

export function CreativeModeSelector({
  onTransform,
  getCanvasImage,
  userKeywords = [],
  disabled = false,
}: CreativeModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<CreativeMode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleModeSelect = async (mode: CreativeMode) => {
    setSelectedMode(mode);
    setError(null);
    setIsLoading(true);

    try {
      const imageDataUrl = getCanvasImage();
      if (!imageDataUrl) {
        throw new Error('캔버스에서 이미지를 가져올 수 없습니다');
      }

      const result = await creativeTransform(imageDataUrl, mode, userKeywords);

      if (result.error) {
        throw new Error(result.error);
      }

      onTransform(result.imageUrl, mode);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '변환 중 오류가 발생했습니다';
      setError(errorMessage);
      console.error('Transform error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const modes = Object.keys(CREATIVE_MODES) as CreativeMode[];

  return (
    <div className="flex flex-col gap-3 p-4 bg-neutral-50 rounded-xl">
      <h3 className="text-sm font-medium text-neutral-700 mb-1">
        AI 창의적 변환
      </h3>
      
      <div className="grid grid-cols-2 gap-2">
        {modes.map((mode) => {
          const info = CREATIVE_MODES[mode];
          const isSelected = selectedMode === mode;
          const isDisabled = disabled || isLoading;

          return (
            <motion.button
              key={mode}
              onClick={() => handleModeSelect(mode)}
              disabled={isDisabled}
              className={`
                flex flex-col items-center justify-center p-3 rounded-lg
                border-2 transition-all duration-200
                ${isSelected 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-neutral-200 bg-white hover:border-blue-300'}
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              whileHover={{ scale: isDisabled ? 1 : 1.02 }}
              whileTap={{ scale: isDisabled ? 1 : 0.98 }}
            >
              <span className="text-2xl mb-1">{info.icon}</span>
              <span className="text-sm font-medium text-neutral-800">
                {info.name}
              </span>
              <span className="text-xs text-neutral-500 text-center mt-0.5">
                {info.description}
              </span>
            </motion.button>
          );
        })}
      </div>

      {isLoading && (
        <motion.div 
          className="flex items-center justify-center gap-2 py-2 text-sm text-blue-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          AI가 창의적으로 변환 중...
        </motion.div>
      )}

      {error && (
        <motion.p 
          className="text-sm text-red-500 text-center py-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}