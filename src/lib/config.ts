/**
 * Application Configuration
 * Centralized configuration management for the Supabase Project Cloner
 */

export const config = {
  // Supabase Configuration
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://demo.supabase.co',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'demo-anon-key',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'demo-service-role-key',
    managementApiUrl: process.env.SUPABASE_MANAGEMENT_API_URL || 'https://api.supabase.com/v1',
  },

  // Authentication Configuration
  auth: {
    nextAuthUrl: process.env.NEXTAUTH_URL || 'https://supabase-cloner-m1tn6f79v-eywa-systems.vercel.app',
    nextAuthSecret: process.env.NEXTAUTH_SECRET || 'demo-nextauth-secret-for-development',
    supabaseOAuthClientId: process.env.SUPABASE_OAUTH_CLIENT_ID || 'f3a31eb1-cece-4480-81d6-71e78af49488',
    supabaseOAuthClientSecret: process.env.SUPABASE_OAUTH_CLIENT_SECRET || 'sba_585ffafba5b606a3dbe8094c30814b9dd4653a82',
  },

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL || 'postgresql://demo:demo@localhost:5432/demo',
  },

  // Redis Configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // Security Configuration
  security: {
    encryptionKey: process.env.ENCRYPTION_KEY || 'demo-32-character-encryption-key',
    jwtSecret: process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'demo-jwt-secret',
  },

  // Migration Configuration
  migration: {
    defaultBatchSize: 1000,
    defaultParallelThreads: 4,
    maxParallelThreads: 10,
    chunkSize: 1024 * 1024, // 1MB
    maxRetries: 3,
    retryDelay: 1000, // 1 second
    timeoutMs: 30 * 60 * 1000, // 30 minutes
    checkpointInterval: 10000, // Every 10k rows
  },

  // Monitoring Configuration
  monitoring: {
    logLevel: process.env.LOG_LEVEL || 'info',
    enableMetrics: process.env.ENABLE_METRICS === 'true',
    metricsInterval: 30000, // 30 seconds
  },

  // Performance Configuration
  performance: {
    maxConcurrentMigrations: 5,
    maxDatabaseSize: 10 * 1024 * 1024 * 1024 * 1024, // 10TB
    maxStorageObjects: 1000000, // 1 million objects
    connectionPoolSize: 20,
  },

  // UI Configuration
  ui: {
    defaultPageSize: 25,
    maxPageSize: 100,
    refreshInterval: 5000, // 5 seconds
    progressUpdateInterval: 1000, // 1 second
  },

  // Feature Flags
  features: {
    enableIncrementalSync: true,
    enableParallelMigration: true,
    enableCompressionMigration: true,
    enableRealTimeUpdates: true,
    enableAdvancedErrorRecovery: true,
    enableAuditLogging: true,
    enableDebugMode: process.env.NODE_ENV === 'development',
  },

  // API Configuration
  api: {
    timeout: 30000, // 30 seconds
    retries: 3,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
    },
  },
} as const;

// Environment validation
export function validateConfig() {
  const issues: string[] = [];
  
  // Required environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXTAUTH_SECRET',
    'ENCRYPTION_KEY',
  ];

  const missing = requiredEnvVars.filter(
    (envVar) => !process.env[envVar] || process.env[envVar]?.includes('demo')
  );

  if (missing.length > 0) {
    issues.push(`Missing or using demo values for environment variables: ${missing.join(', ')}`);
  }

  // Validate encryption key
  if (config.security.encryptionKey.length !== 32) {
    issues.push('ENCRYPTION_KEY must be exactly 32 characters long');
  }

  if (config.security.encryptionKey.includes('demo') && process.env.NODE_ENV === 'production') {
    issues.push('Using demo encryption key in production environment');
  }

  // Validate NextAuth secret strength
  if (config.auth.nextAuthSecret.length < 32) {
    issues.push('NEXTAUTH_SECRET should be at least 32 characters long');
  }

  // Validate URLs
  try {
    const supabaseUrl = new URL(config.supabase.url);
    if (supabaseUrl.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
      issues.push('Supabase URL must use HTTPS in production');
    }
  } catch {
    issues.push('Invalid NEXT_PUBLIC_SUPABASE_URL format');
  }

  try {
    new URL(config.supabase.managementApiUrl);
  } catch {
    issues.push('Invalid SUPABASE_MANAGEMENT_API_URL format');
  }

  try {
    const authUrl = new URL(config.auth.nextAuthUrl);
    if (authUrl.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
      issues.push('NEXTAUTH_URL must use HTTPS in production');
    }
  } catch {
    issues.push('Invalid NEXTAUTH_URL format');
  }

  // Validate database URL if provided
  if (process.env.DATABASE_URL) {
    try {
      new URL(config.database.url);
    } catch {
      issues.push('Invalid DATABASE_URL format');
    }
  }

  // Validate Redis URL if provided
  if (process.env.REDIS_URL) {
    try {
      new URL(config.redis.url);
    } catch {
      issues.push('Invalid REDIS_URL format');
    }
  }

  // Performance validation
  if (config.migration.maxParallelThreads > 20) {
    issues.push('maxParallelThreads should not exceed 20 for stability');
  }

  if (config.migration.defaultBatchSize > 10000) {
    issues.push('defaultBatchSize should not exceed 10000 for memory efficiency');
  }

  // Security validation for production
  if (process.env.NODE_ENV === 'production') {
    if (config.features.enableDebugMode) {
      issues.push('Debug mode should be disabled in production');
    }
    
    if (config.security.jwtSecret.includes('demo')) {
      issues.push('Using demo JWT secret in production');
    }
  }

  if (issues.length > 0) {
    throw new Error(
      `Configuration validation failed:\n${issues.map(issue => `- ${issue}`).join('\n')}`
    );
  }
}

// Runtime configuration check (server-side only)
export function checkRuntimeConfig() {
  // Only run on server-side
  if (typeof window === 'undefined') {
    try {
      validateConfig();
      console.log('✅ Configuration validation passed');
    } catch (error) {
      console.error('❌ Configuration validation failed:', error instanceof Error ? error.message : error);
      // In production, log error but don't exit (Edge Runtime compatible)
      if (process.env.NODE_ENV === 'production') {
        console.error('⚠️  Production build with configuration errors');
      }
    }
  }
}

// Development/Production specific configurations
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';

export const devConfig = {
  enableDebugLogs: isDevelopment,
  mockApiCalls: false,
  skipValidation: false,
};

export const prodConfig = {
  enableDebugLogs: false,
  strictValidation: true,
  enableTelemetry: true,
};
