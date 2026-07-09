'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePulseStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { Battery, Signal, MapPin, Activity, Zap, Clock, Brain } from 'lucide-react';
import { AnimatedCounter } from '@/components/ui/animated-counter';

export default function EdgeNodeStatus() {
  const {
    pipelineHealth,
    wsSignalQuality,
    currentGPS,
    lastUpdate,
    isConnected,
    pipelineStatus,
    hasActiveSession,
  } = usePulseStore();

  const getHealthColor = (health: string) => {
    if (health === 'Optimal') return 'text-green-400';
    if (health === 'Warning') return 'text-yellow-400';
    return 'text-red-400';
  };

  const healthPercent = pipelineStatus === 'Optimal' ? 98 : pipelineStatus === 'Warning' ? 75 : 45;

  const getPipelineColor = (level: number) => {
    if (level >= 60) return 'bg-green-400';
    if (level >= 30) return 'bg-yellow-400';
    return 'bg-red-400';
  };

  const getSignalColor = (strength: number) => {
    if (strength >= 80) return 'bg-green-400';
    if (strength >= 50) return 'bg-yellow-400';
    return 'bg-red-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 10 }}
              className="p-2.5 rounded-xl"
              style={{ background: 'linear-gradient(135deg, #1f6feb 0%, #8b5cf6 100%)' }}
            >
              <Zap className="w-5 h-5 text-white" />
            </motion.div>
            <span className="text-lg font-semibold text-white">Pipeline Status</span>
            <Badge
              variant="outline"
              className={`ml-auto px-3 py-1 ${isConnected
                ? 'bg-green-500/10 text-green-400 border-green-500/30'
                : 'bg-red-500/10 text-red-400 border-red-500/30'
                }`}
            >
              <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              {isConnected ? 'Online' : 'Offline'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Pipeline Health */}
            <motion.div
              className="p-4 rounded-xl"
              style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)' }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg" style={{ background: 'rgba(74, 222, 128, 0.1)' }}>
                  <Battery className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Pipeline</span>
              </div>
              <div className="text-2xl font-bold text-white tabular-nums mb-2">
                <AnimatedCounter value={pipelineHealth} />%
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
                <motion.div
                  className={`h-full rounded-full ${getPipelineColor(pipelineHealth)}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${pipelineHealth}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </motion.div>

            {/* WebSocket Signal */}
            <motion.div
              className="p-4 rounded-xl"
              style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)' }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg" style={{ background: 'rgba(96, 165, 250, 0.1)' }}>
                  <Signal className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Signal</span>
              </div>
              <div className="text-2xl font-bold text-white tabular-nums mb-2">
                <AnimatedCounter value={wsSignalQuality} />%
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
                <motion.div
                  className={`h-full rounded-full ${getSignalColor(wsSignalQuality)}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${wsSignalQuality}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </motion.div>

            {/* GPS Position */}
            <motion.div
              className="p-4 rounded-xl"
              style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)' }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg" style={{ background: 'rgba(168, 85, 247, 0.1)' }}>
                  <MapPin className="w-4 h-4 text-purple-400" />
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Position</span>
              </div>
              <div className="text-2xl font-bold text-white tabular-nums mb-2">
                <AnimatedCounter value={Math.round(currentGPS.lat * 100) / 100} />°
              </div>
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                <span className="tabular-nums">{currentGPS.lng.toFixed(4)}° lng</span>
              </div>
            </motion.div>

            {/* System Health */}
            <motion.div
              className="p-4 rounded-xl"
              style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)' }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                  <Activity className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Health</span>
              </div>
              <div className={`text-2xl font-bold tabular-nums ${getHealthColor(pipelineStatus)}`}>
                <AnimatedCounter value={healthPercent} />%
              </div>
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                All systems operational
              </div>
            </motion.div>
          </div>

          {/* Agent Status Strip */}
          <div
            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl gap-4"
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.2)'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ background: 'rgba(139, 92, 246, 0.2)' }}>
                <Brain className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <span className="text-sm font-medium text-purple-300">Pipeline State:</span>
                <span className="ml-2 text-sm text-white">
                  {hasActiveSession ? 'Recording. Processing road segments' : 'Idle. Waiting for survey session'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
              <Clock className="w-4 h-4" />
              <span className="text-sm">
                Last Update: <span className="font-medium text-white tabular-nums">{lastUpdate}</span>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}