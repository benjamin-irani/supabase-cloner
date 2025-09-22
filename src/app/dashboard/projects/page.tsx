/**
 * Projects Page
 * Browse and manage Supabase projects with filtering and search
 */

'use client';

import { useEffect, useState } from 'react';
import { useAuthStore, useDashboardStore } from '@/store';
import { SupabaseManagementAPI } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Database,
  Search,
  Filter,
  Grid,
  List,
  MoreHorizontal,
  Copy,
  Eye,
  Settings,
  ExternalLink,
  Server,
  Calendar,
  MapPin,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { SupabaseProject } from '@/types';

// Mock project data for demonstration
const mockProjects: SupabaseProject[] = [
  {
    id: '1',
    ref: 'abcdefghijklmnopqrst',
    name: 'production-api',
    organization_id: 'org1',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-09-20T15:30:00Z',
    status: 'ACTIVE_HEALTHY',
    region: 'us-east-1',
    database: {
      version: '15.1',
      host: 'db.abcdefghijklmnopqrst.supabase.co',
      port: 5432,
    },
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
    organization_id: 'org1',
    created_at: '2024-02-10T14:20:00Z',
    updated_at: '2024-09-22T09:15:00Z',
    status: 'ACTIVE_HEALTHY',
    region: 'us-west-2',
    database: {
      version: '15.1',
      host: 'db.zyxwvutsrqponmlkjihg.supabase.co',
      port: 5432,
    },
    api_url: 'https://zyxwvutsrqponmlkjihg.supabase.co',
    db_dns_name: 'db.zyxwvutsrqponmlkjihg.supabase.co',
    jwt_secret: 'jwt-secret',
    service_role_key: 'service-role-key',
    anon_key: 'anon-key',
  },
  {
    id: '3',
    ref: 'fedcba9876543210abcd',
    name: 'dev-backend',
    organization_id: 'org1',
    created_at: '2024-03-05T11:45:00Z',
    updated_at: '2024-09-21T16:20:00Z',
    status: 'PAUSED',
    region: 'eu-west-1',
    database: {
      version: '15.1',
      host: 'db.fedcba9876543210abcd.supabase.co',
      port: 5432,
    },
    api_url: 'https://fedcba9876543210abcd.supabase.co',
    db_dns_name: 'db.fedcba9876543210abcd.supabase.co',
    jwt_secret: 'jwt-secret',
    service_role_key: 'service-role-key',
    anon_key: 'anon-key',
  },
];

export default function ProjectsPage() {
  const { data: session } = useSession();
  const { selectedOrganization } = useAuthStore();
  const { 
    projects, 
    filteredProjects, 
    viewMode, 
    search, 
    filters, 
    isLoading,
    setProjects,
    setViewMode,
    setSearch,
    setFilters,
    setLoading 
  } = useDashboardStore();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');

  useEffect(() => {
    if (selectedOrganization && session?.accessToken) {
      loadProjects();
    }
  }, [selectedOrganization, session?.accessToken]);

  const loadProjects = async () => {
    if (!selectedOrganization || !session?.accessToken) return;

    setLoading(true);
    try {
      const managementAPI = new SupabaseManagementAPI(session.accessToken as string);
      const response = await managementAPI.getProjects(selectedOrganization.id);
      
      if (response.success && response.data) {
        setProjects(response.data);
      } else {
        // Use mock data for demonstration
        setProjects(mockProjects);
        toast.warning('Using demo data - connect your Supabase account for real projects');
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
      setProjects(mockProjects);
      toast.error('Failed to load projects, showing demo data');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setFilters({ 
      status: value === 'all' ? [] : [value] 
    });
  };

  const handleRegionFilterChange = (value: string) => {
    setRegionFilter(value);
    setFilters({ 
      region: value === 'all' ? [] : [value] 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE_HEALTHY':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'PAUSING':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'INACTIVE':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
            Please select an organization from the header to view projects.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Projects
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage your Supabase projects in {selectedOrganization.name}
          </p>
        </div>
        <Button>
          <ExternalLink className="mr-2 h-4 w-4" />
          Create New Project
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center space-x-4 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ACTIVE_HEALTHY">Active</SelectItem>
              <SelectItem value="PAUSED">Paused</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={regionFilter} onValueChange={handleRegionFilterChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Regions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              <SelectItem value="us-east-1">US East</SelectItem>
              <SelectItem value="us-west-2">US West</SelectItem>
              <SelectItem value="eu-west-1">EU West</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Projects Grid/List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Database className="h-5 w-5 text-slate-600" />
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/explorer?project=${project.ref}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Explore
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="mr-2 h-4 w-4" />
                        Clone Project
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a
                          href={project.api_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open Dashboard
                        </a>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardDescription className="flex items-center space-x-2">
                  <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                    {project.ref}
                  </code>
                  <Badge variant="outline" className={getStatusColor(project.status)}>
                    {project.status.replace('_', ' ')}
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                    <MapPin className="h-4 w-4" />
                    <span>{project.region}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                    <Server className="h-4 w-4" />
                    <span>PostgreSQL {project.database.version}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                    <Calendar className="h-4 w-4" />
                    <span>Created {formatDate(project.created_at)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredProjects.map((project) => (
                <div key={project.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Database className="h-8 w-8 text-slate-600" />
                      <div>
                        <h3 className="font-medium text-slate-900 dark:text-slate-100">
                          {project.name}
                        </h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                            {project.ref}
                          </code>
                          <Badge variant="outline" className={getStatusColor(project.status)}>
                            {project.status.replace('_', ' ')}
                          </Badge>
                          <span className="text-sm text-slate-500">•</span>
                          <span className="text-sm text-slate-500">{project.region}</span>
                          <span className="text-sm text-slate-500">•</span>
                          <span className="text-sm text-slate-500">
                            PostgreSQL {project.database.version}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/explorer?project=${project.ref}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Explore
                        </Link>
                      </Button>
                      <Button size="sm">
                        <Copy className="mr-2 h-4 w-4" />
                        Clone
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <a
                              href={project.api_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Open Dashboard
                            </a>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && filteredProjects.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Database className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              No Projects Found
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              {search || filters.status.length > 0 || filters.region.length > 0
                ? 'No projects match your current filters.'
                : 'You don&apos;t have any projects in this organization yet.'}
            </p>
            {search || filters.status.length > 0 || filters.region.length > 0 ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                  setRegionFilter('all');
                  setFilters({ status: [], region: [], tier: [] });
                }}
              >
                Clear Filters
              </Button>
            ) : (
              <Button>
                <ExternalLink className="mr-2 h-4 w-4" />
                Create Your First Project
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
