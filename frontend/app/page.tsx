'use client';

import { MainLayout } from '@/components/layout/main-layout';
import EdgeNodeStatus from '@/components/dashboard/edge-node-status';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { usePulseStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import {
  Activity,
  TrendingUp,
  Radio,
  Waves,
  AlertTriangle,
  MapPin,
  Camera,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

interface MetricCardProps {
  title: string;
  value: number | string;
  unit?: string;
  description: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  delay?: number;
}

function MetricCard({ title, value, unit, description, icon, trend, trendValue, delay = 0 }: MetricCardProps) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="hover:border-white/10">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div
              className="p-2.5 rounded-xl"
              style={{ background: 'rgba(255, 255, 255, 0.05)' }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>{icon}</span>
            </div>
            {trend && (
              <div className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-green-400' :
                trend === 'down' ? 'text-red-400' : 'text-gray-400'
                }`}>
                {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> :
                  trend === 'down' ? <ArrowDownRight className="w-3 h-3" /> : null}
                {trendValue}
              </div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              {title}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-white tabular-nums">
                {typeof value === 'number' ? value.toFixed(1) : value}
              </span>
              {unit && (
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{unit}</span>
              )}
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {description}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface ActionCardProps {
  title: string;
  value: string | number;
  description: string;
  status: 'success' | 'warning' | 'error';
  icon: React.ReactNode;
  showBadge?: boolean;
  delay?: number;
}

function ActionCard({ title, value, description, status, icon, showBadge, delay = 0 }: ActionCardProps) {
  const statusColors = {
    success: 'text-green-400',
    warning: 'text-yellow-400',
    error: 'text-red-400'
  };

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="hover:border-white/10">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div
              className="p-2.5 rounded-xl"
              style={{ background: 'rgba(255, 255, 255, 0.05)' }}
            >
              <span className={statusColors[status]}>{icon}</span>
            </div>
            {showBadge && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-400">
                Alert
              </span>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              {title}
            </p>
            <p className="text-2xl font-bold text-white">
              {value}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {description}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Home() {
  const {
    avgIRI,
    avgPCI,
    avgRutDepthMM,
    avgSpeedKmh,
    distressCount,
    vlmStatus,
  } = usePulseStore();

  return (
    <ProtectedRoute>
      <MainLayout title="PULSE Overview" description="AI-powered road surface monitoring dashboard">
        <motion.div
          className="space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {/* System Status */}
          <EdgeNodeStatus />

          {/* Metrics Grid */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            variants={containerVariants}
          >
            <MetricCard
              title="Roughness Index (IRI)"
              value={avgIRI}
              unit="m/km"
              description="International roughness index"
              icon={<Activity className="w-5 h-5" />}
              trend={avgIRI > 4 ? 'down' : 'up'}
              trendValue={avgIRI > 4 ? 'Poor' : 'Good'}
              delay={0}
            />

            <MetricCard
              title="Pavement Condition (PCI)"
              value={avgPCI}
              unit="score"
              description="Pavement condition index 0-100"
              icon={<Waves className="w-5 h-5" />}
              trend={avgPCI >= 70 ? 'up' : 'down'}
              trendValue={avgPCI >= 70 ? 'Good' : 'Needs repair'}
              delay={0.1}
            />

            <MetricCard
              title="Rut Depth"
              value={avgRutDepthMM}
              unit="mm"
              description="Average rut depth measurement"
              icon={<TrendingUp className="w-5 h-5" />}
              trend="neutral"
              trendValue=""
              delay={0.2}
            />

            <MetricCard
              title="Survey Speed"
              value={avgSpeedKmh}
              unit="km/h"
              description="Average survey vehicle speed"
              icon={<Radio className="w-5 h-5" />}
              trend={avgSpeedKmh >= 20 ? 'up' : 'down'}
              trendValue={avgSpeedKmh >= 20 ? 'Valid' : '< 20 km/h'}
              delay={0.3}
            />
          </motion.div>

          {/* Action Cards */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            variants={containerVariants}
          >
            <ActionCard
              title="Distresses Found"
              value={distressCount}
              description="Road surface anomalies"
              status={distressCount > 10 ? 'warning' : 'success'}
              icon={<AlertTriangle className="w-5 h-5" />}
              showBadge={distressCount > 10}
              delay={0}
            />
            <ActionCard
              title="Survey Location"
              value="Live"
              description="GPS-tracked survey route"
              status="success"
              icon={<MapPin className="w-5 h-5" />}
              delay={0.1}
            />
            <ActionCard
              title="Visual Assessment"
              value={vlmStatus}
              description="VLM road surface analysis"
              status="success"
              icon={<Camera className="w-5 h-5" />}
              delay={0.2}
            />
          </motion.div>
        </motion.div>
      </MainLayout>
    </ProtectedRoute>
  );
}