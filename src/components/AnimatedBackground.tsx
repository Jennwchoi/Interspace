import { motion } from "motion/react";

interface AnimatedBackgroundProps {
  emotion: string;
}

const emotionGradients = {
  calm: {
    from: "rgba(110, 231, 183, 0.15)",
    via: "rgba(147, 197, 253, 0.12)",
    to: "rgba(196, 181, 253, 0.1)"
  },
  happy: {
    from: "rgba(252, 211, 77, 0.2)",
    via: "rgba(251, 146, 60, 0.15)",
    to: "rgba(253, 186, 116, 0.18)"
  },
  excited: {
    from: "rgba(251, 146, 60, 0.2)",
    via: "rgba(252, 211, 77, 0.15)",
    to: "rgba(248, 113, 113, 0.18)"
  },
  angry: {
    from: "rgba(239, 68, 68, 0.2)",
    via: "rgba(220, 38, 38, 0.15)",
    to: "rgba(185, 28, 28, 0.18)"
  },
  anxious: {
    from: "rgba(196, 181, 253, 0.18)",
    via: "rgba(167, 139, 250, 0.15)",
    to: "rgba(139, 92, 246, 0.12)"
  },
  sad: {
    from: "rgba(156, 163, 175, 0.12)",
    via: "rgba(209, 213, 219, 0.1)",
    to: "rgba(156, 163, 175, 0.15)"
  },
  neutral: {
    from: "rgba(209, 213, 219, 0.1)",
    via: "rgba(229, 231, 235, 0.08)",
    to: "rgba(209, 213, 219, 0.1)"
  }
};

export function AnimatedBackground({ emotion }: AnimatedBackgroundProps) {
  const gradient = emotionGradients[emotion as keyof typeof emotionGradients] || emotionGradients.neutral;
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
      >
        <motion.div
          className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full blur-3xl"
          style={{
            background: `radial-gradient(circle, ${gradient.from}, transparent 70%)`
          }}
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-1/4 -right-1/4 w-3/4 h-3/4 rounded-full blur-3xl"
          style={{
            background: `radial-gradient(circle, ${gradient.via}, transparent 70%)`
          }}
          animate={{
            x: [0, -30, 0],
            y: [0, 40, 0],
            scale: [1, 1.15, 1]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute -bottom-1/4 left-1/4 w-3/4 h-3/4 rounded-full blur-3xl"
          style={{
            background: `radial-gradient(circle, ${gradient.to}, transparent 70%)`
          }}
          animate={{
            x: [0, -40, 0],
            y: [0, -20, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </motion.div>
    </div>
  );
}