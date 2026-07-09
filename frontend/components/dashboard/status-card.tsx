'use client';

import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { FadeInText } from '@/components/ui/fade-in-text';

interface StatusCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  delay?: number;
}

export function StatusCard({ title, icon, children, delay = 0 }: StatusCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="h-full"
    >
      <Card className="h-full bg-white/80 backdrop-blur-sm border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-300">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            {icon && (
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="text-blue-600"
              >
                {icon}
              </motion.div>
            )}
            <FadeInText delay={delay + 0.1}>{title}</FadeInText>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  unit: string;
  description: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'stable';
  showProgress?: boolean;
  delay?: number;
}

export function MetricCard({ title, value, unit, description, icon, trend, showProgress, delay = 0 }: MetricCardProps) {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  const decimals = numericValue % 1 !== 0 ? 2 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{
        y: -6,
        scale: 1.02,
        transition: { duration: 0.2, ease: 'easeOut' }
      }}
      className="h-full"
    >
      <Card className="h-full bg-gradient-to-br from-white to-gray-50/50 backdrop-blur-sm border-gray-200/50 shadow-sm hover:shadow-lg transition-all duration-300 group">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <FadeInText delay={delay + 0.1}>
              <h3 className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">
                {title}
              </h3>
            </FadeInText>
            {icon && (
              <motion.div
                className="text-gray-400 group-hover:text-blue-500 transition-colors"
                whileHover={{ scale: 1.2, rotate: 10 }}
              >
                {icon}
              </motion.div>
            )}
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <motion.span
              className="text-3xl font-bold text-gray-900 tabular-nums"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: delay + 0.2, type: 'spring', stiffness: 200 }}
            >
              <AnimatedCounter value={numericValue} decimals={decimals} />
            </motion.span>
            <FadeInText delay={delay + 0.3}>
              <span className="text-sm font-medium text-gray-500">{unit}</span>
            </FadeInText>
          </div>

          <FadeInText delay={delay + 0.4}>
            <p className="text-xs text-gray-600 mb-3">{description}</p>
          </FadeInText>

          {showProgress && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: delay + 0.5, duration: 0.8, ease: 'easeOut' }}
              className="origin-left"
            >
              <Progress value={Number(value)} className="h-2" />
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface ActionCardProps {
  title: string;
  value: string | number;
  description: string;
  status?: 'success' | 'warning' | 'danger';
  icon?: ReactNode;
  showBadge?: boolean;
  delay?: number;
}

export function ActionCard({ title, value, description, status, icon, showBadge, delay = 0 }: ActionCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'success': return 'from-green-50 to-green-100/50 border-green-200/50';
      case 'warning': return 'from-amber-50 to-amber-100/50 border-amber-200/50';
      case 'danger': return 'from-red-50 to-red-100/50 border-red-200/50';
      default: return 'from-white to-gray-50/50 border-gray-200/50';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{
        y: -6,
        scale: 1.02,
        transition: { duration: 0.2, ease: 'easeOut' }
      }}
      className="h-full"
    >
      <Card className={`h-full bg-gradient-to-br ${getStatusColor()} backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300 group`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <FadeInText delay={delay + 0.1}>
              <h3 className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">
                {title}
              </h3>
            </FadeInText>
            {icon && (
              <motion.div
                className="text-gray-400 group-hover:text-blue-500 transition-colors"
                whileHover={{ scale: 1.2, rotate: 10 }}
              >
                {icon}
              </motion.div>
            )}
          </div>

          <motion.div
            className="mb-2"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: delay + 0.2, type: 'spring', stiffness: 200 }}
          >
            <span className="text-3xl font-bold text-gray-900 tabular-nums">
              {typeof value === 'number' ? (
                <AnimatedCounter value={value} />
              ) : (
                value
              )}
            </span>
          </motion.div>

          <FadeInText delay={delay + 0.3}>
            <p className="text-xs text-gray-600 mb-4">{description}</p>
          </FadeInText>

          {showBadge && status === 'warning' && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: delay + 0.4, type: 'spring', stiffness: 200 }}
            >
              <Badge
                variant="secondary"
                className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 shadow-sm"
              >
                <motion.span
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                  className="mr-1"
                >
                  ⚠️
                </motion.span>
                Warning
              </Badge>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}