'use client';

import { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
}

export function AnimatedCounter({ value, duration = 1, decimals = 0 }: AnimatedCounterProps) {
  const spring = useSpring(value, { duration: duration * 1000 });
  const display = useTransform(spring, (current) => 
    Math.round(current * Math.pow(10, decimals)) / Math.pow(10, decimals)
  );

  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const unsubscribe = display.onChange(setDisplayValue);
    return unsubscribe;
  }, [display]);

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <span>{displayValue.toFixed(decimals)}</span>;
}