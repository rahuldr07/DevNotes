"use client";

import {
  MotionConfig,
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

/**
 * Honours `prefers-reduced-motion` for every Framer component at once.
 *
 * `reducedMotion="user"` makes Framer skip transform and layout animations
 * while still allowing opacity, so overlays keep their fade but stop flying
 * in. Individual components (Reveal, AnimatedNumber) already checked the
 * preference; the ones that animate directly — the command palette, the
 * version drawer — did not, which is exactly the kind of thing that gets
 * missed one component at a time.
 */
export function MotionPreferences({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
