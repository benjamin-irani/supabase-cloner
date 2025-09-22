#!/usr/bin/env node

/**
 * Development Environment Setup Script
 * Creates a .env.local file with demo values for local development
 */

const fs = require('fs');
const path = require('path');

const envContent = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://demo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=demo_anon_key
SUPABASE_SERVICE_ROLE_KEY=demo_service_role_key
SUPABASE_MANAGEMENT_API_URL=https://api.supabase.com/v1

# OAuth Configuration (Demo - Replace with real values for production)
SUPABASE_OAUTH_CLIENT_ID=demo_client_id
SUPABASE_OAUTH_CLIENT_SECRET=demo_client_secret

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-nextauth-secret-key-here-min-32-chars

# Security Configuration
ENCRYPTION_KEY=your-32-character-encryption-key-here-demo
JWT_SECRET=your-jwt-secret-key-here-for-development

# Database Configuration (Optional - for local development)
DATABASE_URL=postgresql://localhost:5432/supaclone_dev
REDIS_URL=redis://localhost:6379

# Development Mode
NODE_ENV=development
`;

const envPath = path.join(process.cwd(), '.env.local');

console.log('🚀 Setting up development environment...');

try {
  if (fs.existsSync(envPath)) {
    console.log('⚠️  .env.local already exists. Backing it up...');
    fs.copyFileSync(envPath, `${envPath}.backup.${Date.now()}`);
  }

  fs.writeFileSync(envPath, envContent);
  
  console.log('✅ Created .env.local with development configuration');
  console.log('');
  console.log('🔑 Development Authentication:');
  console.log('   Email: demo@example.com');
  console.log('   Password: demo');
  console.log('');
  console.log('📝 Next steps:');
  console.log('   1. Run: npm run dev');
  console.log('   2. Open: http://localhost:3000');
  console.log('   3. Sign in with the demo credentials above');
  console.log('');
  console.log('⚠️  For production, replace demo values with real Supabase credentials');
  
} catch (error) {
  console.error('❌ Failed to create .env.local:', error.message);
  process.exit(1);
}
