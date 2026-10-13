# Deployment Guide

This guide covers deploying the WhatsApp AI Automation Platform to production.

## Prerequisites

- Node.js 20.x or later
- PostgreSQL 15 or later
- Redis 7 or later
- Domain with SSL certificate
- Sufficient compute resources (see requirements below)

## Minimum System Requirements

### Development
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB
- **Database**: PostgreSQL (local or managed)
- **Cache**: Redis (local or managed)

### Production (Small Scale)
- **API Server**: 2 cores, 4GB RAM
- **Worker**: 2 cores, 4GB RAM  
- **Database**: 2 cores, 8GB RAM, 100GB SSD
- **Redis**: 1 core, 2GB RAM
- **Total**: ~6 cores, 18GB RAM minimum

### Production (Medium Scale)
- **API Server**: 2-4 instances, 4 cores, 8GB RAM each
- **Worker**: 3-5 instances, 4 cores, 8GB RAM each
- **Database**: 8 cores, 32GB RAM, 500GB SSD
- **Redis**: 4 cores, 8GB RAM
- **Load Balancer**: As required

## Deployment Options

### Option 1: Docker Compose (Small Deployments)

**Pros**: Simple, all-in-one, good for testing
**Cons**: Not highly available, single server

```bash
# 1. Clone repository
git clone https://github.com/lucky4-git1/whatsapp-ai-automation.git
cd whatsapp-ai-automation

# 2. Configure environment
cp .env.example .env
# Edit .env with production values

# 3. Build and start
docker-compose up -d

# 4. Run migrations
docker-compose exec api npm run db:migrate
```

### Option 2: Kubernetes (Recommended for Production)

**Pros**: Highly available, auto-scaling, cloud-native
**Cons**: More complex, requires k8s knowledge

See `infra/k8s/` for manifests (to be created).

### Option 3: Managed Platform (Easiest)

Deploy to:
- **Render**: Good for monolith apps
- **Railway**: Simple deployment
- **Fly.io**: Global edge deployment
- **AWS ECS/Fargate**: Fully managed containers
- **Google Cloud Run**: Serverless containers
- **Azure Container Apps**: Managed containers

## Step-by-Step Deployment

### 1. Prepare Infrastructure

#### PostgreSQL

**Option A: Managed Service** (Recommended)
- AWS RDS
- Google Cloud SQL
- Azure Database for PostgreSQL
- DigitalOcean Managed Database
- Supabase

**Option B: Self-Hosted**
```bash
# Install PostgreSQL 15
sudo apt update
sudo apt install postgresql-15

# Create database
sudo -u postgres psql
CREATE DATABASE whatsapp_automation;
CREATE USER app_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE whatsapp_automation TO app_user;
```

#### Redis

**Option A: Managed Service** (Recommended)
- AWS ElastiCache
- Google Cloud Memorystore
- Azure Cache for Redis
- DigitalOcean Managed Redis
- Upstash (serverless)

**Option B: Self-Hosted**
```bash
# Install Redis 7
sudo apt install redis-server

# Configure for production
sudo nano /etc/redis/redis.conf
# Set: maxmemory 2gb
# Set: maxmemory-policy allkeys-lru
# Set: requirepass your_redis_password

sudo systemctl restart redis
```

### 2. Configure Environment Variables

Create `.env` in production environment:

```bash
# Node Environment
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# Redis
REDIS_URL=redis://:password@host:6379

# API Configuration
API_PORT=4000
HOST=0.0.0.0

# Security
JWT_SECRET=<generate-secure-random-64-char-string>
SESSION_SECRET=<generate-secure-random-64-char-string>
ENCRYPTION_KEY=<generate-32-byte-hex-key>

# WhatsApp Cloud API
WHATSAPP_API_VERSION=v18.0
WHATSAPP_GRAPH_API_URL=https://graph.facebook.com
WHATSAPP_WEBHOOK_SECRET=<your-webhook-verify-token>

# CORS
CORS_ORIGIN=https://yourdomain.com

# Logging
LOG_LEVEL=info

# Worker
WORKER_CONCURRENCY=10

# Frontend
VITE_API_URL=https://api.yourdomain.com
VITE_APP_NAME=WhatsApp AI Automation
```

**Generate Secrets:**
```bash
# JWT Secret
openssl rand -base64 48

# Session Secret
openssl rand -base64 48

# Encryption Key (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Webhook Secret
openssl rand -base64 32
```

### 3. Build Application

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Build all packages
npm run build

# Run database migrations
npm run db:migrate
```

### 4. Deploy API Server

#### Using PM2 (Process Manager)

```bash
# Install PM2
npm install -g pm2

# Start API
pm2 start dist/apps/api/index.js --name whatsapp-api

# Start Worker
pm2 start dist/apps/worker/index.js --name whatsapp-worker

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup
```

#### Using systemd

Create `/etc/systemd/system/whatsapp-api.service`:

```ini
[Unit]
Description=WhatsApp Automation API
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=nodeapp
WorkingDirectory=/opt/whatsapp-automation
Environment=NODE_ENV=production
EnvironmentFile=/opt/whatsapp-automation/.env
ExecStart=/usr/bin/node dist/apps/api/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable whatsapp-api
sudo systemctl start whatsapp-api
sudo systemctl status whatsapp-api
```

### 5. Setup Reverse Proxy

#### Nginx Configuration

```nginx
# /etc/nginx/sites-available/whatsapp-automation

upstream api_backend {
    server localhost:4000;
    keepalive 64;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    location / {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Webhook endpoint - special handling
    location /api/v1/whatsapp/webhook {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Preserve raw body for signature validation
        proxy_request_buffering off;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/whatsapp-automation /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Setup SSL Certificate

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.yourdomain.com -d yourdomain.com

# Auto-renewal is configured automatically
sudo certbot renew --dry-run
```

### 7. Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 8. Database Backup

#### Automated Backups

```bash
#!/bin/bash
# /opt/scripts/backup-database.sh

BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="whatsapp_automation"

mkdir -p $BACKUP_DIR

# Backup
pg_dump $DATABASE_URL > $BACKUP_DIR/backup_$DATE.sql

# Compress
gzip $BACKUP_DIR/backup_$DATE.sql

# Delete backups older than 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

# Upload to S3 (optional)
# aws s3 cp $BACKUP_DIR/backup_$DATE.sql.gz s3://your-bucket/backups/
```

Add to crontab:
```bash
crontab -e
# Add: 0 2 * * * /opt/scripts/backup-database.sh
```

## Monitoring & Logging

### Application Logs

Logs are written to stdout in JSON format. Collect with:

**Option 1: PM2 Logs**
```bash
pm2 logs whatsapp-api
```

**Option 2: systemd journald**
```bash
journalctl -u whatsapp-api -f
```

**Option 3: Log Aggregation** (Recommended)
- **ELK Stack**: Elasticsearch, Logstash, Kibana
- **Loki**: Lightweight alternative
- **DataDog**: Managed service
- **New Relic**: Full observability

### Health Monitoring

Monitor these endpoints:
- `GET /health` - Basic health check
- `GET /health/ready` - Readiness (includes DB)
- `GET /api/v1/whatsapp/accounts/:id/health` - Provider health

Use uptime monitoring:
- **UptimeRobot**: Free basic monitoring
- **Pingdom**: Advanced monitoring
- **Better Uptime**: Status pages
- **CloudWatch**: AWS native

### Metrics

Implement Prometheus metrics:

```typescript
// Add to API server
import promClient from 'prom-client';

const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Expose metrics endpoint
server.get('/metrics', async (req, reply) => {
  reply.header('Content-Type', register.contentType);
  return register.metrics();
});
```

## Scaling Strategies

### Horizontal Scaling

**API Servers:**
```bash
# Start multiple instances
pm2 start dist/apps/api/index.js -i max --name whatsapp-api
```

**Workers:**
```bash
# Start multiple worker instances
pm2 start dist/apps/worker/index.js -i 4 --name whatsapp-worker
```

### Database Optimization

**Connection Pooling:**
```typescript
// In Prisma schema
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Add connection pooling
  // ?connection_limit=20&pool_timeout=10
}
```

**Read Replicas:**
- Route analytics queries to replicas
- Keep writes on primary
- Use Prisma read replicas feature

### Caching Strategy

**Redis Caching:**
```typescript
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

// Cache frequently accessed data
async function getWorkspace(id: string) {
  const cached = await redis.get(`workspace:${id}`);
  if (cached) return JSON.parse(cached);
  
  const workspace = await prisma.workspace.findUnique({ where: { id } });
  await redis.setex(`workspace:${id}`, 3600, JSON.stringify(workspace));
  return workspace;
}
```

## Security Checklist

- [ ] Use strong, unique secrets for JWT and sessions
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Configure CORS to allow only your domain
- [ ] Use firewall to block unnecessary ports
- [ ] Keep dependencies updated (`npm audit`)
- [ ] Enable database SSL connections
- [ ] Use environment variables for secrets (never commit)
- [ ] Implement rate limiting on APIs
- [ ] Enable database backups
- [ ] Set up log monitoring
- [ ] Use principle of least privilege for service accounts
- [ ] Regularly rotate access tokens and keys
- [ ] Enable 2FA for admin accounts
- [ ] Review and audit user permissions
- [ ] Implement IP whitelisting where appropriate

## Troubleshooting

### API Not Starting

```bash
# Check logs
pm2 logs whatsapp-api --lines 100

# Check port availability
sudo netstat -tlnp | grep :4000

# Check environment variables
pm2 env whatsapp-api

# Restart
pm2 restart whatsapp-api
```

### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL

# Check connection pool
# Add to DATABASE_URL: ?connection_limit=20

# Monitor connections
SELECT count(*) FROM pg_stat_activity;
```

### High Memory Usage

```bash
# Check Node.js memory
pm2 list
pm2 monit

# Increase memory limit if needed
NODE_OPTIONS=--max-old-space-size=4096 pm2 start ...
```

### Webhook Not Receiving Events

- Verify webhook URL is publicly accessible
- Check SSL certificate is valid
- Verify webhook secret matches Meta configuration
- Check firewall allows incoming HTTPS
- Review webhook logs for signature validation errors

## Rollback Procedure

```bash
# 1. Stop services
pm2 stop all

# 2. Restore database backup
gunzip < /opt/backups/backup_TIMESTAMP.sql.gz | psql $DATABASE_URL

# 3. Checkout previous version
git checkout <previous-commit>

# 4. Rebuild
npm run build

# 5. Start services
pm2 start all
```

## Support & Maintenance

### Regular Maintenance Tasks

**Daily:**
- Monitor error logs
- Check API response times
- Verify webhook processing

**Weekly:**
- Review failed jobs
- Check database size and growth
- Review security logs

**Monthly:**
- Update dependencies
- Review and optimize slow queries
- Backup verification
- Security audit
- Performance review

## Additional Resources

- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [PostgreSQL Administration](https://www.postgresql.org/docs/current/admin.html)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
