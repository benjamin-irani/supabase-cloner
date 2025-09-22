/**
 * Supabase Client and Management API Integration
 * Handles authentication, project management, and API interactions
 */

import { createClient } from '@supabase/supabase-js';
import { config } from './config';
import { SecurityManager, AuditLogger, RateLimiter, InputValidator } from './security-client';
import type { 
  SupabaseProject, 
  Organization, 
  DatabaseSchema,
  StorageBucket,
  EdgeFunction,
  APIResponse 
} from '@/types';

// Create Supabase client for application data
export const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

// Create admin client for management operations (only when needed)
let supabaseAdmin: ReturnType<typeof createClient> | null = null;

export const getSupabaseAdmin = () => {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return supabaseAdmin;
};

/**
 * Supabase Management API Client
 * Handles interactions with the Supabase Management API
 */
export class SupabaseManagementAPI {
  private accessToken: string;
  private baseUrl: string;
  private userId?: string;
  private organizationId?: string;

  constructor(accessToken: string, userId?: string, organizationId?: string) {
    this.accessToken = accessToken;
    this.baseUrl = config.supabase.managementApiUrl;
    this.userId = userId;
    this.organizationId = organizationId;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    try {
      // Rate limiting check
      const rateLimitKey = `api:${this.userId || 'anonymous'}`;
      const rateLimit = RateLimiter.checkRateLimit(rateLimitKey, 1000, 60000); // 1000 requests per minute
      
      if (!rateLimit.allowed) {
        AuditLogger.logSecurityEvent({
          type: 'access',
          action: 'api_rate_limit_exceeded',
          userId: this.userId,
          organizationId: this.organizationId,
          details: { endpoint, resetTime: rateLimit.resetTime },
        });
        
        return {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
            details: { resetTime: rateLimit.resetTime },
          },
        };
      }

      // Input validation for endpoint
      const sanitizedEndpoint = SecurityManager.sanitizeInput(endpoint);
      if (sanitizedEndpoint !== endpoint) {
        AuditLogger.logSecurityEvent({
          type: 'access',
          action: 'malicious_endpoint_detected',
          userId: this.userId,
          organizationId: this.organizationId,
          details: { originalEndpoint: endpoint, sanitizedEndpoint },
        });
        
        return {
          success: false,
          error: {
            code: 'INVALID_ENDPOINT',
            message: 'Invalid endpoint format',
          },
        };
      }

      // Add request timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'SupaClone/1.0',
          'X-Request-ID': SecurityManager.generateSecureToken(16),
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      // Log API access
      AuditLogger.logSecurityEvent({
        type: 'access',
        action: 'api_request',
        userId: this.userId,
        organizationId: this.organizationId,
        details: { 
          endpoint, 
          method: options.method || 'GET',
          status: response.status,
          success: response.ok,
        },
      });

      if (!response.ok) {
        // Log API errors
        AuditLogger.logSecurityEvent({
          type: 'error',
          action: 'api_error',
          userId: this.userId,
          organizationId: this.organizationId,
          details: { 
            endpoint, 
            status: response.status,
            error: data.message || 'API request failed',
          },
        });

        return {
          success: false,
          error: {
            code: response.status.toString(),
            message: data.message || 'API request failed',
            details: data,
          },
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        AuditLogger.logSecurityEvent({
          type: 'error',
          action: 'api_timeout',
          userId: this.userId,
          organizationId: this.organizationId,
          details: { endpoint },
        });

        return {
          success: false,
          error: {
            code: 'REQUEST_TIMEOUT',
            message: 'Request timed out',
          },
        };
      }

      AuditLogger.logSecurityEvent({
        type: 'error',
        action: 'api_network_error',
        userId: this.userId,
        organizationId: this.organizationId,
        details: { 
          endpoint, 
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network request failed',
        },
      };
    }
  }

  /**
   * Get all organizations for the authenticated user
   */
  async getOrganizations(): Promise<APIResponse<Organization[]>> {
    return this.makeRequest<Organization[]>('/organizations');
  }

  /**
   * Get all projects for a specific organization
   */
  async getProjects(organizationId: string): Promise<APIResponse<SupabaseProject[]>> {
    return this.makeRequest<SupabaseProject[]>(`/organizations/${organizationId}/projects`);
  }

  /**
   * Get detailed information about a specific project
   */
  async getProject(projectRef: string): Promise<APIResponse<SupabaseProject>> {
    return this.makeRequest<SupabaseProject>(`/projects/${projectRef}`);
  }

  /**
   * Create a new project
   */
  async createProject(
    organizationId: string,
    projectData: {
      name: string;
      region: string;
      plan: string;
      db_pass: string;
    }
  ): Promise<APIResponse<SupabaseProject>> {
    return this.makeRequest<SupabaseProject>(`/organizations/${organizationId}/projects`, {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  }

  /**
   * Delete a project
   */
  async deleteProject(projectRef: string): Promise<APIResponse<void>> {
    return this.makeRequest<void>(`/projects/${projectRef}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get project configuration
   */
  async getProjectConfig(projectRef: string): Promise<APIResponse<any>> {
    return this.makeRequest<any>(`/projects/${projectRef}/config`);
  }

  /**
   * Get project API keys
   */
  async getProjectApiKeys(projectRef: string): Promise<APIResponse<{
    anon: string;
    service_role: string;
  }>> {
    return this.makeRequest<{
      anon: string;
      service_role: string;
    }>(`/projects/${projectRef}/api-keys`);
  }

  /**
   * Get project database configuration
   */
  async getDatabaseConfig(projectRef: string): Promise<APIResponse<{
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    version: string;
  }>> {
    return this.makeRequest<{
      host: string;
      port: number;
      user: string;
      password: string;
      database: string;
      version: string;
    }>(`/projects/${projectRef}/database`);
  }

  /**
   * Get Edge Functions for a project
   */
  async getEdgeFunctions(projectRef: string): Promise<APIResponse<EdgeFunction[]>> {
    return this.makeRequest<EdgeFunction[]>(`/projects/${projectRef}/functions`);
  }

  /**
   * Get specific Edge Function
   */
  async getEdgeFunction(projectRef: string, functionSlug: string): Promise<APIResponse<EdgeFunction>> {
    return this.makeRequest<EdgeFunction>(`/projects/${projectRef}/functions/${functionSlug}`);
  }

  /**
   * Deploy Edge Function
   */
  async deployEdgeFunction(
    projectRef: string,
    functionSlug: string,
    functionData: {
      entrypoint_path: string;
      import_map_path?: string;
      verify_jwt?: boolean;
    },
    files: Array<{ name: string; content: string }>
  ): Promise<APIResponse<EdgeFunction>> {
    const formData = new FormData();
    
    // Add function configuration
    formData.append('slug', functionSlug);
    formData.append('entrypoint_path', functionData.entrypoint_path);
    if (functionData.import_map_path) {
      formData.append('import_map_path', functionData.import_map_path);
    }
    if (functionData.verify_jwt !== undefined) {
      formData.append('verify_jwt', functionData.verify_jwt.toString());
    }

    // Add files
    files.forEach((file, index) => {
      const blob = new Blob([file.content], { type: 'text/plain' });
      formData.append(`files[${index}]`, blob, file.name);
    });

    return this.makeRequest<EdgeFunction>(`/projects/${projectRef}/functions`, {
      method: 'POST',
      body: formData,
      headers: {
        // Remove Content-Type header to let browser set it with boundary
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });
  }

  /**
   * Get Storage Buckets
   */
  async getStorageBuckets(projectRef: string): Promise<APIResponse<StorageBucket[]>> {
    return this.makeRequest<StorageBucket[]>(`/projects/${projectRef}/storage/buckets`);
  }

  /**
   * Create Storage Bucket
   */
  async createStorageBucket(
    projectRef: string,
    bucketData: {
      name: string;
      public: boolean;
      file_size_limit?: number;
      allowed_mime_types?: string[];
    }
  ): Promise<APIResponse<StorageBucket>> {
    return this.makeRequest<StorageBucket>(`/projects/${projectRef}/storage/buckets`, {
      method: 'POST',
      body: JSON.stringify(bucketData),
    });
  }
}

/**
 * Database Schema Inspector
 * Connects directly to PostgreSQL to inspect schema
 */
export class DatabaseSchemaInspector {
  private connectionString: string;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
  }

  /**
   * Get complete database schema information
   */
  async getSchema(): Promise<DatabaseSchema> {
    // This would use pg client to connect and query the database
    // For now, returning a mock structure
    return {
      name: 'public',
      tables: [],
      views: [],
      functions: [],
      extensions: [],
    };
  }

  /**
   * Get table information with columns, constraints, etc.
   */
  async getTableInfo(schemaName: string, tableName: string) {
    // Implementation would query information_schema and pg_catalog
    // to get complete table information
  }

  /**
   * Get RLS policies for a table
   */
  async getRLSPolicies(schemaName: string, tableName: string) {
    // Implementation would query pg_policies system view
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // Implementation would test the database connection
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Utility functions for Supabase operations
 */
export const supabaseUtils = {
  /**
   * Validate project reference format
   */
  isValidProjectRef(ref: string): boolean {
    return /^[a-z]{20}$/.test(ref);
  },

  /**
   * Extract project ID from Supabase URL
   */
  extractProjectRefFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const subdomain = urlObj.hostname.split('.')[0];
      return this.isValidProjectRef(subdomain) ? subdomain : null;
    } catch {
      return null;
    }
  },

  /**
   * Generate connection string from project details
   */
  generateConnectionString(project: SupabaseProject, password: string): string {
    return `postgresql://postgres:${password}@${project.db_dns_name}:5432/postgres`;
  },

  /**
   * Format project size in human readable format
   */
  formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  },

  /**
   * Estimate migration duration based on data size
   */
  estimateMigrationDuration(totalSize: number, throughput: number = 100 * 1024 * 1024): number {
    // Base estimation in seconds, with overhead factor
    const baseTime = totalSize / throughput;
    const overhead = 1.5; // 50% overhead for schema, validation, etc.
    return Math.ceil(baseTime * overhead);
  },
};
