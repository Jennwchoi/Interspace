import { useState, useRef, useEffect } from "react";

interface ColorsProps {
  className?: string;
  color?: string;
  onChange?: (color: string) => void;
  recentColors?: string[];
  onRecentColorClick?: (color: string) => void;
  onColorSpaceClick?: (color: string) => void;
  emotionPalette?: string[];
}

function Colors({ className, color = "#1708FF", onChange, recentColors = ['#000000', '#404040', '#737373', '#A3A3A3', '#E5E5E5', '#FFFFFF'], onRecentColorClick, onColorSpaceClick, emotionPalette = [] }: ColorsProps) {
  
  // Default palette
  const defaultPalette = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', 
    '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85929E'
  ];

  return (
    <div className={className} data-name="Colors">
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.4] not-italic relative shrink-0 text-[16px] text-neutral-900 w-full">Color</p>
      <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full">
        
        {/* Emotion-based Color Palette */}
        {emotionPalette.length > 0 && (
          <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full">
            <p className="font-['Inter:Light',sans-serif] font-light leading-none not-italic relative shrink-0 text-[#1e1e1e] text-[10px] text-nowrap whitespace-pre">Emotion Palette</p>
            <div className="bg-[rgba(0,0,0,0)] relative shrink-0 w-full" data-name="div">
              <div aria-hidden="true" className="absolute border-0 border-gray-200 border-solid inset-0 pointer-events-none" />
              <div className="grid grid-cols-8 gap-1.5 w-[200px]">
                {emotionPalette.map((paletteColor, i) => {
                  return (
                    <div 
                      key={i}
                      className="relative rounded-[4px] shrink-0 w-[22px] h-[22px] cursor-pointer hover:scale-110 transition-transform" 
                      data-name="div"
                      style={{ backgroundColor: paletteColor }}
                      onClick={() => onRecentColorClick?.(paletteColor)}
                    >
                      <div aria-hidden="true" className={`absolute border-solid inset-0 pointer-events-none rounded-[4px] ${paletteColor === color ? 'border-[1.899px] border-neutral-900' : 'border-[0.949px] border-neutral-300'}`} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        
        {/* Default Color Palette */}
        <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full">
          <p className="font-['Inter:Light',sans-serif] font-light leading-none not-italic relative shrink-0 text-[#1e1e1e] text-[10px] text-nowrap whitespace-pre"></p>
          <div className="bg-[rgba(0,0,0,0)] relative shrink-0 w-full" data-name="div">
            <div aria-hidden="true" className="absolute border-0 border-gray-200 border-solid inset-0 pointer-events-none" />
            <div className="grid grid-cols-8 gap-1.5 w-[200px]">
              {defaultPalette.map((paletteColor, i) => {
                return (
                  <div 
                    key={i}
                    className="relative rounded-[4px] shrink-0 w-[22px] h-[22px] cursor-pointer hover:scale-110 transition-transform" 
                    data-name="div"
                    style={{ backgroundColor: paletteColor }}
                    onClick={() => onRecentColorClick?.(paletteColor)}
                  >
                    <div aria-hidden="true" className={`absolute border-solid inset-0 pointer-events-none rounded-[4px] ${paletteColor === color ? 'border-[1.899px] border-neutral-900' : 'border-[0.949px] border-neutral-300'}`} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { Colors };

export default function Colors1(props: Omit<ColorsProps, 'className'>) {
  return <Colors {...props} className="content-stretch flex flex-col gap-[16px] items-start relative size-full" />;
}