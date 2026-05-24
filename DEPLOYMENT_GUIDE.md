# SocietyFlats Deployment Guide

## Quick Deploy to Render.com (FREE)

### 1. Sign Up
- Go to https://render.com
- Sign up with GitHub (fastest)

### 2. Create PostgreSQL Database
- Click "New" → "PostgreSQL"
- Name: `societyflats-db`
- Plan: **Free**
- Save the connection details (you'll need them)

### 3. Deploy Backend (Laravel API)
- Click "New" → "Web Service"
- Connect your GitHub repo
- Name: `societyflats-api`
- Environment: **Docker**
- Docker Context: `./backend`
- Docker File Path: `./backend/Dockerfile.prod`
- Plan: **Free**
- Add Environment Variables (from your PostgreSQL database):
  ```
  DB_CONNECTION=pgsql
  DB_HOST=[from Render dashboard]
  DB_PORT=5432
  DB_DATABASE=societyflats
  DB_USERNAME=[from Render dashboard]
  DB_PASSWORD=[from Render dashboard]
  APP_KEY=[generate with: php artisan key:generate --show]
  APP_ENV=production
  APP_DEBUG=false
  APP_URL=https://societyflats-api.onrender.com
  FRONTEND_URL=https://societyflats.onrender.com
  ```

### 4. Deploy Frontend (React)
- Click "New" → "Static Site"
- Connect your GitHub repo
- Name: `societyflats`
- Build Command: `cd frontend && npm install && npm run build`
- Publish Directory: `frontend/dist`
- Plan: **Free**
- Add Environment Variable:
  ```
  VITE_API_URL=https://societyflats-api.onrender.com/api/v1
  ```

### 5. Configure Custom Domain (Optional)
- In Render dashboard, go to your static site
- Click "Settings" → "Custom Domain"
- Add your domain (e.g., `societyflats.in`)
- Follow DNS instructions
- Enable SSL (free via Let's Encrypt)

### 6. Upload Project to GitHub
```bash
# Initialize git in your project folder
git init
git add .
git commit -m "Initial SocietyFlats deployment"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/societyflats.git
git branch -M main
git push -u origin main
```

## Alternative: Deploy to Railway.app

Railway offers $5/month free credit (enough for small production):

1. Sign up at https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Add PostgreSQL plugin (free tier: 500MB)
4. Add Redis plugin (free tier: 50MB)
5. Deploy with `railway.json` config

## Alternative: Deploy to Fly.io

Fly.io offers $5/month free credit:

1. Install flyctl: `curl -L https://fly.io/install.sh | sh`
2. `fly auth login`
3. `fly launch` (from project root)
4. `fly deploy`

## Production Checklist

- [ ] Set strong APP_KEY
- [ ] Configure CORS for your frontend domain
- [ ] Enable SSL/HTTPS
- [ ] Set up Cloudflare CDN (free)
- [ ] Configure backup strategy (Render auto-backs up PostgreSQL)
- [ ] Set up monitoring (Sentry free tier)
- [ ] Configure email service (Mailgun free tier: 100 emails/day)
- [ ] Set up image storage (Cloudflare R2 free tier: 10GB)
- [ ] Enable rate limiting
- [ ] Set up log aggregation

## Environment Variables Reference

### Backend (.env)
```
APP_NAME=SocietyFlats
APP_ENV=production
APP_KEY=base64:...
APP_DEBUG=false
APP_URL=https://societyflats-api.onrender.com

DB_CONNECTION=pgsql
DB_HOST=...
DB_PORT=5432
DB_DATABASE=societyflats
DB_USERNAME=...
DB_PASSWORD=...

CACHE_DRIVER=file
SESSION_DRIVER=database
QUEUE_CONNECTION=database

MAIL_MAILER=smtp
MAIL_HOST=smtp.mailgun.org
MAIL_PORT=587
MAIL_USERNAME=...
MAIL_PASSWORD=...
```

### Frontend (.env.production)
```
VITE_API_URL=https://societyflats-api.onrender.com/api/v1
VITE_APP_NAME=SocietyFlats
```

## Troubleshooting

### Database Connection Issues
- Verify DB_HOST is correct (use internal hostname for same-region services)
- Check firewall rules allow connections
- Ensure SSL mode is configured properly

### CORS Errors
- Add your frontend domain to CORS allowed origins in Laravel config
- Check `FRONTEND_URL` env var matches actual domain

### Build Failures
- Ensure `composer.json` and `package.json` are committed
- Check Node.js version compatibility (use Node 20+)
- Verify PHP extensions are installed

## Cost Estimates

| Service | Free Tier | Paid (Small Production) |
|---------|---------|------------------------|
| Render Web Service | Free (sleeps after 15min) | $7/month (always on) |
| Render PostgreSQL | Free (500MB) | $15/month (1GB) |
| Render Static Site | Free (unlimited) | Free |
| Cloudflare CDN | Free | Free |
| Total | **$0/month** | **~$22/month** |

## Support

- Render Docs: https://render.com/docs
- Laravel Deployment: https://laravel.com/docs/deployment
- React Build: https://vitejs.dev/guide/build.html
