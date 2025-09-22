/**
 * Migration Monitor Component
 * Real-time monitoring and progress tracking for active migrations
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { MigrationEngine } from '@/lib/migration-engine';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Play,
  Pause,
  Square,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Database,
  HardDrive,
  Zap,
  Shield,
  Activity,
  TrendingUp,
  Eye,
  Download,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import type { MigrationJob, MigrationPhase, MigrationError } from '@/types';

interface MigrationMonitorProps {
  jobId: string;
  isOpen: boolean;
  onClose: () => void;
}

const phaseIcons: Record<MigrationPhase, React.ElementType> = {
  preparation: Activity,
  schema_migration: Database,
  data_migration: Database,
  storage_migration: HardDrive,
  configuration_migration: Shield,
  edge_functions_migration: Zap,
  security_migration: Shield,
  realtime_setup: Activity,
  validation: CheckCircle,
  cutover: TrendingUp,
};

const phaseNames: Record<MigrationPhase, string> = {
  preparation: 'Preparation',
  schema_migration: 'Schema Migration',
  data_migration: 'Data Migration',
  storage_migration: 'Storage Migration',
  configuration_migration: 'Configuration Migration',
  edge_functions_migration: 'Edge Functions Migration',
  security_migration: 'Security Migration',
  realtime_setup: 'Realtime Setup',
  validation: 'Validation',
  cutover: 'Cutover',
};

export function MigrationMonitor({ jobId, isOpen, onClose }: MigrationMonitorProps) {
  const { data: session } = useSession();
  const [migrationEngine, setMigrationEngine] = useState<MigrationEngine | null>(null);
  const [job, setJob] = useState<MigrationJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (session?.accessToken) {
      const engine = new MigrationEngine(session.accessToken as string);
      setMigrationEngine(engine);

      // Set up event listeners
      engine.on('migration:progress', ({ job: updatedJob }) => {
        if (updatedJob.id === jobId) {
          setJob(updatedJob);
        }
      });

      engine.on('migration:completed', ({ job: completedJob }) => {
        if (completedJob.id === jobId) {
          setJob(completedJob);
          toast.success('Migration completed successfully!');
        }
      });

      engine.on('migration:failed', ({ job: failedJob }) => {
        if (failedJob.id === jobId) {
          setJob(failedJob);
          toast.error('Migration failed. Check the logs for details.');
        }
      });

      engine.on('migration:error', ({ job: errorJob, error }) => {
        if (errorJob.id === jobId) {
          setJob(errorJob);
          toast.error(`Migration error: ${error.message}`);
        }
      });

      return () => {
        engine.removeAllListeners();
      };
    }
  }, [session?.accessToken, jobId]);

  useEffect(() => {
    if (migrationEngine && isOpen) {
      loadMigrationStatus();
      
      // Set up polling for updates
      intervalRef.current = setInterval(() => {
        loadMigrationStatus();
      }, 2000); // Update every 2 seconds

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [migrationEngine, isOpen]);

  const loadMigrationStatus = () => {
    if (!migrationEngine) return;

    const currentJob = migrationEngine.getMigrationStatus(jobId);
    if (currentJob) {
      setJob(currentJob);
    }
  };

  const handleCancel = async () => {
    if (!migrationEngine) return;

    setIsLoading(true);
    try {
      await migrationEngine.cancelMigration(jobId);
      toast.success('Migration cancelled');
    } catch (error) {
      toast.error('Failed to cancel migration');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPhaseStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>;
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (!job) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Migration Monitor</DialogTitle>
            <DialogDescription>Loading migration details...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Migration Monitor</span>
                <Badge variant="outline" className={getStatusColor(job.status)}>
                  {job.status.toUpperCase()}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Job ID: {job.id} • Type: {job.type.replace('_', ' ')}
              </DialogDescription>
            </div>
            <div className="flex space-x-2">
              {job.status === 'running' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  <Square className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setShowLogs(!showLogs)}>
                <Eye className="mr-2 h-4 w-4" />
                {showLogs ? 'Hide' : 'Show'} Logs
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overall Progress */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Overall Progress</CardTitle>
                <div className="text-2xl font-bold text-emerald-600">
                  {job.progress.overall_percentage}%
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={job.progress.overall_percentage} className="mb-4" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-slate-500">Current Phase</div>
                  <div className="font-medium">
                    {phaseNames[job.progress.current_phase]}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Started</div>
                  <div className="font-medium">
                    {job.started_at ? formatTime(job.started_at) : 'Not started'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Duration</div>
                  <div className="font-medium">
                    {job.started_at 
                      ? formatDuration(Date.now() - new Date(job.started_at).getTime())
                      : 'N/A'
                    }
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Estimated</div>
                  <div className="font-medium">
                    {job.estimated_duration ? formatDuration(job.estimated_duration) : 'N/A'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Progress */}
          <Tabs defaultValue="phases" className="space-y-4">
            <TabsList>
              <TabsTrigger value="phases">Phases</TabsTrigger>
              <TabsTrigger value="statistics">Statistics</TabsTrigger>
              {showLogs && <TabsTrigger value="logs">Logs</TabsTrigger>}
            </TabsList>

            <TabsContent value="phases" className="space-y-4">
              <div className="grid gap-4">
                {job.progress.phases.map((phase, index) => {
                  const PhaseIcon = phaseIcons[phase.name];
                  return (
                    <Card key={phase.name} className={
                      phase.status === 'running' 
                        ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : ''
                    }>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-slate-500">
                                {index + 1}.
                              </span>
                              <PhaseIcon className="h-5 w-5 text-slate-600" />
                              <span className="font-medium">
                                {phaseNames[phase.name]}
                              </span>
                            </div>
                            {getPhaseStatusIcon(phase.status)}
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {phase.percentage}%
                            </div>
                            {phase.started_at && (
                              <div className="text-xs text-slate-500">
                                {formatTime(phase.started_at)}
                              </div>
                            )}
                          </div>
                        </div>
                        {phase.details && (
                          <div className="mt-2 text-sm text-slate-600">
                            {phase.details}
                          </div>
                        )}
                        {phase.status === 'running' && (
                          <Progress value={phase.percentage} className="mt-2" />
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="statistics" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Database className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="text-sm text-slate-500">Tables</div>
                        <div className="text-lg font-bold">
                          {job.progress.stats.tables_migrated} / {job.progress.stats.total_tables}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Database className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="text-sm text-slate-500">Rows</div>
                        <div className="text-lg font-bold">
                          {job.progress.stats.rows_migrated.toLocaleString()} / {job.progress.stats.total_rows.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <HardDrive className="h-5 w-5 text-purple-600" />
                      <div>
                        <div className="text-sm text-slate-500">Storage Objects</div>
                        <div className="text-lg font-bold">
                          {job.progress.stats.storage_objects_migrated} / {job.progress.stats.total_storage_objects}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Zap className="h-5 w-5 text-yellow-600" />
                      <div>
                        <div className="text-sm text-slate-500">Functions</div>
                        <div className="text-lg font-bold">
                          {job.progress.stats.functions_migrated} / {job.progress.stats.total_functions}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {showLogs && (
              <TabsContent value="logs" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Migration Logs</span>
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Export
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {job.error_log.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        No errors or warnings to display
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {job.error_log.map((error) => (
                          <Alert key={error.id} variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              <div className="space-y-1">
                                <div className="font-medium">
                                  [{error.phase}] {error.message}
                                </div>
                                <div className="text-xs">
                                  {formatTime(error.timestamp)} • Severity: {error.severity}
                                </div>
                                {error.details && (
                                  <details className="mt-2">
                                    <summary className="cursor-pointer text-xs">
                                      Show details
                                    </summary>
                                    <pre className="mt-2 text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded overflow-x-auto">
                                      {error.details}
                                    </pre>
                                  </details>
                                )}
                              </div>
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>

          {/* Success/Error Summary */}
          {(job.status === 'completed' || job.status === 'failed') && (
            <Alert className={
              job.status === 'completed' 
                ? 'border-green-200 bg-green-50' 
                : 'border-red-200 bg-red-50'
            }>
              {job.status === 'completed' ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={
                job.status === 'completed' ? 'text-green-800' : 'text-red-800'
              }>
                <div className="space-y-2">
                  <div className="font-medium">
                    Migration {job.status === 'completed' ? 'Completed Successfully' : 'Failed'}
                  </div>
                  <div className="text-sm">
                    {job.status === 'completed' ? (
                      <>
                        Your project has been successfully cloned. 
                        Total duration: {job.actual_duration ? formatDuration(job.actual_duration) : 'N/A'}
                      </>
                    ) : (
                      <>
                        The migration encountered errors and could not complete. 
                        Check the logs above for detailed error information.
                      </>
                    )}
                  </div>
                  {job.completed_at && (
                    <div className="text-xs">
                      Completed at: {formatTime(job.completed_at)}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
