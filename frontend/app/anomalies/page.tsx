'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePulseStore } from '@/lib/store';
import { AlertTriangle, Filter, Map, MapPin, Clock, Activity } from 'lucide-react';
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

export default function DistressMap() {
  const { segments, distressCount } = usePulseStore();

  // Build distress list from segment data
  const distresses = segments.flatMap((seg) =>
    (seg.distresses ?? seg.visual?.distresses ?? []).map((d, i) => ({
      id: `${seg.segment_id}-${i}`,
      segment: seg.segment_id,
      type: d.type,
      severity: d.severity,
      condition: seg.final_condition ?? seg.visual?.overall_condition ?? 'Unknown',
      lat: seg.gps?.lat ?? 0,
      lng: seg.gps?.lng ?? 0,
    }))
  );

  const highSeverity = distresses.filter(d => d.severity === 'high').length;
  const mediumSeverity = distresses.filter(d => d.severity === 'medium').length;
  const lowSeverity = distresses.filter(d => d.severity === 'low').length;

  return (
    <ProtectedRoute>
      <MainLayout title="Road Distresses" description="Visual surface distress detection and classification">
        <motion.div
          className="space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {/* Stats Row */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="hover:border-white/10">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Total Distresses</p>
                    <p className="text-2xl font-bold text-yellow-400 tabular-nums mt-1">{distressCount}</p>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(234, 179, 8, 0.1)' }}>
                    <AlertTriangle className="w-6 h-6 text-yellow-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-white/10">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>High Severity</p>
                    <p className="text-2xl font-bold text-red-400 tabular-nums mt-1">{highSeverity}</p>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                    <Activity className="w-6 h-6 text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-white/10">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Medium / Low</p>
                    <p className="text-2xl font-bold text-blue-400 tabular-nums mt-1">
                      {mediumSeverity} / {lowSeverity}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                    <MapPin className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Map and List Grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Map Card */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    Distress Detection Map
                  </CardTitle>
                  <Button variant="outline" size="sm" className="bg-transparent border-white/10 text-white hover:bg-white/5">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                  </Button>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  GPS-located road surface distresses from VLM analysis
                </p>
              </CardHeader>
              <CardContent>
                <div
                  className="relative h-80 rounded-xl overflow-hidden flex items-center justify-center"
                  style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)' }}
                >
                  {/* Distress markers */}
                  {distresses.slice(0, 5).map((d, index) => (
                    <motion.div
                      key={d.id}
                      className="absolute cursor-pointer"
                      style={{
                        left: `${20 + index * 15}%`,
                        top: `${30 + (index % 3) * 20}%`,
                      }}
                      whileHover={{ scale: 1.3 }}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 border-white/50 shadow-lg ${d.severity === 'high' ? 'bg-red-500' :
                        d.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                        }`} />
                    </motion.div>
                  ))}

                  {/* Placeholder Map - VIT Chennai */}
                  <div className="w-full h-full z-0">
                    <iframe
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3890.0410203906017!2d80.1507345254683!3d12.840625837462879!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a5259af8e491f67%3A0x944b42131b757d2d!2sVellore%20Institute%20of%20Technology%20-%20Chennai!5e0!3m2!1sen!2sin!4v1772384905607!5m2!1sen!2sin"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen={true}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="absolute inset-0"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Distresses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                  Detected Distresses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {distresses.slice(0, 6).map((d, index) => (
                    <motion.div
                      key={d.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors"
                      style={{ border: '1px solid var(--border-subtle)' }}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${d.severity === 'high' ? 'bg-red-500' :
                            d.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">
                            {d.type}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {d.segment} • VLM Detection
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs flex-shrink-0 ml-2 ${d.severity === 'high'
                          ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                          d.severity === 'medium'
                            ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                            'bg-green-500/10 text-green-400 border-green-500/30'
                          }`}
                      >
                        {d.severity}
                      </Badge>
                    </motion.div>
                  ))}
                  {distresses.length === 0 && (
                    <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
                      No distresses detected yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </MainLayout>
    </ProtectedRoute>
  );
}
