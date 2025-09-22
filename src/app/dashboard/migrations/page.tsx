/**
 * Migrations Page
 * Comprehensive migration management and monitoring interface
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store';
import { MigrationEngine } from '@/lib/migration-engine';
import { SupabaseManagementAPI } from '@/lib/supabase';
import { MigrationWizard } from '@/components/migration/migration-wizard';
import { MigrationMonitor } from '@/components/migration/migration-monitor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Copy,
  Trash2,
  Download,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
  Database,
  TrendingUp,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import type { MigrationJob, SupabaseProject } from '@/types';

export default function MigrationsPage() {
  const { data: session } = useSession();
  const { selectedOrganization } = useAuthStore();
  
  // State
  const [migrationEngine, setMigrationEngine] = useState<MigrationEngine | null>(null);
  const [jobs, setJobs] = useState<MigrationJob[]>([]);
  const [projects, setProjects] = useState<SupabaseProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Dialog states
  const [showWizard, setShowWizard] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showMonitor, setShowMonitor] = useState(false);

  useEffect(() => {
    if (selectedOrganization && session?.accessToken) {
      initializeMigrationEngine();
      loadProjects();
      loadMigrationJobs();
    }
  }, [selectedOrganization, session?.accessToken]);

  const initializeMigrationEngine = () => {
    if (session?.accessToken) {
      const engine = new MigrationEngine(session.accessToken as string);
      
      // Set up event listeners
      engine.on('migration:started', (job) => {
        setJobs(prev => [...prev, job]);
        toast.success('Migration started successfully');
      });

      engine.on('migration:progress', ({ job }) => {
        setJobs(prev => prev.map(j => j.id === job.id ? job : j));
      });

      engine.on('migration:completed', (job) => {
        setJobs(prev => prev.map(j => j.id === job.id ? job : j));
        toast.success(`Migration ${job.id} completed successfully!`);
      });

      engine.on('migration:failed', (job) => {
        setJobs(prev => prev.map(j => j.id === job.id ? job : j));
        toast.error(`Migration ${job.id} failed. Check the logs for details.`);
      });

      setMigrationEngine(engine);
    }
  };

  const loadProjects = async () => {
    if (!selectedOrganization || !session?.accessToken) return;

    try {
      const managementAPI = new SupabaseManagementAPI(session.accessToken as string);
      const response = await managementAPI.getProjects(selectedOrganization.id);
      
      if (response.success && response.data) {
        setProjects(response.data);
      } else {
        // Mock data for demonstration
        const mockProjects: SupabaseProject[] = [
          {
            id: '1',
            ref: 'abcdefghijklmnopqrst',
            name: 'production-api',
            organization_id: selectedOrganization.id,
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-09-20T15:30:00Z',
            status: 'ACTIVE_HEALTHY',
            region: 'us-east-1',
            database: { version: '15.1', host: 'db.abcdefghijklmnopqrst.supabase.co', port: 5432 },
            api_url: 'https://abcdefghijklmnopqrst.supabase.co',
            db_dns_name: 'db.abcdefghijklmnopqrst.supabase.co',
            jwt_secret: 'jwt-secret',
            service_role_key: 'service-role-key',
            anon_key: 'anon-key',
          },
          {
            id: '2',
            ref: 'zyxwvutsrqponmlkjihg',
            name: 'staging-frontend',
            organization_id: selectedOrganization.id,
            created_at: '2024-02-10T14:20:00Z',
            updated_at: '2024-09-22T09:15:00Z',
            status: 'ACTIVE_HEALTHY',
            region: 'us-west-1',
            database: { version: '15.1', host: 'db.zyxwvutsrqponmlkjihg.supabase.co', port: 5432 },
            api_url: 'https://zyxwvutsrqponmlkjihg.supabase.co',
            db_dns_name: 'db.zyxwvutsrqponmlkjihg.supabase.co',
            jwt_secret: 'jwt-secret',
            service_role_key: 'service-role-key',
            anon_key: 'anon-key',
          },
        ];
        setProjects(mockProjects);
      }
    } catch (error) {
      toast.error('Failed to load projects');
    }
  };

  const loadMigrationJobs = async () => {
    setIsLoading(true);
    
    // Mock migration jobs for demonstration
    const mockJobs: MigrationJob[] = [
      {
        id: 'migration_1727024400000_abc123',
        source_project_id: '1',
        target_project_id: '3',
        organization_id: 'org_123',
        status: 'completed',
        type: 'full_clone',
        created_at: '2024-09-22T10:00:00Z',
        started_at: '2024-09-22T10:01:00Z',
        completed_at: '2024-09-22T10:15:30Z',
        actual_duration: 930000, // 15.5 minutes
        progress: {
          overall_percentage: 100,
          current_phase: 'cutover',
          phases: [],
          stats: {
            tables_migrated: 12,
            total_tables: 12,
            rows_migrated: 45000,
            total_rows: 45000,
            storage_objects_migrated: 150,
            total_storage_objects: 150,
            functions_migrated: 3,
            total_functions: 3,
          },
        },
        configuration: {
          clone_type: 'full_clone',
          target_region: 'us-east-1',
          target_compute_tier: 'free',
          parallel_threads: 4,
          batch_size: 1000,
          enable_compression: true,
          include_storage: true,
          include_edge_functions: true,
          include_auth_config: true,
          preserve_user_data: true,
        },
        error_log: [],
        estimated_duration: 900000, // 15 minutes
      },
      {
        id: 'migration_1727028000000_def456',
        source_project_id: '2',
        target_project_id: '4',
        organization_id: 'org_123',
        status: 'running',
        type: 'schema_only',
        created_at: '2024-09-22T11:00:00Z',
        started_at: '2024-09-22T11:01:00Z',
        progress: {
          overall_percentage: 65,
          current_phase: 'schema_migration',
          phases: [],
          stats: {
            tables_migrated: 8,
            total_tables: 15,
            rows_migrated: 0,
            total_rows: 0,
            storage_objects_migrated: 0,
            total_storage_objects: 0,
            functions_migrated: 0,
            total_functions: 0,
          },
        },
        configuration: {
          clone_type: 'schema_only',
          target_region: 'us-west-1',
          target_compute_tier: 'pro',
          parallel_threads: 2,
          batch_size: 500,
          enable_compression: false,
          include_storage: false,
          include_edge_functions: false,
          include_auth_config: true,
          preserve_user_data: false,
        },
        error_log: [],
        estimated_duration: 600000, // 10 minutes
      },
      {
        id: 'migration_1727031600000_ghi789',
        source_project_id: '1',
        target_project_id: '5',
        organization_id: 'org_123',
        status: 'failed',
        type: 'full_clone',
        created_at: '2024-09-22T12:00:00Z',
        started_at: '2024-09-22T12:01:00Z',
        completed_at: '2024-09-22T12:08:45Z',
        actual_duration: 465000, // 7.75 minutes
        progress: {
          overall_percentage: 35,
          current_phase: 'data_migration',
          phases: [],
          stats: {
            tables_migrated: 5,
            total_tables: 12,
            rows_migrated: 15000,
            total_rows: 45000,
            storage_objects_migrated: 0,
            total_storage_objects: 150,
            functions_migrated: 0,
            total_functions: 3,
          },
        },
        configuration: {
          clone_type: 'full_clone',
          target_region: 'eu-west-1',
          target_compute_tier: 'team',
          parallel_threads: 8,
          batch_size: 2000,
          enable_compression: true,
          include_storage: true,
          include_edge_functions: true,
          include_auth_config: true,
          preserve_user_data: true,
        },
        error_log: [
          {
            id: 'error_1',
            timestamp: '2024-09-22T12:05:30Z',
            phase: 'data_migration',
            severity: 'high',
            error_code: 'CONNECTION_TIMEOUT',
            message: 'Database connection timeout during data migration',
            details: 'Connection to target database lost after 5 minutes of inactivity',
            auto_recoverable: false,
            recovery_attempted: false,
          },
        ],
        estimated_duration: 1200000, // 20 minutes
      },
    ];

    setTimeout(() => {
      setJobs(mockJobs);
      setIsLoading(false);
    }, 1000);
  };

  const handleStartMigration = (jobId: string) => {
    setSelectedJobId(jobId);
    setShowMonitor(true);
    setShowWizard(false);
  };

  const handleViewMigration = (jobId: string) => {
    setSelectedJobId(jobId);
    setShowMonitor(true);
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      setJobs(prev => prev.filter(j => j.id !== jobId));
      toast.success('Migration job deleted');
    } catch (error) {
      toast.error('Failed to delete migration job');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running':
        return <Activity className="h-4 w-4 text-blue-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
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

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         projects.find(p => p.id === job.source_project_id)?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: jobs.length,
    running: jobs.filter(j => j.status === 'running').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    failed: jobs.filter(j => j.status === 'failed').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Migrations
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage project migrations and cloning operations
          </p>
        </div>
        <Button onClick={() => setShowWizard(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Migration
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-slate-600" />
              <div>
                <div className="text-sm text-slate-500">Total Migrations</div>
                <div className="text-2xl font-bold">{stats.total}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-sm text-slate-500">Running</div>
                <div className="text-2xl font-bold text-blue-600">{stats.running}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-sm text-slate-500">Completed</div>
                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <div className="text-sm text-slate-500">Failed</div>
                <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search migrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={loadMigrationJobs}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Migrations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Migration Jobs</CardTitle>
          <CardDescription>
            Track the progress and status of your migration operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-8">
              <Database className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                No Migrations Found
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                {searchQuery || statusFilter !== 'all' 
                  ? 'No migrations match your current filters.'
                  : 'You haven&apos;t started any migrations yet.'
                }
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button onClick={() => setShowWizard(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Start Your First Migration
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job ID</TableHead>
                  <TableHead>Source Project</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.map((job) => {
                  const sourceProject = projects.find(p => p.id === job.source_project_id);
                  return (
                    <TableRow key={job.id}>
                      <TableCell>
                        <div className="font-mono text-sm">
                          {job.id.split('_')[2]?.substring(0, 8)}...
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {sourceProject?.name || 'Unknown Project'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {job.type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(job.status)}
                          <Badge variant="outline" className={getStatusColor(job.status)}>
                            {job.status.toUpperCase()}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Progress value={job.progress.overall_percentage} className="w-20" />
                          <div className="text-xs text-slate-500">
                            {job.progress.overall_percentage}%
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {job.actual_duration 
                            ? formatDuration(job.actual_duration)
                            : job.started_at
                              ? formatDuration(Date.now() - new Date(job.started_at).getTime())
                              : 'N/A'
                          }
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-slate-500">
                          {formatTime(job.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewMigration(job.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {job.status === 'completed' && (
                              <DropdownMenuItem>
                                <Copy className="mr-2 h-4 w-4" />
                                Clone Again
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              Export Logs
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteJob(job.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Migration Wizard */}
      <MigrationWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onMigrationStarted={handleStartMigration}
      />

      {/* Migration Monitor */}
      {selectedJobId && (
        <MigrationMonitor
          jobId={selectedJobId}
          isOpen={showMonitor}
          onClose={() => {
            setShowMonitor(false);
            setSelectedJobId(null);
          }}
        />
      )}
    </div>
  );
}