#!/usr/bin/env node

/**
 * Production Environment Setup Script
 * Interactive setup for real Supabase integration
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

async function setupProduction() {
  console.log('🚀 SupaClone Production Setup');
  console.log('============================\n');

  console.log('Please provide your Supabase credentials:');
  console.log('(You can get these from your Supabase dashboard)\n');

  // Collect Supabase credentials
  const supabaseUrl = await question('Supabase Project URL (https://xxx.supabase.co): ');
  const anonKey = await question('Supabase Anon Key: ');
  const serviceRoleKey = await question('Supabase Service Role Key: ');
  
  console.log('\nOAuth Configuration:');
  console.log('(Create an OAuth app in your Supabase organization settings)');
  const clientId = await question('OAuth Client ID: ');
  const clientSecret = await question('OAuth Client Secret: ');
  
  console.log('\nApplication Configuration:');
  const appUrl = await question('Application URL (e.g., https://your-domain.com): ') || 'http://localhost:3000';
  
  // Generate secure keys
  console.log('\n🔐 Generating secure keys...');
  const nextAuthSecret = await generateSecureKey(32);
  const encryptionKey = await generateSecureKey(32);
  const jwtSecret = await generateSecureKey(32);
  
  // Optional database configuration
  console.log('\nOptional Database Configuration (press Enter to skip):');
  const databaseUrl = await question('PostgreSQL Database URL: ') || '';
  const redisUrl = await question('Redis URL: ') || '';

  const envContent = `# Supabase Configuration (PRODUCTION)
NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}
SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}
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

# Database Configuration (Optional)
${databaseUrl ? `DATABASE_URL=${databaseUrl}` : '# DATABASE_URL=postgresql://your-db-url'}
${redisUrl ? `REDIS_URL=${redisUrl}` : '# REDIS_URL=redis://your-redis-url'}

# Production Mode
NODE_ENV=production
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
    console.log('1. Update your OAuth app callback URL to:');
    console.log(`   ${appUrl}/api/auth/callback/supabase-management`);
    console.log('2. Build the application: npm run build');
    console.log('3. Start production server: npm start');
    console.log('4. Or deploy to your hosting platform');
    console.log('\n🔒 Security reminders:');
    console.log('- Never commit .env.local to version control');
    console.log('- Use HTTPS in production');
    console.log('- Regularly rotate your secrets');
    console.log('- Monitor your application logs');
    
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

setupProduction().catch(error => {
  console.error('Setup failed:', error);
  process.exit(1);
});
