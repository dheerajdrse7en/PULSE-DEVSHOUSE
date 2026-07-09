'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePulseStore } from '@/lib/store';
import { Camera, Image as ImageIcon, Download, Brain, Grid, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';

// All API calls route through the Next.js proxy — never directly to HTTPS backend
const PROXY_BASE = '/api/pulse';

interface FrameData {
  segment_id: string;
  frames: string[];
  base_url: string;
  count: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function VisualFeed() {
  const [activeView, setActiveView] = useState<'collage' | 'depth'>('collage');
  const [segmentFrames, setSegmentFrames] = useState<FrameData[]>([]);
  const [selectedSegmentIdx, setSelectedSegmentIdx] = useState(0);
  const [isLoadingFrames, setIsLoadingFrames] = useState(false);
  const { segments, hasActiveSession, activeSessionId, sessions } = usePulseStore();

  // Determine which session to show frames for (active, or the latest recorded)
  const targetSession = activeSessionId || sessions[sessions.length - 1]?.session_id;

  const fetchFrames = useCallback(async () => {
    if (!targetSession) return;
    setIsLoadingFrames(true);
    try {
      const res = await fetch(`${PROXY_BASE}/api/frames/${targetSession}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        setSegmentFrames(data.segments ?? []);
        if (data.segments?.length > 0) {
          setSelectedSegmentIdx(data.segments.length - 1); // Show latest segment
        }
      }
    } catch {
      // Silently handle - frames will be empty
    } finally {
      setIsLoadingFrames(false);
    }
  }, [targetSession]);

  useEffect(() => {
    fetchFrames();
    // Re-fetch every 10 seconds if active session
    if (hasActiveSession) {
      const interval = setInterval(fetchFrames, 10000);
      return () => clearInterval(interval);
    }
  }, [fetchFrames, hasActiveSession]);

  const currentSegment = segmentFrames[selectedSegmentIdx];
  const totalFrames = segmentFrames.reduce((sum, s) => sum + s.count, 0);

  return (
    <ProtectedRoute>
      <MainLayout
        title="Visual Feed"
        description="Road surface camera frames and VLM analysis input"
      >
        <motion.div
          className="space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {/* Camera Selector */}
          <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-2">
              <Button
                onClick={() => setActiveView('collage')}
                variant={activeView === 'collage' ? 'default' : 'outline'}
                className={`${activeView === 'collage'
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-transparent border-white/10 text-white hover:bg-white/5'
                  }`}
              >
                <Grid className="w-4 h-4 mr-2" />
                VLM Frames
              </Button>
              <Button
                onClick={() => setActiveView('depth')}
                variant={activeView === 'depth' ? 'default' : 'outline'}
                className={`${activeView === 'depth'
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-transparent border-white/10 text-white hover:bg-white/5'
                  }`}
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Depth Map
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={hasActiveSession
                ? "bg-green-500/10 text-green-400 border-green-500/30"
                : "bg-gray-500/10 text-gray-400 border-gray-500/30"
              }>
                <motion.div
                  className={`w-2 h-2 rounded-full mr-2 ${hasActiveSession ? 'bg-green-400' : 'bg-gray-400'}`}
                  animate={hasActiveSession ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                {hasActiveSession ? 'Live' : 'Saved Session'}
              </Badge>
              <Button variant="outline" size="sm" className="bg-transparent border-white/10 text-white hover:bg-white/5">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </motion.div>

          {activeView === 'collage' ? (
            <>
              {/* Segment Navigator */}
              {segmentFrames.length > 0 && (
                <motion.div variants={itemVariants} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={selectedSegmentIdx <= 0}
                      onClick={() => setSelectedSegmentIdx(i => i - 1)}
                      className="bg-transparent border-white/10 text-white hover:bg-white/5"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-medium text-white tabular-nums">
                      {currentSegment?.segment_id}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={selectedSegmentIdx >= segmentFrames.length - 1}
                      onClick={() => setSelectedSegmentIdx(i => i + 1)}
                      className="bg-transparent border-white/10 text-white hover:bg-white/5"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {currentSegment?.count ?? 0} frames • Segment {selectedSegmentIdx + 1} of {segmentFrames.length}
                  </span>
                </motion.div>
              )}

              {/* Frame Collage Grid */}
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Camera className="w-4 h-4 text-purple-400" />
                      VLM Input Frames — {currentSegment?.segment_id ?? 'No Data'}
                    </CardTitle>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Frames sent to Qwen3-VL for distress classification
                    </p>
                  </CardHeader>
                  <CardContent>
                    {currentSegment && currentSegment.frames.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {currentSegment.frames.map((frame, idx) => (
                          <motion.div
                            key={frame}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.05 }}
                            className="relative aspect-video rounded-xl overflow-hidden group cursor-pointer"
                            style={{ border: '1px solid var(--border-subtle)' }}
                          >
                            <img
                              src={`${PROXY_BASE}${currentSegment.base_url}/${frame}`}
                              alt={`Frame ${idx + 1}`}
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                              loading="lazy"
                            />
                            {/* Frame number overlay */}
                            <div
                              className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-xs font-medium text-white"
                              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                            >
                              #{idx + 1}
                            </div>
                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-purple-600/0 group-hover:bg-purple-600/20 transition-colors" />
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div
                        className="flex flex-col items-center justify-center py-16 rounded-xl"
                        style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)' }}
                      >
                        <motion.div
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 3, repeat: Infinity }}
                        >
                          <Camera className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: 'var(--text-muted)' }} />
                        </motion.div>
                        <p className="text-base font-medium text-white">
                          {isLoadingFrames ? 'Loading frames...' : 'No frames available'}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          {hasActiveSession ? 'Waiting for segment completion' : 'Start a survey to capture frames'}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Pipeline Info Bar */}
              <motion.div variants={itemVariants}>
                <div
                  className="flex items-center gap-3 p-4 rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
                    border: '1px solid rgba(139, 92, 246, 0.2)'
                  }}
                >
                  <div className="p-1.5 rounded-lg" style={{ background: 'rgba(139, 92, 246, 0.3)' }}>
                    <Brain className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="text-sm text-purple-300">
                    Each segment&apos;s frames are analyzed by Qwen3-VL (4B) to detect cracks, potholes, rutting, and surface deterioration
                  </span>
                </div>
              </motion.div>
            </>
          ) : (
            /* Depth Map Placeholder */
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ImageIcon className="w-4 h-4 text-blue-400" />
                    Depth Estimation
                  </CardTitle>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Monocular depth maps for rut depth measurement
                  </p>
                </CardHeader>
                <CardContent>
                  <div
                    className="flex flex-col items-center justify-center py-16 rounded-xl"
                    style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)' }}
                  >
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: 'var(--text-muted)' }} />
                    </motion.div>
                    <p className="text-base font-medium text-white">Depth Estimation Feed</p>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      Depth maps processed by Depth Anything V2
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Camera Status Grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="hover:border-white/10">
              <CardContent className="p-5">
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>VLM Model</p>
                <p className="text-lg font-semibold text-green-400 mt-1">Qwen3-VL 4B</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Via Ollama inference</p>
              </CardContent>
            </Card>
            <Card className="hover:border-white/10">
              <CardContent className="p-5">
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Total Frames</p>
                <p className="text-lg font-semibold text-white mt-1 tabular-nums">{totalFrames}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Across {segmentFrames.length} segments
                </p>
              </CardContent>
            </Card>
            <Card className="hover:border-white/10">
              <CardContent className="p-5">
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Latest Condition</p>
                <p className="text-lg font-semibold text-white mt-1">
                  {segments[segments.length - 1]?.final_condition ?? 'Awaiting analysis'}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>VLM assessment result</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </MainLayout>
    </ProtectedRoute>
  );
}
