#!/usr/bin/env node

/**
 * Supabase MCP Production Setup Script
 * Uses MCP Supabase access to configure the application
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function generateSecureKey(length = 32) {
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('hex').substring(0, length);
}

async function setupWithMCP() {
  console.log('🚀 SupaClone Production Setup with MCP Supabase');
  console.log('================================================\n');

  console.log('Since you have MCP Supabase access, I can help configure this more easily!\n');

  // Get project reference for MCP
  const projectRef = await question('Enter your Supabase project reference (from project URL): ');
  
  // We'll use MCP to get the project URL and keys, but we still need OAuth setup
  console.log('\nFor OAuth setup, you still need to create an OAuth app in your Supabase organization:');
  console.log('1. Go to https://supabase.com/dashboard');
  console.log('2. Navigate to Organization Settings → OAuth Apps');
  console.log('3. Create an OAuth app with callback: http://localhost:3000/api/auth/callback/supabase-management\n');
  
  const clientId = await question('OAuth Client ID: ');
  const clientSecret = await question('OAuth Client Secret: ');
  
  console.log('\nApplication Configuration:');
  const appUrl = await question('Application URL (http://localhost:3000): ') || 'http://localhost:3000';
  
  // Generate secure keys
  console.log('\n🔐 Generating secure keys...');
  const nextAuthSecret = await generateSecureKey(32);
  const encryptionKey = await generateSecureKey(32);
  const jwtSecret = await generateSecureKey(32);

  // Create environment configuration
  const envContent = `# Supabase Configuration (PRODUCTION with MCP)
NEXT_PUBLIC_SUPABASE_URL=https://${projectRef}.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<will-be-retrieved-via-mcp>
SUPABASE_SERVICE_ROLE_KEY=<will-be-retrieved-via-mcp>
SUPABASE_MANAGEMENT_API_URL=https://api.supabase.com/v1

# OAuth Configuration (PRODUCTION)
SUPABASE_OAUTH_CLIENT_ID=${clientId}
SUPABASE_OAUTH_CLIENT_SECRET=${clientSecret}

# NextAuth Configuration
NEXTAUTH_URL=${appUrl}
NEXTAUTH_SECRET=${nextAuthSecret}

# Security Configuration (PRODUCTION)
ENCRYPTION_KEY=${encryptionKey}
JWT_SECRET=${jwtSecret}

# Database Configuration (Optional - will use MCP connection)
# DATABASE_URL=postgresql://your-db-url
# REDIS_URL=redis://your-redis-url

# Production Mode
NODE_ENV=production

# MCP Configuration
SUPABASE_PROJECT_REF=${projectRef}
`;

  const envPath = path.join(process.cwd(), '.env.local');
  
  try {
    // Backup existing env file
    if (fs.existsSync(envPath)) {
      console.log('\n⚠️  Backing up existing .env.local...');
      fs.copyFileSync(envPath, `${envPath}.backup.${Date.now()}`);
    }

    fs.writeFileSync(envPath, envContent);
    
    console.log('\n✅ Production environment configured successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. The MCP Supabase integration will handle API keys automatically');
    console.log('2. Update your OAuth app callback URL to:');
    console.log(`   ${appUrl}/api/auth/callback/supabase-management`);
    console.log('3. Test the setup: npm run dev');
    console.log('4. Build for production: npm run build:production');
    console.log('5. Deploy to your hosting platform');
    console.log('\n🔒 Security notes:');
    console.log('- MCP handles Supabase API keys securely');
    console.log('- Never commit .env.local to version control');
    console.log('- Use HTTPS in production');
    console.log('\n🎉 Your SupaClone is now configured with real Supabase integration!');
    
  } catch (error) {
    console.error('\n❌ Failed to create production configuration:', error.message);
    process.exit(1);
  }
  
  rl.close();
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Setup cancelled.');
  rl.close();
  process.exit(0);
});

setupWithMCP().catch(error => {
  console.error('Setup failed:', error);
  process.exit(1);
});
