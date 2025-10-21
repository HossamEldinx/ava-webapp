# Environment Variables Setup Guide

This guide explains how to properly configure environment variables for the AVA OpenSource Webapp project.

## Overview

The application uses environment variables to store sensitive information like API keys and database credentials. These should **never be hardcoded** in your code or committed to git.

## Backend Setup

### Step 1: Copy the Example Environment File

```bash
cd backend
cp ../.env.example .env
```

### Step 2: Fill in Your Configuration

Edit the `.env` file and replace the placeholder values with your actual credentials:

```bash
# Environment Configuration
ENVIRONMENT=development

# Database Configuration (Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key_here

# Google Gemini API
GOOGLE_API_KEY=your_google_api_key_here

# Frontend URL (for CORS in production)
FRONTEND_URL=http://localhost:3000

# Server Port
PORT=8000
```

### Step 3: Verify Configuration

When you start the backend, you should see:

```
✅ All required environment variables are configured
```

If you see an error about missing variables, double-check your `.env` file.

## Frontend Setup

### Step 1: Copy the Example Environment File

```bash
cd frontend
cp .env.example .env.local
```

### Step 2: Fill in Your Configuration

Edit the `.env.local` file:

```bash
# Backend API URL
REACT_APP_API_URL=http://127.0.0.1:8000/api
```

## Getting API Keys

### Google Generative AI API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Get API Key"
3. Create a new API key or use an existing one
4. Copy the key to your `.env` file

### Supabase Credentials

1. Go to [Supabase](https://supabase.com/)
2. Create a new project or use an existing one
3. Go to Project Settings → API
4. Copy the following:
    - **SUPABASE_URL**: Your project URL
    - **SUPABASE_KEY**: Your anon/public key

## Security Best Practices

### ✅ DO:

-   ✅ Store sensitive data in `.env` files
-   ✅ Use different credentials for development and production
-   ✅ Rotate API keys regularly
-   ✅ Use environment variables in CI/CD pipelines
-   ✅ Keep `.env` files out of version control (they're in `.gitignore`)

### ❌ DON'T:

-   ❌ Commit `.env` files to git
-   ❌ Hardcode API keys in your code
-   ❌ Share `.env` files via email or chat
-   ❌ Use the same credentials for dev and production
-   ❌ Commit credentials to git history

## Verifying Environment Variables Are Loaded

### Backend

The application will validate all required environment variables at startup. If any are missing, you'll see:

```
❌ Missing required environment variables:
  - GOOGLE_API_KEY: Google Generative AI API Key for embeddings and chat
  - SUPABASE_URL: Supabase project URL for database
  - SUPABASE_KEY: Supabase API key for database access

Please set these variables in your .env file or as system environment variables.
```

### Frontend

React app will use the environment variables you set in `.env.local`. You can verify by checking the browser console or the Network tab.

## Development vs Production

### Development Environment

-   Use local URLs: `http://localhost:8000/api`
-   Use development API keys (usually marked as "development" or "testing" in the service dashboard)
-   `.env` file is used locally

### Production Environment

-   Use production URLs and credentials
-   **Never** use development keys in production
-   Set environment variables through your hosting platform:

#### Heroku

```bash
heroku config:set ENVIRONMENT=production
heroku config:set GOOGLE_API_KEY="your_production_key"
heroku config:set SUPABASE_URL="your_production_url"
heroku config:set SUPABASE_KEY="your_production_key"
heroku config:set FRONTEND_URL="https://your-app.herokuapp.com"
```

#### Other Platforms

Refer to your hosting platform's documentation for setting environment variables.

## Troubleshooting

### "Module not found: python-dotenv"

```bash
pip install python-dotenv
```

### "GOOGLE_API_KEY environment variable must be set"

1. Verify `.env` file exists in the backend directory
2. Check that `GOOGLE_API_KEY=your_key` is in the file (not a comment)
3. Restart the backend application

### "SUPABASE_URL or SUPABASE_KEY not set"

1. Verify both variables are in your `.env` file
2. Check for typos in variable names
3. Make sure the file is saved (not just open in editor)

### Frontend can't reach backend API

1. Verify `REACT_APP_API_URL` is set in `frontend/.env.local`
2. Ensure the backend is running on the correct port
3. Check browser console for CORS errors
4. Verify `FRONTEND_URL` in backend `.env` matches your frontend URL

## Advanced: Using Environment Variables Programmatically

### Backend (Python)

```python
from backend.app.config import get_config, is_production

config = get_config()
api_key = config['GOOGLE_API_KEY']

if is_production():
    # Use production-specific logic
    pass
```

### Frontend (React)

```javascript
const apiUrl = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";
```

## Security Checklist

-   [ ] `.env` files are in `.gitignore`
-   [ ] `.env` files are not committed to git
-   [ ] You're using different credentials for dev and production
-   [ ] API keys are rotated regularly
-   [ ] No hardcoded credentials in code files
-   [ ] All required environment variables are documented
-   [ ] Team members have access to shared `.env.example` template

## Additional Resources

-   [python-dotenv Documentation](https://python-dotenv.readthedocs.io/)
-   [12Factor App - Configuration](https://12factor.net/config)
-   [OWASP - Secrets Management](https://owasp.org/www-community/api_1_0_broken_object_level_authorization)
