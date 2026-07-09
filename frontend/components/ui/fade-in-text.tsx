'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface FadeInTextProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export function FadeInText({ children, delay = 0, duration = 0.6, className }: FadeInTextProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ 
        duration,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}