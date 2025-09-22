# 🚀 SupaClone Deployment Guide

## Quick Start (Production Ready)

### Option 1: Interactive Setup
```bash
npm run setup:production
```
This will guide you through setting up real Supabase credentials.

### Option 2: Manual Configuration
Edit `.env.local` with your real Supabase credentials (see PRODUCTION_SETUP.md).

## Deployment Options

### 🔥 Vercel (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel --prod
   ```

3. **Set Environment Variables** in Vercel dashboard:
   - Copy all variables from your `.env.local`
   - Update `NEXTAUTH_URL` to your Vercel domain

### 🐳 Docker Deployment

1. **Build and Run**:
   ```bash
   docker build -t supaclone .
   docker run -p 3000:3000 --env-file .env.local supaclone
   ```

2. **Or use Docker Compose**:
   ```bash
   docker-compose up -d
   ```

### ☁️ Railway

1. **Connect your GitHub repo** to Railway
2. **Set environment variables** from your `.env.local`
3. **Deploy automatically** on push

### 🌐 Netlify

1. **Build command**: `npm run build:production`
2. **Publish directory**: `.next`
3. **Set environment variables** in Netlify dashboard

### 🔧 Manual VPS Deployment

1. **Install dependencies**:
   ```bash
   npm ci --production
   ```

2. **Build**:
   ```bash
   npm run build:production
   ```

3. **Start with PM2**:
   ```bash
   npm install -g pm2
   pm2 start npm --name "supaclone" -- start
   pm2 startup
   pm2 save
   ```

## Environment Variables for Production

```env
# Required - Get from Supabase Dashboard
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_OAUTH_CLIENT_ID=your_oauth_client_id
SUPABASE_OAUTH_CLIENT_SECRET=your_oauth_client_secret

# Required - Application
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=generate-32-char-secret
ENCRYPTION_KEY=generate-32-char-key
JWT_SECRET=generate-32-char-secret

# Optional - External Services
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Production
NODE_ENV=production
```

## SSL/HTTPS Configuration

### Automatic (Vercel, Netlify, Railway)
SSL is handled automatically.

### Manual (VPS with Nginx)

1. **Install Certbot**:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   ```

2. **Get SSL Certificate**:
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

3. **Nginx Configuration**:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       return 301 https://$server_name$request_uri;
   }

   server {
       listen 443 ssl;
       server_name your-domain.com;
       
       ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## Performance Optimizations

### 1. Enable Caching
```javascript
// In your hosting platform, set cache headers:
Cache-Control: public, max-age=31536000, immutable  // Static assets
Cache-Control: public, max-age=0, must-revalidate   // API routes
```

### 2. CDN Configuration
- Enable CDN for static assets
- Configure proper cache policies
- Use image optimization

### 3. Database Optimization
- Use connection pooling
- Enable query caching
- Monitor slow queries

## Monitoring & Logging

### Application Monitoring
```bash
# Install monitoring tools
npm install @sentry/nextjs
npm install @vercel/analytics
```

### Health Checks
The application includes health check endpoints:
- `GET /api/health` - Application health
- `GET /api/health/db` - Database connectivity
- `GET /api/health/auth` - Authentication system

### Log Management
- Use structured logging (JSON format)
- Centralize logs (LogDNA, DataDog, etc.)
- Set up alerts for errors

## Security Checklist

- ✅ HTTPS enabled
- ✅ Environment variables secured
- ✅ Rate limiting configured
- ✅ Security headers enabled
- ✅ CORS properly configured
- ✅ Input validation implemented
- ✅ SQL injection prevention
- ✅ XSS protection enabled

## Backup & Recovery

### Database Backups
```bash
# Automated daily backups
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### Environment Backup
- Store environment variables in secure vault
- Keep encrypted backups of configuration
- Document recovery procedures

## Scaling Considerations

### Horizontal Scaling
- Use load balancer (Nginx, CloudFlare)
- Multiple application instances
- Session storage in Redis

### Database Scaling
- Read replicas for queries
- Connection pooling
- Query optimization

### Caching Strategy
- Redis for session storage
- CDN for static assets
- API response caching

## Troubleshooting

### Common Issues

1. **OAuth Errors**
   - Verify callback URLs
   - Check client ID/secret
   - Ensure proper scopes

2. **Database Connection**
   - Verify connection string
   - Check firewall settings
   - Monitor connection pool

3. **Performance Issues**
   - Enable query logging
   - Monitor resource usage
   - Check cache hit rates

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm start
```

## Support & Updates

- Monitor GitHub releases
- Subscribe to security updates
- Regular dependency updates
- Performance monitoring

---

**🎉 Your SupaClone application is now production-ready!**

For support, check the logs, monitor the health endpoints, and ensure all security measures are in place.
