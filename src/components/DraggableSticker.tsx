import { useDrag } from "react-dnd";

interface DraggableStickerProps {
  src: string; // Can be either an emoji string or image URL
  alt: string;
}

export function DraggableSticker({ src, alt }: DraggableStickerProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'sticker',
    item: { src, alt },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [src, alt]);

  // Check if src is an emoji (single character or emoji)
  const isEmoji = src.length <= 4 && !/^https?:\/\//.test(src) && !src.startsWith('figma:');

  return (
    <div
      ref={drag}
     className={`w-full h-full rounded-lg border border-neutral-200 hover:border-neutral-400 bg-white hover:bg-neutral-50 transition-all cursor-grab active:cursor-grabbing flex items-center justify-center ${
  isDragging ? 'opacity-50' : 'opacity-100'
}`}
    >
      {isEmoji ? (
        <span className="text-2xl select-none" role="img" aria-label={alt}>
          {src}
        </span>
      ) : (
        <img 
          alt={alt} 
          src={src} 
          className="max-w-full max-h-full object-contain p-1" 
          draggable={false}
        />
      )}
    </div>
  );
}
