'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Badge } from '@/components/ui/badge';
import { usePulseStore } from '@/lib/store';
import { RefreshCw, Download, ChartBar as BarChart3, Brain, Radio, Activity, TrendingUp } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: unknown[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="px-3 py-2 rounded-lg text-sm"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--border-subtle)' }}
      >
        <p className="text-white font-medium">{label}</p>
        {(payload as { name: string; value: number; color: string }[]).map((entry, idx) => (
          <p key={idx} style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function LiveSensors() {
  const { segments, avgIRI, globalStats, hasActiveSession, fetchDashboardData } = usePulseStore();

  // Build IRI Timeline from segments
  const iriTimeline = segments.map((seg, i) => ({
    segment: seg.segment_id || `Seg ${i + 1}`,
    iri: seg.iri?.iri_value ?? 0,
  }));

  // Build multi-sensor chart from segments
  const sensorChannels = segments.map((seg, i) => ({
    segment: seg.segment_id || `Seg ${i + 1}`,
    iri: seg.iri?.iri_value ?? 0,
    pci: seg.visual?.pci_estimate ?? 0,
    speed: seg.avg_speed_kmh ?? 0,
  }));

  return (
    <ProtectedRoute>
      <MainLayout
        title="Live Sensor Data"
        description="Real-time IRI, depth, and acoustic analysis per segment"
      >
        <motion.div
          className="space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {/* Header Actions */}
          <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 px-3 py-1.5">
                <motion.div
                  className="w-2 h-2 bg-purple-400 rounded-full mr-2"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                {hasActiveSession ? 'Pipeline Active' : 'Pipeline Idle'}
              </Badge>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Segments: <span className="text-white font-medium tabular-nums">{globalStats.total_segments}</span>
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-transparent border-white/10 text-white hover:bg-white/5"
                onClick={() => fetchDashboardData()}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" className="bg-transparent border-white/10 text-white hover:bg-white/5">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </motion.div>

          {/* Metric Cards */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:border-white/10">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Current IRI</span>
                  <Brain className="w-4 h-4 text-blue-400" />
                </div>
                <p className="text-2xl font-bold text-white mb-1 tabular-nums">{avgIRI.toFixed(2)}<span className="text-sm ml-1">m/km</span></p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {avgIRI < 2 ? 'Excellent' : avgIRI < 4 ? 'Good' : avgIRI < 8 ? 'Fair' : 'Poor'}
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-white/10">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Total Distance</span>
                  <Activity className="w-4 h-4 text-green-400" />
                </div>
                <p className="text-2xl font-bold text-white mb-1 tabular-nums">{globalStats.total_distance_km.toFixed(2)}<span className="text-sm ml-1">km</span></p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Surveyed road length</p>
              </CardContent>
            </Card>

            <Card className="hover:border-white/10">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Active Sensors</span>
                  <Radio className="w-4 h-4 text-orange-400" />
                </div>
                <p className="text-2xl font-bold text-white mb-1 tabular-nums">4<span className="text-sm ml-1">channels</span></p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>IMU · GPS · Camera · Audio</p>
              </CardContent>
            </Card>

            <Card className="hover:border-white/10">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Processing Mode</span>
                  <Brain className="w-4 h-4 text-purple-400" />
                </div>
                <p className="text-lg font-bold text-white mb-1">{hasActiveSession ? 'Real-time' : 'Standby'}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Multi-agent pipeline</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Charts */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* IRI Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="w-4 h-4 text-purple-400" />
                  IRI Timeline (Per Segment)
                </CardTitle>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  International Roughness Index over surveyed segments
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={iriTimeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="segment" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="iri"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        dot={{ fill: '#8b5cf6', r: 4 }}
                        activeDot={{ r: 6 }}
                        name="IRI (m/km)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Multi-Sensor Channels */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  Sensor Channels
                </CardTitle>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  IRI, PCI, and speed across segments
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sensorChannels}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="segment" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="iri" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="IRI" />
                      <Line type="monotone" dataKey="pci" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="PCI" />
                      <Line type="monotone" dataKey="speed" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name="Speed (km/h)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </MainLayout>
    </ProtectedRoute>
  );
}