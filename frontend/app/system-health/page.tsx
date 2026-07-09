'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePulseStore } from '@/lib/store';
import { MapPin, Navigation, Clock, AlertTriangle, Activity, Satellite, Gauge } from 'lucide-react';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function SystemHealth() {
  const { currentGPS, lastUpdate, currentSpeedKmh, hasActiveSession, globalStats, pipelineStatus } = usePulseStore();

  return (
    <ProtectedRoute>
      <MainLayout
        title="System Health"
        description="PULSE pipeline status and GPS tracking"
      >
        <motion.div
          className="space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {/* Status Header */}
          <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-4">
            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30 px-3 py-1.5">
              <motion.div
                className="w-2 h-2 bg-green-400 rounded-full mr-2"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              {pipelineStatus === 'Optimal' ? 'System Online' : 'System Warning'}
            </Badge>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Last Update: <span className="text-white font-medium tabular-nums">{lastUpdate}</span>
            </span>
          </motion.div>

          {/* Main Grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Map Card */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="w-4 h-4 text-purple-400" />
                  Survey Location
                </CardTitle>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Real-time GPS tracking of survey vehicle
                </p>
              </CardHeader>
              <CardContent>
                <div
                  className="relative h-80 rounded-xl overflow-hidden flex items-center justify-center"
                  style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)' }}
                >
                  {/* Grid overlay */}
                  <div className="absolute inset-0 opacity-10">
                    <svg width="100%" height="100%">
                      <defs>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>
                  </div>

                  {/* Position marker */}
                  <motion.div
                    className="relative z-10"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <div className="w-4 h-4 bg-purple-500 rounded-full border-2 border-white shadow-lg shadow-purple-500/50" />
                    <div className="absolute inset-0 w-4 h-4 bg-purple-500 rounded-full animate-ping opacity-50" />
                  </motion.div>

                  {/* Coordinates overlay */}
                  <div className="absolute bottom-4 left-4 p-3 rounded-xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-subtle)' }}>
                    <p className="text-xs font-medium uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Coordinates</p>
                    <p className="text-sm font-mono text-white">
                      {currentGPS.lat.toFixed(6)}°, {currentGPS.lng.toFixed(6)}°
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Survey Context Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  Survey Context
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="p-4 rounded-xl"
                  style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)' }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <MapPin className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Total Surveyed</span>
                  </div>
                  <p className="text-2xl font-bold text-white tabular-nums">{globalStats.total_distance_km.toFixed(2)}<span className="text-sm ml-1">km</span></p>
                </div>

                <div
                  className="p-4 rounded-xl"
                  style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)' }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Sessions</span>
                  </div>
                  <p className="text-2xl font-bold text-white tabular-nums">{globalStats.total_sessions}</p>
                </div>

                <div
                  className="p-4 rounded-xl"
                  style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)' }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Activity className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Distresses Found</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-400 tabular-nums">{globalStats.distress_count}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Telemetry Grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="hover:border-white/10">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
                    <Navigation className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Segments</span>
                </div>
                <p className="text-2xl font-bold text-white tabular-nums">{globalStats.total_segments}</p>
              </CardContent>
            </Card>

            <Card className="hover:border-white/10">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                    <Gauge className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Speed</span>
                </div>
                <p className="text-2xl font-bold text-white tabular-nums">{currentSpeedKmh.toFixed(0)}<span className="text-sm ml-1">km/h</span></p>
              </CardContent>
            </Card>

            <Card className="hover:border-white/10">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                    <Satellite className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>GPS Lock</span>
                </div>
                <p className="text-2xl font-bold text-green-400">{hasActiveSession ? 'Active' : 'Standby'}</p>
              </CardContent>
            </Card>

            <Card className="hover:border-white/10">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg" style={{ background: 'rgba(234, 179, 8, 0.1)' }}>
                    <Activity className="w-4 h-4 text-yellow-400" />
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Pipeline</span>
                </div>
                <p className="text-2xl font-bold text-green-400">{pipelineStatus}</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </MainLayout>
    </ProtectedRoute>
  );
}