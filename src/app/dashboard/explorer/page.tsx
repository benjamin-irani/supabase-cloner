/**
 * Project Explorer Page
 * Comprehensive database schema viewer and project structure analyzer
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore, useProjectExplorerStore } from '@/store';
import { SupabaseManagementAPI } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Database,
  Table,
  Columns,
  Key,
  Search,
  ChevronDown,
  ChevronRight,
  Eye,
  Code,
  BarChart3,
  Shield,
  Folder,
  File,
  FunctionSquare,
  Settings,
  ExternalLink,
  Copy,
  Download,
  Network,
} from 'lucide-react';
import { ERDDiagram } from '@/components/explorer/erd-diagram';
import { RLSPolicyViewer } from '@/components/explorer/rls-policy-viewer';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import type { SupabaseProject, DatabaseSchema, DatabaseTable } from '@/types';

// Mock schema data for demonstration
const mockSchema: DatabaseSchema = {
  name: 'public',
  tables: [
    {
      name: 'users',
      schema: 'public',
      columns: [
        {
          name: 'id',
          data_type: 'uuid',
          is_nullable: false,
          default_value: 'gen_random_uuid()',
          is_primary_key: true,
          is_foreign_key: false,
        },
        {
          name: 'email',
          data_type: 'text',
          is_nullable: false,
          default_value: null,
          is_primary_key: false,
          is_foreign_key: false,
        },
        {
          name: 'created_at',
          data_type: 'timestamp with time zone',
          is_nullable: false,
          default_value: 'now()',
          is_primary_key: false,
          is_foreign_key: false,
        },
        {
          name: 'profile_id',
          data_type: 'uuid',
          is_nullable: true,
          default_value: null,
          is_primary_key: false,
          is_foreign_key: true,
          foreign_key_reference: {
            table: 'profiles',
            column: 'id',
            schema: 'public',
          },
        },
      ],
      constraints: [
        {
          name: 'users_pkey',
          type: 'PRIMARY KEY',
          definition: 'PRIMARY KEY (id)',
          columns: ['id'],
        },
        {
          name: 'users_email_key',
          type: 'UNIQUE',
          definition: 'UNIQUE (email)',
          columns: ['email'],
        },
      ],
      indexes: [
        {
          name: 'users_pkey',
          columns: ['id'],
          is_unique: true,
          is_primary: true,
          method: 'btree',
        },
        {
          name: 'users_email_idx',
          columns: ['email'],
          is_unique: true,
          is_primary: false,
          method: 'btree',
        },
      ],
      triggers: [],
      row_count: 1250,
      size_bytes: 87654,
      rls_enabled: true,
      rls_policies: [
        {
          id: '1',
          table_name: 'users',
          schema_name: 'public',
          policy_name: 'Users can view own profile',
          permissive: 'PERMISSIVE',
          roles: ['authenticated'],
          command: 'SELECT',
          expression: 'auth.uid() = id',
        },
      ],
    },
    {
      name: 'profiles',
      schema: 'public',
      columns: [
        {
          name: 'id',
          data_type: 'uuid',
          is_nullable: false,
          default_value: 'gen_random_uuid()',
          is_primary_key: true,
          is_foreign_key: false,
        },
        {
          name: 'full_name',
          data_type: 'text',
          is_nullable: true,
          default_value: null,
          is_primary_key: false,
          is_foreign_key: false,
        },
        {
          name: 'avatar_url',
          data_type: 'text',
          is_nullable: true,
          default_value: null,
          is_primary_key: false,
          is_foreign_key: false,
        },
      ],
      constraints: [],
      indexes: [],
      triggers: [],
      row_count: 892,
      size_bytes: 45321,
      rls_enabled: true,
      rls_policies: [],
    },
    {
      name: 'posts',
      schema: 'public',
      columns: [
        {
          name: 'id',
          data_type: 'bigint',
          is_nullable: false,
          default_value: "nextval('posts_id_seq'::regclass)",
          is_primary_key: true,
          is_foreign_key: false,
        },
        {
          name: 'title',
          data_type: 'text',
          is_nullable: false,
          default_value: null,
          is_primary_key: false,
          is_foreign_key: false,
        },
        {
          name: 'content',
          data_type: 'text',
          is_nullable: true,
          default_value: null,
          is_primary_key: false,
          is_foreign_key: false,
        },
        {
          name: 'user_id',
          data_type: 'uuid',
          is_nullable: false,
          default_value: null,
          is_primary_key: false,
          is_foreign_key: true,
          foreign_key_reference: {
            table: 'users',
            column: 'id',
            schema: 'public',
          },
        },
      ],
      constraints: [],
      indexes: [],
      triggers: [],
      row_count: 3456,
      size_bytes: 234567,
      rls_enabled: true,
      rls_policies: [],
    },
  ],
  views: [
    {
      name: 'user_profiles',
      schema: 'public',
      definition: 'SELECT u.id, u.email, p.full_name, p.avatar_url FROM users u LEFT JOIN profiles p ON u.profile_id = p.id',
      is_materialized: false,
    },
  ],
  functions: [
    {
      name: 'get_user_posts',
      schema: 'public',
      language: 'plpgsql',
      return_type: 'TABLE(id bigint, title text, content text)',
      parameters: [
        {
          name: 'user_id',
          type: 'uuid',
        },
      ],
      definition: 'BEGIN RETURN QUERY SELECT p.id, p.title, p.content FROM posts p WHERE p.user_id = get_user_posts.user_id; END;',
      is_security_definer: false,
    },
  ],
  extensions: [
    {
      name: 'uuid-ossp',
      version: '1.1',
      schema: 'public',
      description: 'generate universally unique identifiers (UUIDs)',
    },
    {
      name: 'pgcrypto',
      version: '1.3',
      schema: 'public',
      description: 'cryptographic functions',
    },
  ],
};

function ExplorerContent() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { selectedOrganization } = useAuthStore();
  const {
    currentProject,
    selectedSchema,
    selectedTable,
    viewMode,
    setCurrentProject,
    setSelectedSchema,
    setSelectedTable,
    setViewMode,
  } = useProjectExplorerStore();

  const [projects, setProjects] = useState<SupabaseProject[]>([]);
  const [schema, setSchema] = useState<DatabaseSchema | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  // Get project from URL params
  const projectRef = searchParams.get('project');

  useEffect(() => {
    if (selectedOrganization && session?.accessToken) {
      loadProjects();
    }
  }, [selectedOrganization, session?.accessToken]);

  useEffect(() => {
    if (projectRef && projects.length > 0) {
      const project = projects.find(p => p.ref === projectRef);
      if (project && project !== currentProject) {
        setCurrentProject(project);
        loadSchema(project);
      }
    }
  }, [projectRef, projects, currentProject, setCurrentProject]);

  const loadProjects = async () => {
    if (!selectedOrganization || !session?.accessToken) return;

    try {
      // In a real implementation, this would fetch from the API
      // For now, using mock data
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
      ];
      setProjects(mockProjects);
    } catch (error) {
      toast.error('Failed to load projects');
    }
  };

  const loadSchema = async (project: SupabaseProject) => {
    setIsLoading(true);
    try {
      // In a real implementation, this would connect to the database and analyze the schema
      // For now, using mock data
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate loading
      setSchema(mockSchema);
      toast.success('Schema loaded successfully');
    } catch (error) {
      toast.error('Failed to load schema');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTableExpansion = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  };

  const filteredTables = schema?.tables.filter(table =>
    table.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const formatBytes = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
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
            Please select an organization to explore projects.
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
            Project Explorer
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Analyze database schemas, tables, and project structure
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {currentProject && (
            <>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export Schema
              </Button>
              <Button variant="outline" size="sm">
                <Copy className="mr-2 h-4 w-4" />
                Clone Project
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Project Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Select Project</span>
          </CardTitle>
          <CardDescription>
            Choose a project to explore its database schema and structure
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length > 0 ? (
            <Select value={currentProject?.ref || ''} onValueChange={(value) => {
              const project = projects.find(p => p.ref === value);
              if (project) {
                setCurrentProject(project);
                loadSchema(project);
              }
            }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a project to explore">
                  {currentProject ? (
                    <div className="flex items-center space-x-2">
                      <Database className="h-4 w-4" />
                      <span>{currentProject.name}</span>
                      <Badge variant="outline">{currentProject.status}</Badge>
                    </div>
                  ) : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.ref} value={project.ref}>
                    <div className="flex items-center space-x-2">
                      <Database className="h-4 w-4" />
                      <span>{project.name}</span>
                      <Badge variant="outline" className="ml-2">
                        {project.region}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-center py-8">
              <Database className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400">
                No projects available in this organization
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schema Explorer */}
      {currentProject && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Schema Tree */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Folder className="h-5 w-5" />
                  <span>Schema</span>
                </div>
                <Badge variant="outline">
                  {schema?.tables.length || 0} tables
                </Badge>
              </CardTitle>
              <CardDescription>
                Database structure and objects
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : schema ? (
                <div className="space-y-2">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search tables..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Tables */}
                  <div className="space-y-1">
                    {filteredTables.map((table) => (
                      <Collapsible
                        key={table.name}
                        open={expandedTables.has(table.name)}
                        onOpenChange={() => toggleTableExpansion(table.name)}
                      >
                        <CollapsibleTrigger
                          className={`w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                            selectedTable === table.name
                              ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100'
                              : ''
                          }`}
                          onClick={() => setSelectedTable(table.name)}
                        >
                          <div className="flex items-center space-x-2">
                            <Table className="h-4 w-4" />
                            <span className="font-medium">{table.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {table.row_count.toLocaleString()}
                            </Badge>
                          </div>
                          {expandedTables.has(table.name) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pl-6 pt-2">
                          <div className="space-y-1">
                            {table.columns.slice(0, 5).map((column) => (
                              <div
                                key={column.name}
                                className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400"
                              >
                                <Columns className="h-3 w-3" />
                                <span>{column.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {column.data_type}
                                </Badge>
                                {column.is_primary_key && (
                                  <Key className="h-3 w-3 text-yellow-500" />
                                )}
                              </div>
                            ))}
                            {table.columns.length > 5 && (
                              <div className="text-xs text-slate-500 pl-5">
                                +{table.columns.length - 5} more columns
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>

                  <Separator className="my-4" />

                  {/* Other Objects */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 p-2">
                      <Eye className="h-4 w-4" />
                      <span className="font-medium">Views</span>
                      <Badge variant="secondary">{schema.views.length}</Badge>
                    </div>
                    <div className="flex items-center space-x-2 p-2">
                      <FunctionSquare className="h-4 w-4" />
                      <span className="font-medium">Functions</span>
                      <Badge variant="secondary">{schema.functions.length}</Badge>
                    </div>
                    <div className="flex items-center space-x-2 p-2">
                      <Settings className="h-4 w-4" />
                      <span className="font-medium">Extensions</span>
                      <Badge variant="secondary">{schema.extensions.length}</Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Database className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400">
                    Select a project to load its schema
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Details Panel */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  {selectedTable ? (
                    <>
                      <Table className="h-5 w-5" />
                      <span>{selectedTable}</span>
                    </>
                  ) : (
                    <>
                      <Database className="h-5 w-5" />
                      <span>Project Overview</span>
                    </>
                  )}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Code className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {selectedTable && schema ? (
                <TableDetails table={schema.tables.find(t => t.name === selectedTable)!} />
              ) : schema ? (
                <ProjectOverview schema={schema} project={currentProject} />
              ) : (
                <div className="text-center py-12">
                  <Database className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                    No Schema Loaded
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400">
                    Select a project to explore its database schema
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function ProjectOverview({ schema, project }: { schema: DatabaseSchema; project: SupabaseProject }) {
  const totalRows = schema.tables.reduce((sum, table) => sum + table.row_count, 0);
  const totalSize = schema.tables.reduce((sum, table) => sum + table.size_bytes, 0);
  const tablesWithRLS = schema.tables.filter(table => table.rls_enabled).length;

  const formatBytes = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="erd">
          <Network className="mr-2 h-4 w-4" />
          Schema ERD
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        {/* Project Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{schema.tables.length}</div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Tables</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totalRows.toLocaleString()}</div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Total Rows</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{formatBytes(totalSize)}</div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Database Size</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{tablesWithRLS}</div>
            <p className="text-sm text-slate-600 dark:text-slate-400">RLS Enabled</p>
          </CardContent>
        </Card>
      </div>

      {/* Tables Overview */}
      <div>
        <h3 className="text-lg font-medium mb-4">Tables Overview</h3>
        <div className="space-y-2">
          {schema.tables.map((table) => (
            <div
              key={table.name}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <div className="flex items-center space-x-3">
                <Table className="h-5 w-5 text-slate-600" />
                <div>
                  <div className="font-medium">{table.name}</div>
                  <div className="text-sm text-slate-500">
                    {table.columns.length} columns • {table.row_count.toLocaleString()} rows
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {table.rls_enabled && (
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    <Shield className="mr-1 h-3 w-3" />
                    RLS
                  </Badge>
                )}
                <span className="text-sm text-slate-500">{formatBytes(table.size_bytes)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Extensions */}
      {schema.extensions.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-4">Extensions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {schema.extensions.map((extension) => (
              <div key={extension.name} className="p-3 border rounded-lg">
                <div className="font-medium">{extension.name}</div>
                <div className="text-sm text-slate-500">v{extension.version}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {extension.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
        </TabsContent>

        <TabsContent value="erd" className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Entity Relationship Diagram</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Interactive visualization of database relationships
                </p>
              </div>
            </div>
            <ERDDiagram tables={schema.tables} />
          </div>
        </TabsContent>
    </Tabs>
  );
}

function TableDetails({ table }: { table: DatabaseTable }) {
  return (
    <Tabs defaultValue="columns" className="space-y-4">
      <TabsList>
        <TabsTrigger value="columns">Columns</TabsTrigger>
        <TabsTrigger value="constraints">Constraints</TabsTrigger>
        <TabsTrigger value="indexes">Indexes</TabsTrigger>
        <TabsTrigger value="policies">RLS Policies</TabsTrigger>
        <TabsTrigger value="erd">ERD View</TabsTrigger>
      </TabsList>

      <TabsContent value="columns" className="space-y-4">
        <div className="space-y-2">
          {table.columns.map((column) => (
            <div
              key={column.name}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <Columns className="h-4 w-4 text-slate-600" />
                <div>
                  <div className="font-medium flex items-center space-x-2">
                    <span>{column.name}</span>
                    {column.is_primary_key && (
                      <Key className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                  <div className="text-sm text-slate-500">
                    {column.data_type} • {column.is_nullable ? 'Nullable' : 'Not Null'}
                    {column.default_value && ` • Default: ${column.default_value}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {column.is_foreign_key && column.foreign_key_reference && (
                  <Badge variant="outline" className="text-blue-600 border-blue-200">
                    FK → {column.foreign_key_reference.table}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="constraints" className="space-y-4">
        <div className="space-y-2">
          {table.constraints.map((constraint) => (
            <div
              key={constraint.name}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div>
                <div className="font-medium">{constraint.name}</div>
                <div className="text-sm text-slate-500">{constraint.definition}</div>
              </div>
              <Badge variant="outline">{constraint.type}</Badge>
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="indexes" className="space-y-4">
        <div className="space-y-2">
          {table.indexes.map((index) => (
            <div
              key={index.name}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div>
                <div className="font-medium">{index.name}</div>
                <div className="text-sm text-slate-500">
                  Columns: {index.columns.join(', ')} • Method: {index.method}
                </div>
              </div>
              <div className="flex space-x-2">
                {index.is_unique && (
                  <Badge variant="outline">Unique</Badge>
                )}
                {index.is_primary && (
                  <Badge variant="outline" className="text-yellow-600 border-yellow-200">
                    Primary
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="policies" className="space-y-4">
        <RLSPolicyViewer table={table} />
      </TabsContent>

      <TabsContent value="erd" className="space-y-4">
        <ERDDiagram tables={[table]} selectedTable={table.name} />
      </TabsContent>
    </Tabs>
  );
}

export default function ProjectExplorerPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full lg:col-span-2" />
        </div>
      </div>
    }>
      <ExplorerContent />
    </Suspense>
  );
}
