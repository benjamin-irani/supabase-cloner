# 🚀 SupaClone Production Setup Guide

## Prerequisites

1. **Supabase Account**: You need access to a Supabase organization
2. **OAuth Application**: Set up in your Supabase organization settings

## Step 1: Create Supabase OAuth Application

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to your **Organization Settings**
3. Go to **OAuth Apps** section
4. Click **"Create OAuth App"**
5. Fill in the details:
   ```
   Name: SupaClone
   Description: Enterprise Supabase Project Cloner
   Homepage URL: http://localhost:3000 (for development)
   Callback URL: http://localhost:3000/api/auth/callback/supabase-management
   ```
6. **Save** and copy the generated:
   - `Client ID`
   - `Client Secret`

## Step 2: Configure Environment Variables

Replace the demo values in `.env.local` with your real credentials:

```env
# Real Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_MANAGEMENT_API_URL=https://api.supabase.com/v1

# Real OAuth Configuration
SUPABASE_OAUTH_CLIENT_ID=your_real_client_id_here
SUPABASE_OAUTH_CLIENT_SECRET=your_real_client_secret_here

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-nextauth-secret-key-here-min-32-chars

# Security Configuration (Generate strong keys)
ENCRYPTION_KEY=your-32-character-encryption-key-here-prod
JWT_SECRET=your-jwt-secret-key-here-for-production

# Production Database (Optional)
DATABASE_URL=postgresql://your-db-url
REDIS_URL=redis://your-redis-url

# Production Mode
NODE_ENV=production
```

## Step 3: Generate Secure Keys

Use these commands to generate secure keys:

```bash
# Generate NEXTAUTH_SECRET (32+ characters)
openssl rand -base64 32

# Generate ENCRYPTION_KEY (exactly 32 characters)
openssl rand -hex 16

# Generate JWT_SECRET
openssl rand -base64 32
```

## Step 4: Production Deployment

### Vercel Deployment
```bash
npm install -g vercel
vercel --prod
```

### Docker Deployment
```bash
docker build -t supaclone .
docker run -p 3000:3000 --env-file .env.local supaclone
```

### Manual Deployment
```bash
npm run build
npm start
```

## Step 5: Update Callback URLs for Production

When deploying to production, update your OAuth app callback URL to:
```
https://your-domain.com/api/auth/callback/supabase-management
```

## Security Considerations

1. **HTTPS**: Always use HTTPS in production
2. **Environment Variables**: Never commit real credentials to version control
3. **Rate Limiting**: Configure appropriate rate limits for your usage
4. **CORS**: Configure CORS settings for your domain
5. **CSP**: Review and adjust Content Security Policy headers

## Features Available in Production

✅ **Real Supabase Project Access**
- Browse your actual organizations and projects
- View real database schemas and tables
- Access actual RLS policies and storage buckets

✅ **Live Migration Capabilities**
- Clone real Supabase projects
- Migrate schemas between projects
- Copy data with integrity checks

✅ **Enterprise Security**
- OAuth 2.0 authentication with Supabase
- Encrypted token storage
- Audit logging of all operations
- Rate limiting and security headers

✅ **Production Monitoring**
- Real-time error tracking
- Performance monitoring
- Security event logging
- Health checks and alerts

## Troubleshooting

### Common Issues:

1. **OAuth Errors**: Verify client ID/secret and callback URLs
2. **API Errors**: Check Supabase service role key permissions
3. **CORS Issues**: Ensure proper domain configuration
4. **Rate Limiting**: Adjust limits based on your usage patterns

### Support

For issues, check:
- Supabase logs in your dashboard
- Application logs (check console/server logs)
- Network tab for API call failures
- Environment variable configuration
