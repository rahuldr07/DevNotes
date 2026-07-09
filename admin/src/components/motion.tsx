"use client";

import {
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { useEffect } from "react";

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

/**
 * Fade-and-rise entrance for panels. Renders a plain div when the user
 * prefers reduced motion.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.21, 0.6, 0.35, 1] }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Springs a stat from 0 to its value on mount — the terminal-counter feel.
 * Falls back to the static number under reduced motion.
 */
export function AnimatedNumber({ value }: { value: number }) {
  const reduceMotion = useReducedMotion();
  const spring = useSpring(0, { stiffness: 110, damping: 24 });
  const display = useTransform(spring, (current) =>
    Math.round(current).toString(),
  );

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  if (reduceMotion) {
    return <>{value}</>;
  }

  return <motion.span>{display}</motion.span>;
}
