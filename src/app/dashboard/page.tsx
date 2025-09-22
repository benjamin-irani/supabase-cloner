/**
 * Dashboard Overview Page
 * Main dashboard with project overview, statistics, and quick actions
 */

'use client';

import { useEffect, useState } from 'react';
import { useAuthStore, useDashboardStore, useMigrationStore } from '@/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ErrorDashboard } from '@/components/error/error-dashboard';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Database,
  Server,
  Activity,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Copy,
  Eye,
  Settings,
  Plus,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

// Mock data for demonstration
const mockStats = {
  totalProjects: 12,
  activeProjects: 10,
  totalMigrations: 47,
  successfulMigrations: 44,
  activeMigrations: 2,
  avgMigrationTime: '15 min',
};

const mockRecentActivity = [
  {
    id: '1',
    type: 'migration_completed',
    project: 'production-api',
    message: 'Migration completed successfully',
    timestamp: '2 minutes ago',
    status: 'success',
  },
  {
    id: '2',
    type: 'project_created',
    project: 'staging-frontend',
    message: 'New project created from template',
    timestamp: '1 hour ago',
    status: 'success',
  },
  {
    id: '3',
    type: 'migration_started',
    project: 'dev-backend',
    message: 'Full clone migration started',
    timestamp: '3 hours ago',
    status: 'in_progress',
  },
  {
    id: '4',
    type: 'migration_failed',
    project: 'test-database',
    message: 'Migration failed - connection timeout',
    timestamp: '1 day ago',
    status: 'error',
  },
];

export default function DashboardPage() {
  const { selectedOrganization } = useAuthStore();
  const { projects, isLoading } = useDashboardStore();
  const { activeMigrations } = useMigrationStore();
  const [stats, setStats] = useState(mockStats);
  const [showErrorDashboard, setShowErrorDashboard] = useState(false);

  useEffect(() => {
    // In a real app, fetch dashboard stats here
    // For now, using mock data
  }, [selectedOrganization]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'in_progress':
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  if (!selectedOrganization) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Database className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
            No Organization Selected
          </h3>
          <p className="text-slate-500 dark:text-slate-400">
            Please select an organization from the header to view your dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Welcome back!
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Here&apos;s what&apos;s happening with your Supabase projects in{' '}
            <span className="font-medium">{selectedOrganization.name}</span>.
          </p>
        </div>
        <Button variant="outline" onClick={() => setShowErrorDashboard(true)}>
          <Activity className="mr-2 h-4 w-4" />
          System Health
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Database className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProjects}</div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {stats.activeProjects} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Migrations</CardTitle>
            <Copy className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMigrations}</div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {stats.activeMigrations} running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((stats.successfulMigrations / stats.totalMigrations) * 100)}%
            </div>
            <p className="text-xs text-green-600">
              {stats.successfulMigrations} successful
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgMigrationTime}</div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              per migration
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Migrations */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Active Migrations</CardTitle>
                <CardDescription>
                  Currently running migration jobs
                </CardDescription>
              </div>
              <Button size="sm" asChild>
                <Link href="/dashboard/migrations">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {activeMigrations.length === 0 ? (
              <div className="text-center py-8">
                <Copy className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                  No Active Migrations
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-4">
                  Start a new migration to clone or sync your projects.
                </p>
                <Button asChild>
                  <Link href="/dashboard/migrations">
                    <Plus className="mr-2 h-4 w-4" />
                    Start Migration
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {activeMigrations.slice(0, 3).map((migration) => (
                  <div
                    key={migration.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium text-slate-900 dark:text-slate-100">
                          {migration.source_project_id} → {migration.target_project_id}
                        </h4>
                        <Badge variant="outline" className="capitalize">
                          {migration.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <Progress value={migration.progress.overall_percentage} className="mb-2" />
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {migration.progress.current_phase.replace('_', ' ')} • {migration.progress.overall_percentage}% complete
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/migrations/${migration.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest project and migration events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockRecentActivity.map((activity, index) => (
                <div key={activity.id}>
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {getStatusIcon(activity.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {activity.project}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {activity.message}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {activity.timestamp}
                      </p>
                    </div>
                  </div>
                  {index < mockRecentActivity.length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-24 flex flex-col space-y-2" asChild>
              <Link href="/dashboard/projects">
                <Database className="h-6 w-6" />
                <span>Browse Projects</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col space-y-2" asChild>
              <Link href="/dashboard/migrations">
                <Copy className="h-6 w-6" />
                <span>Start Migration</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col space-y-2" asChild>
              <Link href="/dashboard/explorer">
                <Eye className="h-6 w-6" />
                <span>Explore Schema</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Dashboard */}
      <ErrorDashboard 
        isOpen={showErrorDashboard} 
        onClose={() => setShowErrorDashboard(false)} 
      />
    </div>
  );
}
