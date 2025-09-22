/**
 * Error Monitoring and Reporting System
 * Comprehensive error tracking, analytics, and alerting
 */

import { EventEmitter } from 'events';
import type { MigrationJob, MigrationError, MigrationPhase } from '@/types';

export interface ErrorMetrics {
  totalErrors: number;
  errorsByPhase: Record<MigrationPhase, number>;
  errorsByCode: Record<string, number>;
  errorsBySeverity: Record<'low' | 'medium' | 'high' | 'critical', number>;
  errorRate: number; // errors per hour
  mttr: number; // mean time to recovery in minutes
  recoverySuccessRate: number;
}

export interface ErrorPattern {
  id: string;
  pattern: string;
  description: string;
  frequency: number;
  lastOccurrence: string;
  suggestedActions: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ErrorAlert {
  id: string;
  type: 'threshold_exceeded' | 'pattern_detected' | 'critical_error' | 'system_health';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  jobId?: string;
  errorId?: string;
  acknowledged: boolean;
  resolvedAt?: string;
  metadata?: Record<string, any>;
}

export interface HealthCheck {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  lastCheck: string;
  responseTime?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export class ErrorMonitoringSystem extends EventEmitter {
  private errors: Map<string, MigrationError> = new Map();
  private errorPatterns: Map<string, ErrorPattern> = new Map();
  private alerts: Map<string, ErrorAlert> = new Map();
  private healthChecks: Map<string, HealthCheck> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;

  // Configuration
  private config = {
    errorRateThreshold: 10, // errors per hour
    criticalErrorThreshold: 3, // critical errors in 10 minutes
    patternDetectionWindow: 3600000, // 1 hour in ms
    healthCheckInterval: 30000, // 30 seconds
    alertRetentionDays: 30,
  };

  constructor() {
    super();
    this.initializeHealthChecks();
    this.startMonitoring();
  }

  /**
   * Record a migration error
   */
  recordError(error: MigrationError, job: MigrationJob): void {
    this.errors.set(error.id, error);
    
    // Update error patterns
    this.updateErrorPatterns(error);
    
    // Check for alerts
    this.checkForAlerts(error, job);
    
    // Emit event
    this.emit('error:recorded', { error, job });
  }

  /**
   * Get error metrics for a time period
   */
  getErrorMetrics(timeWindow: number = 3600000): ErrorMetrics {
    const cutoff = Date.now() - timeWindow;
    const recentErrors = Array.from(this.errors.values())
      .filter(error => new Date(error.timestamp).getTime() > cutoff);

    const errorsByPhase = recentErrors.reduce((acc, error) => {
      acc[error.phase] = (acc[error.phase] || 0) + 1;
      return acc;
    }, {} as Record<MigrationPhase, number>);

    const errorsByCode = recentErrors.reduce((acc, error) => {
      acc[error.error_code] = (acc[error.error_code] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorsBySeverity = recentErrors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<'low' | 'medium' | 'high' | 'critical', number>);

    const errorRate = (recentErrors.length / timeWindow) * 3600000; // per hour

    return {
      totalErrors: recentErrors.length,
      errorsByPhase,
      errorsByCode,
      errorsBySeverity,
      errorRate,
      mttr: this.calculateMTTR(recentErrors),
      recoverySuccessRate: this.calculateRecoverySuccessRate(recentErrors),
    };
  }

  /**
   * Get detected error patterns
   */
  getErrorPatterns(): ErrorPattern[] {
    return Array.from(this.errorPatterns.values())
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): ErrorAlert[] {
    return Array.from(this.alerts.values())
      .filter(alert => !alert.acknowledged && !alert.resolvedAt)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Get system health status
   */
  getSystemHealth(): {
    overall: 'healthy' | 'warning' | 'critical';
    checks: HealthCheck[];
    summary: {
      healthy: number;
      warning: number;
      critical: number;
    };
  } {
    const checks = Array.from(this.healthChecks.values());
    const summary = checks.reduce((acc, check) => {
      acc[check.status]++;
      return acc;
    }, { healthy: 0, warning: 0, critical: 0 });

    let overall: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (summary.critical > 0) {
      overall = 'critical';
    } else if (summary.warning > 0) {
      overall = 'warning';
    }

    return { overall, checks, summary };
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, userId?: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.acknowledged) {
      return false;
    }

    alert.acknowledged = true;
    alert.metadata = { 
      ...alert.metadata, 
      acknowledgedBy: userId,
      acknowledgedAt: new Date().toISOString(),
    };

    this.emit('alert:acknowledged', { alert, userId });
    return true;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string, userId?: string, resolution?: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.resolvedAt) {
      return false;
    }

    alert.resolvedAt = new Date().toISOString();
    alert.metadata = {
      ...alert.metadata,
      resolvedBy: userId,
      resolution,
    };

    this.emit('alert:resolved', { alert, userId, resolution });
    return true;
  }

  /**
   * Get error trends and analytics
   */
  getErrorTrends(timeWindow: number = 86400000): {
    hourlyErrorCounts: Array<{ hour: string; count: number }>;
    topErrorCodes: Array<{ code: string; count: number; percentage: number }>;
    phaseErrorDistribution: Array<{ phase: MigrationPhase; count: number; percentage: number }>;
    severityTrend: Array<{ severity: string; count: number; trend: 'up' | 'down' | 'stable' }>;
  } {
    const cutoff = Date.now() - timeWindow;
    const recentErrors = Array.from(this.errors.values())
      .filter(error => new Date(error.timestamp).getTime() > cutoff)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Hourly error counts
    const hourlyErrorCounts = this.calculateHourlyErrorCounts(recentErrors, timeWindow);

    // Top error codes
    const errorCodeCounts = recentErrors.reduce((acc, error) => {
      acc[error.error_code] = (acc[error.error_code] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topErrorCodes = Object.entries(errorCodeCounts)
      .map(([code, count]) => ({
        code,
        count,
        percentage: (count / recentErrors.length) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Phase error distribution
    const phaseErrorCounts = recentErrors.reduce((acc, error) => {
      acc[error.phase] = (acc[error.phase] || 0) + 1;
      return acc;
    }, {} as Record<MigrationPhase, number>);

    const phaseErrorDistribution = Object.entries(phaseErrorCounts)
      .map(([phase, count]) => ({
        phase: phase as MigrationPhase,
        count,
        percentage: (count / recentErrors.length) * 100,
      }))
      .sort((a, b) => b.count - a.count);

    // Severity trend (simplified)
    const severityTrend = ['low', 'medium', 'high', 'critical'].map(severity => {
      const count = recentErrors.filter(error => error.severity === severity).length;
      return {
        severity,
        count,
        trend: 'stable' as const, // Would calculate actual trend in real implementation
      };
    });

    return {
      hourlyErrorCounts,
      topErrorCodes,
      phaseErrorDistribution,
      severityTrend,
    };
  }

  /**
   * Private methods
   */
  private initializeHealthChecks(): void {
    const checks = [
      {
        id: 'database-connectivity',
        name: 'Database Connectivity',
        check: this.checkDatabaseConnectivity.bind(this),
      },
      {
        id: 'api-availability',
        name: 'Supabase Management API',
        check: this.checkAPIAvailability.bind(this),
      },
      {
        id: 'storage-access',
        name: 'Storage Access',
        check: this.checkStorageAccess.bind(this),
      },
      {
        id: 'memory-usage',
        name: 'Memory Usage',
        check: this.checkMemoryUsage.bind(this),
      },
      {
        id: 'error-rate',
        name: 'Error Rate',
        check: this.checkErrorRate.bind(this),
      },
    ];

    checks.forEach(({ id, name, check }) => {
      this.healthChecks.set(id, {
        id,
        name,
        status: 'healthy',
        lastCheck: new Date().toISOString(),
      });
    });
  }

  private startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.runHealthChecks();
      this.cleanupOldData();
    }, this.config.healthCheckInterval);
  }

  private async runHealthChecks(): Promise<void> {
    const checks = [
      { id: 'database-connectivity', check: this.checkDatabaseConnectivity.bind(this) },
      { id: 'api-availability', check: this.checkAPIAvailability.bind(this) },
      { id: 'storage-access', check: this.checkStorageAccess.bind(this) },
      { id: 'memory-usage', check: this.checkMemoryUsage.bind(this) },
      { id: 'error-rate', check: this.checkErrorRate.bind(this) },
    ];

    for (const { id, check } of checks) {
      try {
        const startTime = Date.now();
        const result = await check();
        const responseTime = Date.now() - startTime;

        const healthCheck: HealthCheck = {
          id,
          name: this.healthChecks.get(id)?.name || id,
          status: result.status,
          lastCheck: new Date().toISOString(),
          responseTime,
          errorMessage: result.error,
          metadata: result.metadata,
        };

        this.healthChecks.set(id, healthCheck);

        if (result.status === 'critical') {
          this.createAlert({
            type: 'system_health',
            severity: 'critical',
            title: `Health Check Failed: ${healthCheck.name}`,
            message: result.error || 'Health check failed',
            metadata: { healthCheckId: id, ...result.metadata },
          });
        }

      } catch (error) {
        const healthCheck: HealthCheck = {
          id,
          name: this.healthChecks.get(id)?.name || id,
          status: 'critical',
          lastCheck: new Date().toISOString(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        };

        this.healthChecks.set(id, healthCheck);
      }
    }
  }

  private async checkDatabaseConnectivity(): Promise<{ status: 'healthy' | 'warning' | 'critical'; error?: string; metadata?: any }> {
    // Mock database connectivity check
    await new Promise(resolve => setTimeout(resolve, 100));
    return Math.random() > 0.1 
      ? { status: 'healthy' }
      : { status: 'critical', error: 'Database connection timeout' };
  }

  private async checkAPIAvailability(): Promise<{ status: 'healthy' | 'warning' | 'critical'; error?: string; metadata?: any }> {
    // Mock API availability check
    await new Promise(resolve => setTimeout(resolve, 50));
    return Math.random() > 0.05 
      ? { status: 'healthy' }
      : { status: 'warning', error: 'API response time elevated' };
  }

  private async checkStorageAccess(): Promise<{ status: 'healthy' | 'warning' | 'critical'; error?: string; metadata?: any }> {
    // Mock storage access check
    await new Promise(resolve => setTimeout(resolve, 75));
    return { status: 'healthy' };
  }

  private async checkMemoryUsage(): Promise<{ status: 'healthy' | 'warning' | 'critical'; error?: string; metadata?: any }> {
    // Mock memory usage check
    const memoryUsage = Math.random() * 100;
    if (memoryUsage > 90) {
      return { status: 'critical', error: 'Memory usage critical', metadata: { usage: memoryUsage } };
    } else if (memoryUsage > 75) {
      return { status: 'warning', error: 'Memory usage elevated', metadata: { usage: memoryUsage } };
    }
    return { status: 'healthy', metadata: { usage: memoryUsage } };
  }

  private async checkErrorRate(): Promise<{ status: 'healthy' | 'warning' | 'critical'; error?: string; metadata?: any }> {
    const metrics = this.getErrorMetrics();
    if (metrics.errorRate > this.config.errorRateThreshold * 2) {
      return { status: 'critical', error: 'Error rate critical', metadata: { errorRate: metrics.errorRate } };
    } else if (metrics.errorRate > this.config.errorRateThreshold) {
      return { status: 'warning', error: 'Error rate elevated', metadata: { errorRate: metrics.errorRate } };
    }
    return { status: 'healthy', metadata: { errorRate: metrics.errorRate } };
  }

  private updateErrorPatterns(error: MigrationError): void {
    const patternKey = `${error.error_code}_${error.phase}`;
    
    let pattern = this.errorPatterns.get(patternKey);
    if (!pattern) {
      pattern = {
        id: patternKey,
        pattern: `${error.error_code} in ${error.phase} phase`,
        description: this.generatePatternDescription(error),
        frequency: 0,
        lastOccurrence: error.timestamp,
        suggestedActions: this.generateSuggestedActions(error),
        severity: error.severity,
      };
      this.errorPatterns.set(patternKey, pattern);
    }

    pattern.frequency++;
    pattern.lastOccurrence = error.timestamp;

    // Check if pattern frequency warrants an alert
    if (pattern.frequency >= 5 && pattern.severity === 'high') {
      this.createAlert({
        type: 'pattern_detected',
        severity: 'high',
        title: `Error Pattern Detected: ${pattern.pattern}`,
        message: `Pattern "${pattern.pattern}" has occurred ${pattern.frequency} times`,
        metadata: { patternId: pattern.id, frequency: pattern.frequency },
      });
    }
  }

  private checkForAlerts(error: MigrationError, job: MigrationJob): void {
    // Critical error alert
    if (error.severity === 'critical') {
      this.createAlert({
        type: 'critical_error',
        severity: 'critical',
        title: 'Critical Migration Error',
        message: `Critical error in job ${job.id}: ${error.message}`,
        jobId: job.id,
        errorId: error.id,
      });
    }

    // Error rate threshold alert
    const metrics = this.getErrorMetrics(600000); // 10 minutes
    if (metrics.errorsBySeverity.critical >= this.config.criticalErrorThreshold) {
      this.createAlert({
        type: 'threshold_exceeded',
        severity: 'high',
        title: 'Critical Error Threshold Exceeded',
        message: `${metrics.errorsBySeverity.critical} critical errors in the last 10 minutes`,
        metadata: { threshold: this.config.criticalErrorThreshold, actual: metrics.errorsBySeverity.critical },
      });
    }
  }

  private createAlert(alertData: Omit<ErrorAlert, 'id' | 'timestamp' | 'acknowledged'>): void {
    const alert: ErrorAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      ...alertData,
    };

    this.alerts.set(alert.id, alert);
    this.emit('alert:created', alert);
  }

  private calculateMTTR(errors: MigrationError[]): number {
    // Simplified MTTR calculation
    const recoveredErrors = errors.filter(error => error.recovery_attempted);
    if (recoveredErrors.length === 0) return 0;

    const totalRecoveryTime = recoveredErrors.reduce((total, error) => {
      // Mock recovery time calculation
      return total + Math.random() * 300; // 0-5 minutes
    }, 0);

    return totalRecoveryTime / recoveredErrors.length;
  }

  private calculateRecoverySuccessRate(errors: MigrationError[]): number {
    const recoveryAttempts = errors.filter(error => error.recovery_attempted).length;
    if (recoveryAttempts === 0) return 0;

    const successfulRecoveries = errors.filter(error => 
      error.recovery_attempted && error.auto_recoverable
    ).length;

    return (successfulRecoveries / recoveryAttempts) * 100;
  }

  private calculateHourlyErrorCounts(errors: MigrationError[], timeWindow: number): Array<{ hour: string; count: number }> {
    const hours = Math.ceil(timeWindow / 3600000);
    const now = new Date();
    const hourlyData: Array<{ hour: string; count: number }> = [];

    for (let i = hours - 1; i >= 0; i--) {
      const hour = new Date(now.getTime() - (i * 3600000));
      const hourStart = new Date(hour.getFullYear(), hour.getMonth(), hour.getDate(), hour.getHours());
      const hourEnd = new Date(hourStart.getTime() + 3600000);

      const count = errors.filter(error => {
        const errorTime = new Date(error.timestamp);
        return errorTime >= hourStart && errorTime < hourEnd;
      }).length;

      hourlyData.push({
        hour: hourStart.toISOString(),
        count,
      });
    }

    return hourlyData;
  }

  private generatePatternDescription(error: MigrationError): string {
    return `Recurring ${error.error_code} errors during ${error.phase} phase`;
  }

  private generateSuggestedActions(error: MigrationError): string[] {
    const actions: string[] = [];

    switch (error.error_code) {
      case 'CONNECTION_TIMEOUT':
        actions.push('Check network stability');
        actions.push('Increase connection timeout values');
        actions.push('Verify database server capacity');
        break;
      case 'PERMISSION_DENIED':
        actions.push('Verify user permissions');
        actions.push('Check API key validity');
        actions.push('Review security policies');
        break;
      case 'RESOURCE_CONFLICT':
        actions.push('Ensure unique resource names');
        actions.push('Check for concurrent operations');
        break;
      default:
        actions.push('Review error logs for details');
        actions.push('Contact support if issue persists');
    }

    return actions;
  }

  private cleanupOldData(): void {
    const cutoff = Date.now() - (this.config.alertRetentionDays * 24 * 60 * 60 * 1000);

    // Clean up old alerts
    Array.from(this.alerts.entries()).forEach(([id, alert]) => {
      if (new Date(alert.timestamp).getTime() < cutoff && alert.resolvedAt) {
        this.alerts.delete(id);
      }
    });

    // Clean up old errors (keep last 1000)
    if (this.errors.size > 1000) {
      const sortedErrors = Array.from(this.errors.entries())
        .sort(([, a], [, b]) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      sortedErrors.slice(1000).forEach(([id]) => {
        this.errors.delete(id);
      });
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.removeAllListeners();
  }
}
