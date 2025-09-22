/**
 * Error Dashboard Component
 * Comprehensive error monitoring and system health visualization
 */

'use client';

import { useState, useEffect } from 'react';
import { ErrorMonitoringSystem } from '@/lib/error-monitoring';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  Check,
  X,
  RefreshCw,
  Download,
  Filter,
  Clock,
  Zap,
  Shield,
  Database,
  Server,
  Cpu,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import type { ErrorAlert, ErrorMetrics, ErrorPattern, HealthCheck } from '@/lib/error-monitoring';

interface ErrorDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ErrorDashboard({ isOpen, onClose }: ErrorDashboardProps) {
  const { data: session } = useSession();
  const [monitoringSystem] = useState(() => new ErrorMonitoringSystem());
  
  // State
  const [metrics, setMetrics] = useState<ErrorMetrics | null>(null);
  const [patterns, setPatterns] = useState<ErrorPattern[]>([]);
  const [alerts, setAlerts] = useState<ErrorAlert[]>([]);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [systemHealth, setSystemHealth] = useState<'healthy' | 'warning' | 'critical'>('healthy');
  const [isLoading, setIsLoading] = useState(false);
  const [timeWindow, setTimeWindow] = useState('1h');
  const [selectedAlert, setSelectedAlert] = useState<ErrorAlert | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDashboardData();
      
      // Set up real-time updates
      const interval = setInterval(loadDashboardData, 30000); // Update every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [isOpen, timeWindow]);

  useEffect(() => {
    // Set up event listeners
    const handleError = ({ error, job }: any) => {
      toast.error(`Migration error: ${error.message}`);
      loadDashboardData();
    };

    const handleAlert = (alert: ErrorAlert) => {
      toast.error(`System alert: ${alert.title}`);
      loadDashboardData();
    };

    monitoringSystem.on('error:recorded', handleError);
    monitoringSystem.on('alert:created', handleAlert);

    return () => {
      monitoringSystem.off('error:recorded', handleError);
      monitoringSystem.off('alert:created', handleAlert);
    };
  }, [monitoringSystem]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    
    try {
      const timeWindowMs = getTimeWindowMs(timeWindow);
      
      // Load metrics
      const errorMetrics = monitoringSystem.getErrorMetrics(timeWindowMs);
      setMetrics(errorMetrics);
      
      // Load patterns
      const errorPatterns = monitoringSystem.getErrorPatterns();
      setPatterns(errorPatterns);
      
      // Load alerts
      const activeAlerts = monitoringSystem.getActiveAlerts();
      setAlerts(activeAlerts);
      
      // Load system health
      const health = monitoringSystem.getSystemHealth();
      setHealthChecks(health.checks);
      setSystemHealth(health.overall);
      
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    const success = monitoringSystem.acknowledgeAlert(alertId, session?.user?.email || undefined);
    if (success) {
      toast.success('Alert acknowledged');
      loadDashboardData();
    } else {
      toast.error('Failed to acknowledge alert');
    }
  };

  const handleResolveAlert = (alertId: string, resolution?: string) => {
    const success = monitoringSystem.resolveAlert(alertId, session?.user?.email || undefined, resolution);
    if (success) {
      toast.success('Alert resolved');
      loadDashboardData();
      setSelectedAlert(null);
    } else {
      toast.error('Failed to resolve alert');
    }
  };

  const getTimeWindowMs = (window: string): number => {
    switch (window) {
      case '1h': return 3600000;
      case '6h': return 21600000;
      case '24h': return 86400000;
      case '7d': return 604800000;
      default: return 3600000;
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAlertSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'low':
        return <AlertTriangle className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Error Dashboard</span>
                <Badge variant="outline" className={getHealthStatusColor(systemHealth)}>
                  {systemHealth.toUpperCase()}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                System health monitoring and error analytics
              </DialogDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Select value={timeWindow} onValueChange={setTimeWindow}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last Hour</SelectItem>
                  <SelectItem value="6h">Last 6 Hours</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={loadDashboardData} disabled={isLoading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* System Health Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className={systemHealth === 'critical' ? 'border-red-500' : systemHealth === 'warning' ? 'border-yellow-500' : 'border-green-500'}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  {getHealthStatusIcon(systemHealth)}
                  <div>
                    <div className="text-sm text-slate-500">System Health</div>
                    <div className="text-lg font-bold capitalize">{systemHealth}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <div className="text-sm text-slate-500">Active Alerts</div>
                    <div className="text-lg font-bold">{alerts.length}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="text-sm text-slate-500">Error Rate</div>
                    <div className="text-lg font-bold">
                      {metrics ? `${metrics.errorRate.toFixed(1)}/hr` : '0/hr'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="text-sm text-slate-500">MTTR</div>
                    <div className="text-lg font-bold">
                      {metrics ? formatDuration(metrics.mttr) : '0m'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Dashboard Tabs */}
          <Tabs defaultValue="health" className="space-y-4">
            <TabsList>
              <TabsTrigger value="health">System Health</TabsTrigger>
              <TabsTrigger value="alerts">
                Alerts ({alerts.length})
              </TabsTrigger>
              <TabsTrigger value="metrics">Error Metrics</TabsTrigger>
              <TabsTrigger value="patterns">Error Patterns</TabsTrigger>
            </TabsList>

            <TabsContent value="health" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Health Checks</CardTitle>
                  <CardDescription>
                    Real-time system component health monitoring
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {healthChecks.map((check) => (
                      <div key={check.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          {getHealthStatusIcon(check.status)}
                          <div>
                            <div className="font-medium">{check.name}</div>
                            {check.errorMessage && (
                              <div className="text-sm text-red-600">{check.errorMessage}</div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className={getHealthStatusColor(check.status)}>
                            {check.status.toUpperCase()}
                          </Badge>
                          {check.responseTime && (
                            <div className="text-xs text-slate-500 mt-1">
                              {check.responseTime}ms
                            </div>
                          )}
                          <div className="text-xs text-slate-500">
                            {formatTime(check.lastCheck)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="alerts" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Active Alerts</CardTitle>
                  <CardDescription>
                    System alerts requiring attention
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {alerts.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                        No Active Alerts
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400">
                        All systems are operating normally.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {alerts.map((alert) => (
                        <div key={alert.id} className="p-4 border rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {getAlertSeverityIcon(alert.severity)}
                              <div className="font-medium">{alert.title}</div>
                              <Badge variant="outline" className={getHealthStatusColor(alert.severity)}>
                                {alert.severity.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedAlert(alert)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleAcknowledgeAlert(alert.id)}
                                disabled={alert.acknowledged}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-sm text-slate-600">{alert.message}</div>
                          <div className="text-xs text-slate-500">
                            {formatTime(alert.timestamp)}
                            {alert.jobId && ` • Job: ${alert.jobId}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="metrics" className="space-y-4">
              {metrics && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Errors by Phase</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {Object.entries(metrics.errorsByPhase).map(([phase, count]) => (
                            <div key={phase} className="flex items-center justify-between">
                              <span className="text-sm capitalize">{phase.replace('_', ' ')}</span>
                              <div className="flex items-center space-x-2">
                                <div className="w-24 bg-slate-200 rounded-full h-2">
                                  <div 
                                    className="bg-red-500 h-2 rounded-full" 
                                    style={{ width: `${(count / metrics.totalErrors) * 100}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium">{count}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Errors by Severity</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {Object.entries(metrics.errorsBySeverity).map(([severity, count]) => (
                            <div key={severity} className="flex items-center justify-between">
                              <span className="text-sm capitalize">{severity}</span>
                              <div className="flex items-center space-x-2">
                                <div className="w-24 bg-slate-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      severity === 'critical' ? 'bg-red-500' :
                                      severity === 'high' ? 'bg-orange-500' :
                                      severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                                    }`}
                                    style={{ width: `${(count / metrics.totalErrors) * 100}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium">{count}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Recovery Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {metrics.recoverySuccessRate.toFixed(1)}%
                          </div>
                          <div className="text-sm text-slate-500">Recovery Success Rate</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {formatDuration(metrics.mttr)}
                          </div>
                          <div className="text-sm text-slate-500">Mean Time to Recovery</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {metrics.errorRate.toFixed(1)}
                          </div>
                          <div className="text-sm text-slate-500">Errors per Hour</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="patterns" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Error Patterns</CardTitle>
                  <CardDescription>
                    Detected recurring error patterns and suggested actions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {patterns.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                        No Error Patterns Detected
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400">
                        No recurring error patterns have been identified.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {patterns.map((pattern) => (
                        <div key={pattern.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <AlertTriangle className="h-4 w-4 text-orange-600" />
                              <div className="font-medium">{pattern.pattern}</div>
                              <Badge variant="outline">
                                {pattern.frequency} occurrences
                              </Badge>
                            </div>
                            <Badge variant="outline" className={getHealthStatusColor(pattern.severity)}>
                              {pattern.severity.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="text-sm text-slate-600 mb-3">{pattern.description}</div>
                          <div className="space-y-2">
                            <div className="text-sm font-medium">Suggested Actions:</div>
                            <ul className="text-sm text-slate-600 space-y-1">
                              {pattern.suggestedActions.map((action, index) => (
                                <li key={index} className="flex items-start space-x-2">
                                  <span className="text-slate-400">•</span>
                                  <span>{action}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="text-xs text-slate-500 mt-2">
                            Last occurrence: {formatTime(pattern.lastOccurrence)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Alert Details Dialog */}
        {selectedAlert && (
          <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  {getAlertSeverityIcon(selectedAlert.severity)}
                  <span>{selectedAlert.title}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium mb-1">Message</div>
                  <div className="text-sm text-slate-600">{selectedAlert.message}</div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Severity</div>
                    <Badge variant="outline" className={getHealthStatusColor(selectedAlert.severity)}>
                      {selectedAlert.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <div className="font-medium">Type</div>
                    <div className="text-slate-600">{selectedAlert.type.replace('_', ' ')}</div>
                  </div>
                  <div>
                    <div className="font-medium">Created</div>
                    <div className="text-slate-600">{formatTime(selectedAlert.timestamp)}</div>
                  </div>
                  <div>
                    <div className="font-medium">Status</div>
                    <div className="text-slate-600">
                      {selectedAlert.acknowledged ? 'Acknowledged' : 'Active'}
                    </div>
                  </div>
                </div>
                {selectedAlert.metadata && (
                  <div>
                    <div className="text-sm font-medium mb-1">Additional Details</div>
                    <pre className="text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded overflow-x-auto">
                      {JSON.stringify(selectedAlert.metadata, null, 2)}
                    </pre>
                  </div>
                )}
                <div className="flex space-x-2">
                  <Button 
                    onClick={() => handleAcknowledgeAlert(selectedAlert.id)}
                    disabled={selectedAlert.acknowledged}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Acknowledge
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => handleResolveAlert(selectedAlert.id, 'Resolved manually')}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Resolve
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
