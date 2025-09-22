// Core Supabase Types
export interface SupabaseProject {
  id: string;
  ref: string;
  name: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  status: 'ACTIVE_HEALTHY' | 'PAUSING' | 'PAUSED' | 'RESTORING' | 'INACTIVE' | 'UNKNOWN';
  region: string;
  database: {
    version: string;
    host: string;
    port: number;
  };
  api_url: string;
  db_dns_name: string;
  jwt_secret: string;
  service_role_key: string;
  anon_key: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  billing_email: string;
  tier: 'free' | 'pro' | 'team' | 'enterprise';
  projects: SupabaseProject[];
}

// Database Schema Types
export interface DatabaseSchema {
  name: string;
  tables: DatabaseTable[];
  views: DatabaseView[];
  functions: DatabaseFunction[];
  extensions: DatabaseExtension[];
}

export interface DatabaseTable {
  name: string;
  schema: string;
  columns: DatabaseColumn[];
  constraints: DatabaseConstraint[];
  indexes: DatabaseIndex[];
  triggers: DatabaseTrigger[];
  row_count: number;
  size_bytes: number;
  rls_enabled: boolean;
  rls_policies: RLSPolicy[];
}

export interface DatabaseColumn {
  name: string;
  data_type: string;
  is_nullable: boolean;
  default_value: string | null;
  is_primary_key: boolean;
  is_foreign_key: boolean;
  foreign_key_reference?: {
    table: string;
    column: string;
    schema: string;
  };
}

export interface DatabaseConstraint {
  name: string;
  type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK' | 'NOT NULL';
  definition: string;
  columns: string[];
}

export interface DatabaseIndex {
  name: string;
  columns: string[];
  is_unique: boolean;
  is_primary: boolean;
  method: string;
  condition?: string;
}

export interface DatabaseTrigger {
  name: string;
  table: string;
  function_name: string;
  timing: 'BEFORE' | 'AFTER' | 'INSTEAD OF';
  events: ('INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE')[];
  condition?: string;
}

export interface DatabaseView {
  name: string;
  schema: string;
  definition: string;
  is_materialized: boolean;
}

export interface DatabaseFunction {
  name: string;
  schema: string;
  language: string;
  return_type: string;
  parameters: Array<{
    name: string;
    type: string;
    default_value?: string;
  }>;
  definition: string;
  is_security_definer: boolean;
}

export interface DatabaseExtension {
  name: string;
  version: string;
  schema: string;
  description: string;
}

// RLS Policy Types
export interface RLSPolicy {
  id: string;
  table_name: string;
  schema_name: string;
  policy_name: string;
  permissive: 'PERMISSIVE' | 'RESTRICTIVE';
  roles: string[];
  command: 'ALL' | 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  expression: string;
  check_expression?: string;
}

// Storage Types
export interface StorageBucket {
  id: string;
  name: string;
  owner: string;
  public: boolean;
  file_size_limit: number | null;
  allowed_mime_types: string[] | null;
  created_at: string;
  updated_at: string;
  object_count: number;
  total_size: number;
  rls_policies: RLSPolicy[];
}

export interface StorageObject {
  id: string;
  bucket_id: string;
  name: string;
  owner: string;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
  metadata: Record<string, any>;
  path_tokens: string[];
  version: string;
  size: number;
  mime_type: string;
  etag: string;
}

// Edge Functions Types
export interface EdgeFunction {
  id: string;
  slug: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'THROTTLED';
  version: number;
  created_at: string;
  updated_at: string;
  verify_jwt: boolean;
  import_map: boolean;
  entrypoint_path: string;
  source_code: string;
  environment_variables: Array<{
    name: string;
    value: string;
  }>;
  execution_stats: {
    total_requests: number;
    total_errors: number;
    avg_execution_time: number;
  };
}

// Migration Types
export interface MigrationJob {
  id: string;
  source_project_id: string;
  target_project_id: string;
  organization_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  type: 'full_clone' | 'schema_only' | 'data_subset' | 'incremental_sync';
  created_at: string;
  started_at?: string;
  completed_at?: string;
  progress: MigrationProgress;
  configuration: MigrationConfiguration;
  error_log: MigrationError[];
  estimated_duration: number;
  actual_duration?: number;
}

export interface MigrationProgress {
  overall_percentage: number;
  current_phase: MigrationPhase;
  phases: Array<{
    name: MigrationPhase;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    percentage: number;
    started_at?: string;
    completed_at?: string;
    details: string;
  }>;
  stats: {
    tables_migrated: number;
    total_tables: number;
    rows_migrated: number;
    total_rows: number;
    storage_objects_migrated: number;
    total_storage_objects: number;
    functions_migrated: number;
    total_functions: number;
  };
}

export type MigrationPhase = 
  | 'preparation'
  | 'schema_migration'
  | 'data_migration'
  | 'storage_migration'
  | 'configuration_migration'
  | 'edge_functions_migration'
  | 'security_migration'
  | 'realtime_setup'
  | 'validation'
  | 'cutover';

export interface MigrationConfiguration {
  clone_type: 'full_clone' | 'schema_only' | 'data_subset';
  target_region: string;
  target_compute_tier: string;
  parallel_threads: number;
  batch_size: number;
  enable_compression: boolean;
  data_filters?: Array<{
    table: string;
    where_clause: string;
  }>;
  exclude_tables?: string[];
  include_storage: boolean;
  include_edge_functions: boolean;
  include_auth_config: boolean;
  preserve_user_data: boolean;
}

export interface MigrationError {
  id: string;
  timestamp: string;
  phase: MigrationPhase;
  severity: 'low' | 'medium' | 'high' | 'critical';
  error_code: string;
  message: string;
  details: string;
  stack_trace?: string;
  resolution_suggestion?: string;
  auto_recoverable: boolean;
  recovery_attempted: boolean;
  recovery_successful?: boolean;
}

// Authentication Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  organizations: Organization[];
  permissions: UserPermission[];
  last_login: string;
  mfa_enabled: boolean;
}

export interface UserPermission {
  organization_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  permissions: string[];
}

// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// UI State Types
export interface DashboardState {
  selectedOrganization: string | null;
  selectedProject: string | null;
  viewMode: 'grid' | 'list';
  filters: {
    status: string[];
    region: string[];
    tier: string[];
  };
  search: string;
}

export interface ProjectExplorerState {
  selectedSchema: string;
  selectedTable: string | null;
  viewMode: 'table' | 'erd' | 'code';
  expandedItems: string[];
}

// Monitoring Types
export interface SystemMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_io: {
    bytes_in: number;
    bytes_out: number;
  };
  active_migrations: number;
  queue_size: number;
  error_rate: number;
  avg_response_time: number;
}

// Audit Types
export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  timestamp: string;
  ip_address: string;
  user_agent: string;
  details: Record<string, any>;
  success: boolean;
  error_message?: string;
}
