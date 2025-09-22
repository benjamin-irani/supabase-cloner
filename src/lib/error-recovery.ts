/**
 * Error Recovery Engine
 * Comprehensive error handling, recovery, and resilience mechanisms
 */

import { EventEmitter } from 'events';
import type { 
  MigrationJob, 
  MigrationError, 
  MigrationPhase,
  MigrationProgress 
} from '@/types';

export interface RecoveryStrategy {
  id: string;
  name: string;
  description: string;
  applicableErrors: string[];
  maxRetries: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  baseDelay: number;
  maxDelay: number;
  execute: (error: MigrationError, context: RecoveryContext) => Promise<RecoveryResult>;
}

export interface RecoveryContext {
  job: MigrationJob;
  phase: MigrationPhase;
  attemptNumber: number;
  previousAttempts: RecoveryAttempt[];
  errorHistory: MigrationError[];
}

export interface RecoveryAttempt {
  id: string;
  timestamp: string;
  strategy: string;
  success: boolean;
  error?: string;
  duration: number;
}

export interface RecoveryResult {
  success: boolean;
  action: 'retry' | 'skip' | 'rollback' | 'manual_intervention';
  message: string;
  delayBeforeRetry?: number;
  rollbackToPhase?: MigrationPhase;
  requiresManualIntervention?: boolean;
}

export interface Checkpoint {
  id: string;
  jobId: string;
  phase: MigrationPhase;
  timestamp: string;
  progress: MigrationProgress;
  state: any; // Phase-specific state data
  canRollback: boolean;
  rollbackInstructions?: string[];
}

export class ErrorRecoveryEngine extends EventEmitter {
  private recoveryStrategies: Map<string, RecoveryStrategy> = new Map();
  private checkpoints: Map<string, Checkpoint[]> = new Map();
  private activeRecoveries: Map<string, RecoveryContext> = new Map();

  constructor() {
    super();
    this.initializeDefaultStrategies();
  }

  /**
   * Initialize default recovery strategies
   */
  private initializeDefaultStrategies(): void {
    const strategies: RecoveryStrategy[] = [
      {
        id: 'connection-retry',
        name: 'Connection Retry',
        description: 'Retry operations that failed due to connection issues',
        applicableErrors: ['CONNECTION_TIMEOUT', 'CONNECTION_REFUSED', 'NETWORK_ERROR'],
        maxRetries: 5,
        backoffStrategy: 'exponential',
        baseDelay: 1000,
        maxDelay: 30000,
        execute: this.executeConnectionRetry.bind(this),
      },
      {
        id: 'resource-cleanup',
        name: 'Resource Cleanup',
        description: 'Clean up resources and retry when resource conflicts occur',
        applicableErrors: ['RESOURCE_CONFLICT', 'RESOURCE_LOCKED', 'RESOURCE_EXISTS'],
        maxRetries: 3,
        backoffStrategy: 'linear',
        baseDelay: 2000,
        maxDelay: 10000,
        execute: this.executeResourceCleanup.bind(this),
      },
      {
        id: 'permission-escalation',
        name: 'Permission Escalation',
        description: 'Attempt to resolve permission issues',
        applicableErrors: ['PERMISSION_DENIED', 'INSUFFICIENT_PRIVILEGES', 'AUTH_FAILED'],
        maxRetries: 2,
        backoffStrategy: 'fixed',
        baseDelay: 5000,
        maxDelay: 5000,
        execute: this.executePermissionEscalation.bind(this),
      },
      {
        id: 'data-integrity-repair',
        name: 'Data Integrity Repair',
        description: 'Repair data integrity issues and continue',
        applicableErrors: ['DATA_CORRUPTION', 'CONSTRAINT_VIOLATION', 'FOREIGN_KEY_ERROR'],
        maxRetries: 2,
        backoffStrategy: 'fixed',
        baseDelay: 3000,
        maxDelay: 3000,
        execute: this.executeDataIntegrityRepair.bind(this),
      },
      {
        id: 'partial-rollback',
        name: 'Partial Rollback',
        description: 'Rollback to previous checkpoint and retry',
        applicableErrors: ['CRITICAL_ERROR', 'SYSTEM_ERROR', 'UNEXPECTED_ERROR'],
        maxRetries: 1,
        backoffStrategy: 'fixed',
        baseDelay: 0,
        maxDelay: 0,
        execute: this.executePartialRollback.bind(this),
      },
      {
        id: 'graceful-degradation',
        name: 'Graceful Degradation',
        description: 'Skip non-critical components and continue',
        applicableErrors: ['OPTIONAL_COMPONENT_ERROR', 'FEATURE_NOT_SUPPORTED'],
        maxRetries: 0,
        backoffStrategy: 'fixed',
        baseDelay: 0,
        maxDelay: 0,
        execute: this.executeGracefulDegradation.bind(this),
      },
    ];

    strategies.forEach(strategy => {
      this.recoveryStrategies.set(strategy.id, strategy);
    });
  }

  /**
   * Handle migration error and attempt recovery
   */
  async handleError(
    job: MigrationJob, 
    error: MigrationError, 
    phase: MigrationPhase
  ): Promise<RecoveryResult> {
    this.emit('recovery:started', { job, error, phase });

    // Find applicable recovery strategies
    const applicableStrategies = this.findApplicableStrategies(error);
    
    if (applicableStrategies.length === 0) {
      return {
        success: false,
        action: 'manual_intervention',
        message: 'No recovery strategy available for this error',
        requiresManualIntervention: true,
      };
    }

    // Get or create recovery context
    let context = this.activeRecoveries.get(job.id);
    if (!context) {
      context = {
        job,
        phase,
        attemptNumber: 1,
        previousAttempts: [],
        errorHistory: [error],
      };
      this.activeRecoveries.set(job.id, context);
    } else {
      context.attemptNumber++;
      context.errorHistory.push(error);
    }

    // Try recovery strategies in order of priority
    for (const strategy of applicableStrategies) {
      if (context.attemptNumber > strategy.maxRetries) {
        continue; // Skip if max retries exceeded
      }

      try {
        const startTime = Date.now();
        const result = await strategy.execute(error, context);
        const duration = Date.now() - startTime;

        const attempt: RecoveryAttempt = {
          id: `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          strategy: strategy.id,
          success: result.success,
          error: result.success ? undefined : result.message,
          duration,
        };

        context.previousAttempts.push(attempt);

        this.emit('recovery:attempt', { job, error, strategy, attempt, result });

        if (result.success) {
          this.activeRecoveries.delete(job.id);
          this.emit('recovery:success', { job, error, strategy, result });
          return result;
        }

        // If strategy failed but suggests a specific action, return it
        if (result.action !== 'retry') {
          this.emit('recovery:failed', { job, error, strategy, result });
          return result;
        }

      } catch (recoveryError) {
        this.emit('recovery:error', { job, error, strategy, recoveryError });
        continue; // Try next strategy
      }
    }

    // All strategies failed
    this.activeRecoveries.delete(job.id);
    return {
      success: false,
      action: 'manual_intervention',
      message: 'All recovery strategies failed',
      requiresManualIntervention: true,
    };
  }

  /**
   * Create checkpoint for rollback capability
   */
  async createCheckpoint(
    jobId: string, 
    phase: MigrationPhase, 
    progress: MigrationProgress,
    state: any
  ): Promise<string> {
    const checkpointId = `checkpoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const checkpoint: Checkpoint = {
      id: checkpointId,
      jobId,
      phase,
      timestamp: new Date().toISOString(),
      progress: { ...progress },
      state: { ...state },
      canRollback: this.canRollbackFromPhase(phase),
      rollbackInstructions: this.generateRollbackInstructions(phase, state),
    };

    if (!this.checkpoints.has(jobId)) {
      this.checkpoints.set(jobId, []);
    }

    this.checkpoints.get(jobId)!.push(checkpoint);

    // Keep only last 10 checkpoints per job
    const checkpoints = this.checkpoints.get(jobId)!;
    if (checkpoints.length > 10) {
      checkpoints.splice(0, checkpoints.length - 10);
    }

    this.emit('checkpoint:created', { jobId, checkpoint });
    return checkpointId;
  }

  /**
   * Rollback to specific checkpoint
   */
  async rollbackToCheckpoint(jobId: string, checkpointId: string): Promise<boolean> {
    const checkpoints = this.checkpoints.get(jobId);
    if (!checkpoints) {
      return false;
    }

    const checkpoint = checkpoints.find(cp => cp.id === checkpointId);
    if (!checkpoint || !checkpoint.canRollback) {
      return false;
    }

    try {
      this.emit('rollback:started', { jobId, checkpoint });

      // Execute rollback instructions
      if (checkpoint.rollbackInstructions) {
        for (const instruction of checkpoint.rollbackInstructions) {
          await this.executeRollbackInstruction(instruction, checkpoint);
        }
      }

      // Remove checkpoints after the rollback point
      const rollbackIndex = checkpoints.findIndex(cp => cp.id === checkpointId);
      if (rollbackIndex !== -1) {
        checkpoints.splice(rollbackIndex + 1);
      }

      this.emit('rollback:completed', { jobId, checkpoint });
      return true;

    } catch (error) {
      this.emit('rollback:failed', { jobId, checkpoint, error });
      return false;
    }
  }

  /**
   * Get recovery suggestions for an error
   */
  getRecoverySuggestions(error: MigrationError): string[] {
    const suggestions: string[] = [];
    const strategies = this.findApplicableStrategies(error);

    strategies.forEach(strategy => {
      suggestions.push(`Try ${strategy.name}: ${strategy.description}`);
    });

    // Add general suggestions based on error type
    switch (error.error_code) {
      case 'CONNECTION_TIMEOUT':
        suggestions.push('Check network connectivity between source and target');
        suggestions.push('Verify database server is responsive');
        break;
      case 'PERMISSION_DENIED':
        suggestions.push('Verify database user has required permissions');
        suggestions.push('Check if service role key is valid');
        break;
      case 'RESOURCE_CONFLICT':
        suggestions.push('Ensure target project name is unique');
        suggestions.push('Check if resources are being used by other processes');
        break;
      case 'DATA_CORRUPTION':
        suggestions.push('Run data integrity checks on source database');
        suggestions.push('Consider using schema-only migration first');
        break;
    }

    return suggestions;
  }

  /**
   * Recovery strategy implementations
   */
  private async executeConnectionRetry(
    error: MigrationError, 
    context: RecoveryContext
  ): Promise<RecoveryResult> {
    const delay = this.calculateBackoffDelay(
      this.recoveryStrategies.get('connection-retry')!,
      context.attemptNumber
    );

    return {
      success: true,
      action: 'retry',
      message: 'Retrying after connection error',
      delayBeforeRetry: delay,
    };
  }

  private async executeResourceCleanup(
    error: MigrationError, 
    context: RecoveryContext
  ): Promise<RecoveryResult> {
    // Simulate resource cleanup
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      success: true,
      action: 'retry',
      message: 'Resources cleaned up, retrying operation',
      delayBeforeRetry: 2000,
    };
  }

  private async executePermissionEscalation(
    error: MigrationError, 
    context: RecoveryContext
  ): Promise<RecoveryResult> {
    // In a real implementation, this might refresh tokens or request elevated permissions
    return {
      success: false,
      action: 'manual_intervention',
      message: 'Permission issue requires manual intervention',
      requiresManualIntervention: true,
    };
  }

  private async executeDataIntegrityRepair(
    error: MigrationError, 
    context: RecoveryContext
  ): Promise<RecoveryResult> {
    // Simulate data repair attempt
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      success: Math.random() > 0.3, // 70% success rate
      action: 'retry',
      message: 'Attempted data integrity repair',
    };
  }

  private async executePartialRollback(
    error: MigrationError, 
    context: RecoveryContext
  ): Promise<RecoveryResult> {
    const checkpoints = this.checkpoints.get(context.job.id);
    if (!checkpoints || checkpoints.length === 0) {
      return {
        success: false,
        action: 'manual_intervention',
        message: 'No checkpoints available for rollback',
        requiresManualIntervention: true,
      };
    }

    const lastCheckpoint = checkpoints[checkpoints.length - 1];
    const rollbackSuccess = await this.rollbackToCheckpoint(context.job.id, lastCheckpoint.id);

    return {
      success: rollbackSuccess,
      action: rollbackSuccess ? 'retry' : 'manual_intervention',
      message: rollbackSuccess 
        ? `Rolled back to ${lastCheckpoint.phase} phase` 
        : 'Rollback failed',
      rollbackToPhase: rollbackSuccess ? lastCheckpoint.phase : undefined,
      requiresManualIntervention: !rollbackSuccess,
    };
  }

  private async executeGracefulDegradation(
    error: MigrationError, 
    context: RecoveryContext
  ): Promise<RecoveryResult> {
    return {
      success: true,
      action: 'skip',
      message: 'Skipping optional component due to error',
    };
  }

  /**
   * Helper methods
   */
  private findApplicableStrategies(error: MigrationError): RecoveryStrategy[] {
    const strategies: RecoveryStrategy[] = [];
    
    this.recoveryStrategies.forEach(strategy => {
      if (strategy.applicableErrors.includes(error.error_code)) {
        strategies.push(strategy);
      }
    });

    // Sort by priority (connection issues first, then resource issues, etc.)
    return strategies.sort((a, b) => {
      const priority = ['connection-retry', 'resource-cleanup', 'data-integrity-repair', 'permission-escalation', 'graceful-degradation', 'partial-rollback'];
      return priority.indexOf(a.id) - priority.indexOf(b.id);
    });
  }

  private calculateBackoffDelay(strategy: RecoveryStrategy, attemptNumber: number): number {
    switch (strategy.backoffStrategy) {
      case 'linear':
        return Math.min(strategy.baseDelay * attemptNumber, strategy.maxDelay);
      case 'exponential':
        return Math.min(strategy.baseDelay * Math.pow(2, attemptNumber - 1), strategy.maxDelay);
      case 'fixed':
      default:
        return strategy.baseDelay;
    }
  }

  private canRollbackFromPhase(phase: MigrationPhase): boolean {
    // Some phases can't be rolled back safely
    const nonRollbackPhases: MigrationPhase[] = ['cutover', 'validation'];
    return !nonRollbackPhases.includes(phase);
  }

  private generateRollbackInstructions(phase: MigrationPhase, state: any): string[] {
    const instructions: string[] = [];

    switch (phase) {
      case 'preparation':
        instructions.push('Delete created target project');
        break;
      case 'schema_migration':
        instructions.push('Drop created tables and schemas');
        instructions.push('Remove database extensions');
        break;
      case 'data_migration':
        instructions.push('Truncate migrated tables');
        instructions.push('Reset sequences');
        break;
      case 'storage_migration':
        instructions.push('Delete created storage buckets');
        instructions.push('Remove uploaded objects');
        break;
      case 'edge_functions_migration':
        instructions.push('Delete deployed functions');
        break;
      case 'security_migration':
        instructions.push('Remove RLS policies');
        instructions.push('Drop custom roles');
        break;
      case 'realtime_setup':
        instructions.push('Remove realtime publications');
        break;
    }

    return instructions;
  }

  private async executeRollbackInstruction(instruction: string, checkpoint: Checkpoint): Promise<void> {
    // In a real implementation, this would execute the actual rollback operations
    // For now, just simulate the operation
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * Cleanup methods
   */
  cleanupJob(jobId: string): void {
    this.activeRecoveries.delete(jobId);
    this.checkpoints.delete(jobId);
  }

  getJobCheckpoints(jobId: string): Checkpoint[] {
    return this.checkpoints.get(jobId) || [];
  }

  getActiveRecovery(jobId: string): RecoveryContext | undefined {
    return this.activeRecoveries.get(jobId);
  }
}
