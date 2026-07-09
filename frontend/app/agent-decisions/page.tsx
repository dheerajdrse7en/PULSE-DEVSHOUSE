'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePulseStore } from '@/lib/store';
import { Brain, Radio, Camera, FileText, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

export default function AgentDecisions() {
    const { agentDecisions, hasActiveSession, globalStats } = usePulseStore();

    const getActionBadge = (action: string) => {
        switch (action) {
            case 'log':
                return (
                    <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/30">
                        <FileText className="w-3 h-3 mr-1" />
                        Logged
                    </Badge>
                );
            case 'alert':
                return (
                    <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Alert
                    </Badge>
                );
            case 'camera':
                return (
                    <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                        <Camera className="w-3 h-3 mr-1" />
                        VLM
                    </Badge>
                );
            default:
                return null;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'resolved':
                return (
                    <Badge className="bg-green-500/10 text-green-400 border-green-500/30">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Resolved
                    </Badge>
                );
            case 'investigating':
                return (
                    <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                        <Clock className="w-3 h-3 mr-1" />
                        Investigating
                    </Badge>
                );
            default:
                return null;
        }
    };

    return (
        <ProtectedRoute>
            <MainLayout
                title="Agent Pipeline"
                description="Multi-agent reasoning log and decision explanations"
            >
                <motion.div
                    className="space-y-6"
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                >
                    {/* Header */}
                    <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-4">
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 px-3 py-1.5">
                            <motion.div
                                className="w-2 h-2 bg-purple-400 rounded-full mr-2"
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            />
                            {hasActiveSession ? 'Pipeline Active' : 'Pipeline Idle'}
                        </Badge>
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Segments Processed: <span className="text-white font-medium tabular-nums">{globalStats.total_segments}</span>
                        </span>
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Agents: <span className="text-white font-medium">Fusion · VLM · Deterioration · Devils Advocate · Economic</span>
                        </span>
                    </motion.div>

                    {/* Agent State Summary */}
                    <motion.div variants={itemVariants}>
                        <Card
                            className="border-purple-500/20"
                            style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)' }}
                        >
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className="p-2 rounded-lg" style={{ background: 'rgba(139, 92, 246, 0.2)' }}>
                                    <Brain className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-purple-300">Pipeline Architecture</p>
                                    <p className="text-sm text-white">
                                        Sensor Fusion → Visual Assessment (Qwen3-VL) → Deterioration Oracle → Devil&apos;s Advocate → Economic Cascade → PMGSY Report
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Decision Timeline */}
                    <motion.div variants={itemVariants}>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Brain className="w-4 h-4 text-purple-400" />
                                    Agent Decision Timeline
                                </CardTitle>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                    Per-segment pipeline reasoning and final assessment
                                </p>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {agentDecisions.map((decision, index) => (
                                        <motion.div
                                            key={decision.segment_id}
                                            className="relative pl-6 pb-6 border-l-2 border-purple-500/30 last:pb-0"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.3 + index * 0.1 }}
                                        >
                                            {/* Timeline dot */}
                                            <div className="absolute left-[-8px] top-0 w-3.5 h-3.5 bg-purple-500 rounded-full border-2 border-[var(--card-bg)]" />

                                            <div
                                                className="p-4 rounded-xl hover:bg-white/5 transition-colors"
                                                style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)' }}
                                            >
                                                {/* Header */}
                                                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                                                        <span className="text-sm font-medium text-white tabular-nums">{decision.segment_id}</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {getStatusBadge(decision.status)}
                                                        {getActionBadge(decision.action)}
                                                    </div>
                                                </div>

                                                {/* Agents Used */}
                                                <div className="mb-3">
                                                    <p className="text-xs font-medium uppercase mb-1.5" style={{ color: 'var(--text-muted)' }}>
                                                        Pipeline Agents
                                                    </p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {decision.agents.map((agent, i) => (
                                                            <Badge key={i} variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-xs">
                                                                <Radio className="w-3 h-3 mr-1" />
                                                                {agent}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Analysis Points */}
                                                <div className="mb-3">
                                                    <p className="text-xs font-medium uppercase mb-1.5" style={{ color: 'var(--text-muted)' }}>
                                                        Analysis Summary
                                                    </p>
                                                    <ul className="space-y-1">
                                                        {decision.hypotheses.map((h, i) => (
                                                            <li
                                                                key={i}
                                                                className={`flex items-center gap-2 text-sm ${h === decision.finalDecision ? 'text-purple-400 font-medium' : ''}`}
                                                                style={{ color: h === decision.finalDecision ? undefined : 'var(--text-secondary)' }}
                                                            >
                                                                <span className={`w-1.5 h-1.5 rounded-full ${h === decision.finalDecision ? 'bg-purple-400' : 'bg-gray-500'}`} />
                                                                {h}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                {/* Final Decision */}
                                                <div
                                                    className="flex items-center justify-between pt-3"
                                                    style={{ borderTop: '1px solid var(--border-subtle)' }}
                                                >
                                                    <div>
                                                        <p className="text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Final Condition</p>
                                                        <p className="text-sm font-medium text-purple-400">{decision.finalDecision}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Confidence</p>
                                                        <p className="text-lg font-bold text-purple-400 tabular-nums">{decision.confidence}%</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                    {agentDecisions.length === 0 && (
                                        <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
                                            No segments processed yet. start a survey session to see agent decisions
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
