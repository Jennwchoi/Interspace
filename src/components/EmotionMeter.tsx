import { motion } from "motion/react";

interface EmotionMeterProps {
  emotion: string;
  intensity: number;
}

const emotionColors = {
  calm: { bg: "#6EE7B7", text: "Calm" },
  happy: { bg: "#FCD34D", text: "Happy" },
  excited: { bg: "#FB923C", text: "Excited" },
  angry: { bg: "#EF4444", text: "Angry" },
  anxious: { bg: "#C4B5FD", text: "Anxious" },
  sad: { bg: "#9CA3AF", text: "Sad" },
  neutral: { bg: "#D1D5DB", text: "Neutral" }
};

export function EmotionMeter({ emotion, intensity }: EmotionMeterProps) {
  const currentEmotion = emotionColors[emotion as keyof typeof emotionColors] || emotionColors.neutral;
  
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <p className="text-neutral-600">Emotion Meter</p>
        <p className="text-neutral-900">Your sketch feels: <span className="font-medium">{currentEmotion.text}</span></p>
      </div>
      <div className="relative h-2 bg-neutral-100 rounded-full overflow-hidden">
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{ backgroundColor: currentEmotion.bg }}
          initial={{ width: 0 }}
          animate={{ width: `${intensity}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}