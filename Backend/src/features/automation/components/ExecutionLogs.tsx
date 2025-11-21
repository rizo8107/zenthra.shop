import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    CheckCircle2,
    XCircle,
    Clock,
    Play,
    Zap,
    AlertCircle,
    ChevronDown,
    ChevronRight,
    Terminal
} from 'lucide-react';
import type { FlowRun, FlowRunStep } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';

interface ExecutionLogsProps {
    runs: FlowRun[];
    selectedRunId: string | null;
    runSteps: FlowRunStep[];
    onSelectRun: (runId: string) => void;
}

const STATUS_CONFIG = {
    queued: {
        icon: Clock,
        color: 'text-gray-500',
        bg: 'bg-gray-100',
        label: 'Queued',
        variant: 'secondary' as const
    },
    running: {
        icon: Play,
        color: 'text-blue-500',
        bg: 'bg-blue-100',
        label: 'Running',
        variant: 'default' as const
    },
    success: {
        icon: CheckCircle2,
        color: 'text-green-500',
        bg: 'bg-green-100',
        label: 'Success',
        variant: 'default' as const
    },
    failed: {
        icon: XCircle,
        color: 'text-red-500',
        bg: 'bg-red-100',
        label: 'Failed',
        variant: 'destructive' as const
    },
};

export function ExecutionLogs({ runs, selectedRunId, runSteps, onSelectRun }: ExecutionLogsProps) {
    const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
    const selectedRun = runs.find(r => r.id === selectedRunId);

    const toggleStep = (stepId: string) => {
        setExpandedSteps(prev => {
            const next = new Set(prev);
            if (next.has(stepId)) {
                next.delete(stepId);
            } else {
                next.add(stepId);
            }
            return next;
        });
    };

    // Auto-expand failed steps
    useEffect(() => {
        const failedSteps = runSteps.filter(s => s.status === 'failed').map(s => s.id);
        if (failedSteps.length > 0) {
            setExpandedSteps(new Set(failedSteps));
        }
    }, [runSteps]);

    const renderStepStatus = (step: FlowRunStep) => {
        const config = STATUS_CONFIG[step.status];
        const Icon = config.icon;

        return (
            <div className="flex items-center gap-2">
                <div className={`p-1 rounded ${config.bg}`}>
                    <Icon className={`w-3 h-3 ${config.color}`} />
                </div>
                <span className="text-xs font-medium">{config.label}</span>
            </div>
        );
    };

    const renderStepDetails = (step: FlowRunStep) => {
        const isExpanded = expandedSteps.has(step.id);
        const hasDetails = step.input || step.output || step.error;

        return (
            <div className="border rounded-lg overflow-hidden">
                <div
                    className="flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => hasDetails && toggleStep(step.id)}
                >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        {hasDetails && (
                            <div className="flex-shrink-0">
                                {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                )}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium truncate">{step.nodeId}</span>
                                <Badge variant="outline" className="text-[10px] px-1 py-0">
                                    {step.nodeType}
                                </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Started {formatDistanceToNow(new Date(step.startedAt), { addSuffix: true })}
                                {step.finishedAt && ` • Took ${Math.round((new Date(step.finishedAt).getTime() - new Date(step.startedAt).getTime()) / 1000)}s`}
                            </div>
                        </div>
                        {renderStepStatus(step)}
                    </div>
                </div>

                {isExpanded && hasDetails && (
                    <div className="p-3 space-y-3 bg-background border-t">
                        {step.input && (
                            <div>
                                <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                    <Terminal className="w-3 h-3" />
                                    Input
                                </div>
                                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                    {JSON.stringify(step.input, null, 2)}
                                </pre>
                            </div>
                        )}

                        {step.output && (
                            <div>
                                <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                    <Terminal className="w-3 h-3" />
                                    Output
                                </div>
                                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                    {JSON.stringify(step.output, null, 2)}
                                </pre>
                            </div>
                        )}

                        {step.error && (
                            <div>
                                <div className="text-xs font-medium text-destructive mb-1 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Error
                                </div>
                                <pre className="text-xs bg-destructive/10 text-destructive p-2 rounded overflow-x-auto">
                                    {step.error}
                                </pre>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderRunItem = (run: FlowRun) => {
        const config = STATUS_CONFIG[run.status];
        const Icon = config.icon;
        const isSelected = run.id === selectedRunId;

        return (
            <div
                key={run.id}
                className={`p-3 border rounded-lg cursor-pointer transition-all ${isSelected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/50 hover:bg-muted/30'
                    }`}
                onClick={() => onSelectRun(run.id)}
            >
                <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className={`p-1 rounded ${config.bg} flex-shrink-0`}>
                            <Icon className={`w-3 h-3 ${config.color}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium">Run #{run.id.slice(0, 8)}</span>
                                <Badge variant={config.variant} className="text-[10px] px-1 py-0">
                                    {config.label}
                                </Badge>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        {run.triggerType === 'manual' && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                                <Zap className="w-2 h-2 mr-1" />
                                Manual
                            </Badge>
                        )}
                        {run.triggerType === 'cron' && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                                <Clock className="w-2 h-2 mr-1" />
                                Cron
                            </Badge>
                        )}
                        {run.testMode && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                Test
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                    <div>Started {formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })}</div>
                    {run.finishedAt && (
                        <div>
                            Finished {formatDistanceToNow(new Date(run.finishedAt), { addSuffix: true })}
                            {' • '}
                            Duration: {Math.round((new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s
                        </div>
                    )}
                    {run.error && (
                        <div className="text-destructive font-medium mt-1 flex items-start gap-1">
                            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2">{run.error}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
            {/* Runs List */}
            <Card className="border-none shadow-none bg-transparent">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Play className="w-4 h-4" />
                        Execution History
                        <Badge variant="secondary" className="text-[10px] ml-auto">
                            {runs.length} runs
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[600px] px-4">
                        {runs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Terminal className="w-12 h-12 text-muted-foreground mb-3" />
                                <p className="text-sm font-medium text-muted-foreground">No executions yet</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Click "Test run" to execute this flow
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2 pb-4">
                                {runs.map(renderRunItem)}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Run Steps Details */}
            <Card className="border-none shadow-none bg-transparent">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Terminal className="w-4 h-4" />
                        Execution Steps
                        {selectedRun && (
                            <Badge variant="secondary" className="text-[10px] ml-auto">
                                {runSteps.length} steps
                            </Badge>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[600px] px-4">
                        {!selectedRun ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <ChevronRight className="w-12 h-12 text-muted-foreground mb-3" />
                                <p className="text-sm font-medium text-muted-foreground">Select a run</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Click on a run to view its execution steps
                                </p>
                            </div>
                        ) : runSteps.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Clock className="w-12 h-12 text-muted-foreground mb-3 animate-pulse" />
                                <p className="text-sm font-medium text-muted-foreground">No steps yet</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Execution steps will appear here
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2 pb-4">
                                {runSteps.map(renderStepDetails)}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
