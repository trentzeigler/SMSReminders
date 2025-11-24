# Deployment Guide

This guide covers deploying the SMS Reminders application to various platforms.

## Prerequisites

Before deploying, ensure you have:

- ✅ MongoDB Atlas account (or other hosted MongoDB)
- ✅ OpenAI API key
- ✅ Twilio account with phone number
- ✅ All environment variables configured

## General Deployment Checklist

1. **Set Environment Variables**
   - `NODE_ENV=production`
   - `MONGODB_URI` (MongoDB Atlas connection string)
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL` (e.g., `gpt-4o-mini`)
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
   - `JWT_SECRET` (minimum 32 characters, use a strong random string)
   - `JWT_EXPIRES_IN` (e.g., `7d`)
   - `LOG_LEVEL` (e.g., `warn` or `error` for production)
   - `PORT` (usually provided by platform)

2. **Build the Application**
   ```bash
   npm run build
   ```

3. **Configure Twilio Webhook**
   - Set webhook URL to: `https://your-domain.com/api/webhook/sms`
   - Method: POST

## Platform-Specific Guides

### Railway

Railway offers the simplest deployment with automatic builds and free tier.

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Create Railway Project**
   - Go to [railway.app](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Add Environment Variables**
   - In Railway dashboard, go to Variables tab
   - Add all required environment variables
   - Railway will auto-detect Node.js and run `npm start`

4. **Generate Domain**
   - In Settings tab, click "Generate Domain"
   - Copy the domain (e.g., `your-app.up.railway.app`)

5. **Configure Twilio**
   - Set webhook to: `https://your-app.up.railway.app/api/webhook/sms`

### Render

Render provides free tier with automatic deploys from GitHub.

1. **Create `render.yaml`** (optional, for infrastructure as code)
   ```yaml
   services:
     - type: web
       name: sms-reminders
       env: node
       buildCommand: npm install && npm run build
       startCommand: npm start
       envVars:
         - key: NODE_ENV
           value: production
         - key: MONGODB_URI
           sync: false
         - key: OPENAI_API_KEY
           sync: false
         - key: OPENAI_MODEL
           value: gpt-4o-mini
         - key: TWILIO_ACCOUNT_SID
           sync: false
         - key: TWILIO_AUTH_TOKEN
           sync: false
         - key: TWILIO_PHONE_NUMBER
           sync: false
         - key: JWT_SECRET
           sync: false
         - key: JWT_EXPIRES_IN
           value: 7d
         - key: LOG_LEVEL
           value: warn
   ```

2. **Deploy to Render**
   - Go to [render.com](https://render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `npm start`
   - Add environment variables in dashboard

3. **Configure Twilio**
   - Use the Render URL (e.g., `https://your-app.onrender.com/api/webhook/sms`)

### Heroku

Heroku is a mature platform with good MongoDB integration.

1. **Install Heroku CLI**
   ```bash
   brew install heroku/brew/heroku  # macOS
   ```

2. **Login and Create App**
   ```bash
   heroku login
   heroku create your-app-name
   ```

3. **Add MongoDB**
   ```bash
   # Option 1: MongoDB Atlas (recommended)
   # Set MONGODB_URI manually in Heroku dashboard
   
   # Option 2: mLab MongoDB add-on
   heroku addons:create mongolab:sandbox
   ```

4. **Set Environment Variables**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set OPENAI_API_KEY=your_key
   heroku config:set OPENAI_MODEL=gpt-4o-mini
   heroku config:set TWILIO_ACCOUNT_SID=your_sid
   heroku config:set TWILIO_AUTH_TOKEN=your_token
   heroku config:set TWILIO_PHONE_NUMBER=+1234567890
   heroku config:set JWT_SECRET=your_secret_at_least_32_chars
   heroku config:set JWT_EXPIRES_IN=7d
   heroku config:set LOG_LEVEL=warn
   ```

5. **Deploy**
   ```bash
   git push heroku main
   ```

6. **Configure Twilio**
   - Webhook: `https://your-app-name.herokuapp.com/api/webhook/sms`

### DigitalOcean App Platform

DigitalOcean offers $200 credit for new users.

1. **Create App**
   - Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
   - Click "Create App"
   - Connect GitHub repository

2. **Configure Build**
   - **Build Command**: `npm install && npm run build`
   - **Run Command**: `npm start`
   - **HTTP Port**: 3000

3. **Add Environment Variables**
   - In App Settings → Environment Variables
   - Add all required variables

4. **Add MongoDB**
   - Option 1: Use MongoDB Atlas
   - Option 2: Add DigitalOcean Managed MongoDB

5. **Configure Twilio**
   - Use App Platform URL

### AWS (Elastic Beanstalk)

For more control and scalability.

1. **Install EB CLI**
   ```bash
   pip install awsebcli
   ```

2. **Initialize EB**
   ```bash
   eb init -p node.js sms-reminders
   ```

3. **Create Environment**
   ```bash
   eb create sms-reminders-env
   ```

4. **Set Environment Variables**
   ```bash
   eb setenv NODE_ENV=production \
     MONGODB_URI=your_uri \
     OPENAI_API_KEY=your_key \
     OPENAI_MODEL=gpt-4o-mini \
     TWILIO_ACCOUNT_SID=your_sid \
     TWILIO_AUTH_TOKEN=your_token \
     TWILIO_PHONE_NUMBER=+1234567890 \
     JWT_SECRET=your_secret \
     JWT_EXPIRES_IN=7d \
     LOG_LEVEL=warn
   ```

5. **Deploy**
   ```bash
   eb deploy
   ```

6. **Configure Twilio**
   - Get URL: `eb status`
   - Set webhook

## MongoDB Atlas Setup

1. **Create Cluster**
   - Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
   - Create free M0 cluster

2. **Create Database User**
   - Database Access → Add New Database User
   - Set username and password
   - Grant read/write permissions

3. **Whitelist IP**
   - Network Access → Add IP Address
   - For development: Add current IP
   - For production: Add `0.0.0.0/0` (allow from anywhere)
   - Or add specific IPs of your deployment platform

4. **Get Connection String**
   - Clusters → Connect → Connect your application
   - Copy connection string
   - Replace `<password>` with your database user password
   - Set as `MONGODB_URI` environment variable

## Post-Deployment Verification

1. **Health Check**
   ```bash
   curl https://your-domain.com/health
   ```

   Expected response:
   ```json
   {
     "status": "healthy",
     "database": true,
     "scheduler": {
       "isRunning": true,
       "interval": "* * * * *"
     },
     "timestamp": "2024-01-01T00:00:00.000Z"
   }
   ```

2. **Test Authentication**
   - Visit `https://your-domain.com/signup`
   - Create an account
   - Verify you can login

3. **Test Chat Interface**
   - Send a message: "Remind me to test this tomorrow at 3pm"
   - Verify assistant responds

4. **Test SMS**
   - Send SMS to your Twilio number
   - Verify you receive a response

5. **Test Reminder Delivery**
   - Create a reminder for 2 minutes in the future
   - Wait and verify SMS is received

## Monitoring and Logs

### View Logs

**Railway**:
```bash
railway logs
```

**Render**:
- Dashboard → Logs tab

**Heroku**:
```bash
heroku logs --tail
```

**DigitalOcean**:
- App → Runtime Logs

### Monitor Database

- MongoDB Atlas → Metrics
- Check connection count, operations, storage

### Monitor Costs

- OpenAI: [platform.openai.com/usage](https://platform.openai.com/usage)
- Twilio: [console.twilio.com/billing](https://console.twilio.com/billing)

## Scaling Considerations

### Horizontal Scaling

The application is stateless and can be scaled horizontally:

1. **Load Balancer**: Distribute traffic across multiple instances
2. **Session Storage**: JWT tokens are stateless, no session store needed
3. **Database**: MongoDB Atlas auto-scales

### Vertical Scaling

For higher load:

1. Increase instance size (more CPU/RAM)
2. Upgrade MongoDB cluster tier
3. Use faster OpenAI models (gpt-4o)

### Optimization

1. **Caching**: Add Redis for conversation caching
2. **Rate Limiting**: Implement rate limiting for API endpoints
3. **CDN**: Use CDN for static assets
4. **Database Indexes**: Already configured in MongoDBConnection

## Troubleshooting

### Application Won't Start

- Check logs for errors
- Verify all environment variables are set
- Ensure MongoDB connection string is correct
- Check port binding (use `process.env.PORT`)

### Twilio Webhook Fails

- Verify URL is publicly accessible
- Check webhook signature validation
- Review Twilio webhook logs
- Ensure HTTPS (required by Twilio)

### Reminders Not Sending

- Check scheduler logs
- Verify cron job is running (`/health` endpoint)
- Check Twilio balance
- Verify phone numbers are in E.164 format

### High OpenAI Costs

- Switch to cheaper model (gpt-3.5-turbo)
- Implement rate limiting
- Add conversation length limits
- Monitor usage in OpenAI dashboard

## Security Best Practices

1. **Environment Variables**: Never commit `.env` to git
2. **JWT Secret**: Use strong random string (32+ characters)
3. **HTTPS**: Always use HTTPS in production
4. **Rate Limiting**: Implement to prevent abuse
5. **Input Validation**: Already implemented with Zod
6. **MongoDB**: Use strong passwords, whitelist IPs
7. **Twilio**: Verify webhook signatures (enabled in production)

## Backup and Recovery

### Database Backups

**MongoDB Atlas**:
- Automatic backups enabled on M10+ clusters
- Manual backups: Clusters → Backup → Take Snapshot

### Application State

- Conversations and reminders are stored in MongoDB
- No local state to backup
- Ensure regular MongoDB backups

## Support

For deployment issues:
- Check platform-specific documentation
- Review application logs
- Open GitHub issue with deployment platform and error details
