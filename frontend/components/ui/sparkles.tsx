"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";

interface SparkleType {
  id: string;
  x: string;
  y: string;
  color: string;
  delay: number;
  scale: number;
}

export const SparklesCore = ({
  className,
  background = "transparent",
  minSize = 0.4,
  maxSize = 1,
  particleDensity = 100,
  particleColor = "#FFF",
}: {
  className?: string;
  background?: string;
  minSize?: number;
  maxSize?: number;
  particleDensity?: number;
  particleColor?: string;
}) => {
  const [sparkles, setSparkles] = useState<SparkleType[]>([]);

  useEffect(() => {
    const generateSparkles = () => {
      const newSparkles: SparkleType[] = [];
      for (let i = 0; i < particleDensity; i++) {
        newSparkles.push({
          id: `sparkle-${i}`,
          x: `${Math.random() * 100}%`,
          y: `${Math.random() * 100}%`,
          color: particleColor,
          delay: Math.random() * 2,
          scale: Math.random() * (maxSize - minSize) + minSize,
        });
      }
      setSparkles(newSparkles);
    };

    generateSparkles();
  }, [particleDensity, minSize, maxSize, particleColor]);

  return (
    <div
      className={cn("absolute inset-0 overflow-hidden", className)}
      style={{ background }}
    >
      <AnimatePresence>
        {sparkles.map((sparkle) => (
          <motion.span
            key={sparkle.id}
            className="absolute block rounded-full"
            style={{
              left: sparkle.x,
              top: sparkle.y,
              width: sparkle.scale * 4,
              height: sparkle.scale * 4,
              backgroundColor: sparkle.color,
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, sparkle.scale, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: sparkle.delay,
              ease: "easeInOut",
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
