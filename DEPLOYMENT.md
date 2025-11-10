# Deployment Guide

This guide provides recommendations for deploying the Harbour Lane Shipping Module to production.

## Server Recommendations

### Recommended Hosting Providers

#### 1. **Render** (Recommended for Simplicity)

- **Pros**:
  - Easy setup with automatic HTTPS
  - Free tier available
  - Automatic deployments from Git
  - Built-in environment variable management
  - MySQL add-on available
- **Pricing**: Free tier available, paid plans start at $7/month
- **Best for**: Small to medium businesses, quick deployment
- **Setup**: Connect GitHub repo, add environment variables, deploy

#### 2. **Railway**

- **Pros**:
  - Simple deployment process
  - Automatic HTTPS
  - MySQL database included
  - Good free tier
- **Pricing**: Free tier with $5 credit/month, paid plans available
- **Best for**: Developers who want simplicity with good performance

#### 3. **DigitalOcean App Platform**

- **Pros**:
  - Managed MySQL database
  - Automatic scaling
  - Good performance
  - Professional support
- **Pricing**: Starts at $5/month for basic app + $15/month for managed MySQL
- **Best for**: Production applications requiring reliability

#### 4. **AWS (EC2 + RDS)**

- **Pros**:
  - Highly scalable
  - Enterprise-grade reliability
  - Full control over infrastructure
- **Pricing**: Pay-as-you-go, can be cost-effective for small apps
- **Best for**: Large-scale applications, enterprise needs
- **Note**: Requires more setup and DevOps knowledge

#### 5. **Heroku**

- **Pros**:
  - Easy deployment
  - Add-ons marketplace
  - Good documentation
- **Pricing**: Free tier discontinued, paid plans start at $7/month
- **Best for**: Quick deployments with managed services

### Database Recommendations

#### Managed MySQL Services

1. **PlanetScale** (Recommended)

   - Serverless MySQL
   - Auto-scaling
   - Free tier available
   - Easy connection strings

2. **AWS RDS**

   - Fully managed
   - Automatic backups
   - High availability options

3. **DigitalOcean Managed Databases**

   - Simple setup
   - Automatic backups
   - Good performance

4. **Render MySQL**
   - Integrated with Render platform
   - Easy setup
   - Automatic backups

## Deployment Steps

### 1. Prepare Your Code

1. Ensure all environment variables are set
2. Test locally with `NODE_ENV=production`
3. Remove any development-only code
4. Commit your changes to Git

### 2. Set Up Database

1. Create a MySQL database (managed service recommended)
2. Run the schema:
   ```bash
   mysql -h your-host -u your-user -p your-database < src/db/schema.sql
   ```
3. Seed initial data:
   ```bash
   npm run seed
   ```

### 3. Deploy Application

#### Using Render

1. Sign up at [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: harbour-lane-shipping
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free or Starter
5. Add environment variables (see `.env.example`)
6. Deploy

#### Using Railway

1. Sign up at [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Add environment variables
5. Add MySQL service if needed
6. Deploy

#### Using DigitalOcean

1. Sign up at [digitalocean.com](https://digitalocean.com)
2. Go to App Platform
3. Create new app from GitHub
4. Configure build and run commands
5. Add managed MySQL database
6. Add environment variables
7. Deploy

### 4. Configure Environment Variables

Set these in your hosting platform's environment variable settings:

```env
# Database
DB_HOST=your-database-host
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_NAME=harbour_lane_shipping

# Shopify
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxx
APP_BASE_URL=https://your-app-domain.com

# Security (REQUIRED)
API_KEY=generate-a-secure-random-key-here
NODE_ENV=production

# Optional
PORT=5000
SHOPIFY_API_VERSION=2024-01
```

**Important**: Generate a secure API key:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32
```

### 5. Register Carrier Service

After deployment, register the carrier service with Shopify:

```bash
npm run register-carrier
```

Or SSH into your server and run:

```bash
cd /path/to/app
npm run register-carrier
```

### 6. Verify Deployment

1. Check health endpoint:

   ```bash
   curl https://your-domain.com/health
   ```

2. Test carrier rates endpoint:

   ```bash
   curl -X POST https://your-domain.com/carrier/rates \
     -H "Content-Type: application/json" \
     -d '{"rate":{"destination":{"postal_code":"2000","country":"AU"}}}'
   ```

3. Test in Shopify checkout:
   - Add product to cart
   - Go to checkout
   - Enter shipping address
   - Verify shipping rates appear

## Security Checklist

- [ ] `NODE_ENV` is set to `production`
- [ ] `API_KEY` is set and secure (32+ character random string)
- [ ] `APP_BASE_URL` uses HTTPS
- [ ] Database credentials are secure
- [ ] `SHOPIFY_ACCESS_TOKEN` is kept secret
- [ ] Admin endpoints require API key authentication
- [ ] Rate limiting is enabled
- [ ] CORS is configured for production
- [ ] Error messages don't leak sensitive information
- [ ] `.env` file is in `.gitignore`

## Monitoring

### Recommended Monitoring Tools

1. **Uptime Monitoring**

   - UptimeRobot (free tier available)
   - Pingdom
   - StatusCake

2. **Application Monitoring**

   - Sentry (error tracking)
   - LogRocket (session replay)
   - New Relic (APM)

3. **Log Management**
   - Papertrail
   - Logtail
   - CloudWatch (AWS)

### Health Check Setup

Set up monitoring to check:

```
GET https://your-domain.com/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": { "success": true },
  "zonesCache": { "loaded": true, "status": "loaded" },
  "environment": "production"
}
```

## Scaling Considerations

### For High Traffic

1. **Use Redis for Rate Limiting**

   - Replace in-memory rate limiter with Redis
   - Use `express-rate-limit` with Redis store

2. **Database Connection Pooling**

   - Already configured in `src/db/config.js`
   - Adjust `connectionLimit` based on traffic

3. **Caching**

   - Zones cache is already in-memory
   - Consider Redis for distributed caching

4. **Load Balancing**
   - Use multiple app instances
   - Ensure database can handle connections

## Backup Strategy

1. **Database Backups**

   - Enable automatic backups (most managed services do this)
   - Test restore procedures regularly

2. **Code Backups**

   - Use Git for version control
   - Tag production releases

3. **Environment Variables**
   - Document all environment variables
   - Store securely (password manager, secrets manager)

## Troubleshooting

### App Won't Start

1. Check environment variables are set correctly
2. Verify database connection
3. Check logs for errors
4. Ensure `NODE_ENV=production` is set

### Carrier Service Not Working

1. Verify `APP_BASE_URL` is correct and accessible
2. Check carrier service is registered: `npm run register-carrier`
3. Test endpoint directly with curl
4. Check Shopify app permissions

### Database Connection Issues

1. Verify database credentials
2. Check database is accessible from app server
3. Verify firewall rules allow connections
4. Test connection manually

## Support

For issues or questions:

1. Check application logs
2. Verify environment variables
3. Test endpoints individually
4. Review this deployment guide
