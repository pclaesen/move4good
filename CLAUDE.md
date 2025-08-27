# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Move4Good** is a Next.js charity fundraising app that connects Strava activities to charitable donations. Users authenticate with Strava OAuth, select charities, and automatically collect/pledge donations based on their activities.

## Common Development Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Linting
npm run lint
```

## Architecture & Key Components

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Strava OAuth integration
- **Styling**: CSS modules + globals.css
- **Fonts**: Geist Sans/Mono from Google Fonts
- **Webhooks**: Strava Activity Webhooks

### Directory Structure
- `src/app/` - Next.js App Router pages and API routes
- `src/app/api/` - API endpoints for Strava and Supabase integration
- `src/app/components/` - Reusable React components
- `src/lib/` - Utility libraries (Supabase client configuration)

### Critical API Routes
- `api/auth/strava/token/route.js` - Handles Strava OAuth token exchange and user creation
- `api/strava/activities/route.js` - Fetches user activities from local database
- `api/strava/webhooks/callback/route.js` - Handles Strava webhook events and validation
- `api/strava/webhooks/subscribe/route.js` - Creates and manages webhook subscriptions
- `api/supabase/route.js` - General Supabase database operations

### Environment Variables Required
```
# Required for all environments
NEXT_PUBLIC_STRAVA_CLIENT_ID
STRAVA_CLIENT_SECRET
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SECRET_KEY
STRAVA_WEBHOOK_VERIFY_TOKEN      # Random token for webhook validation

# Optional - for custom URLs (auto-detected if not provided)
NEXT_PUBLIC_STRAVA_REDIRECT_URI  # Defaults to {current_origin}/auth/strava/callback
NEXT_PUBLIC_SITE_URL             # Defaults to localhost:3000 or Vercel URL
```

### URL Configuration
- **Local Development**: URLs are auto-detected from `window.location.origin`
- **Production**: Set `NEXT_PUBLIC_SITE_URL` to your domain (e.g., `https://yourdomain.com`)
- **Strava App Settings**: Add your production callback URL to Strava app configuration

### Strava Integration Flow
1. User authenticates via Strava OAuth
2. Authorization code exchanged for access token at `/api/auth/strava/token`
3. User data upserted to Supabase `users` table using athlete id as ID
4. Webhook subscription created to receive real-time activity events
5. Activities automatically stored in local database via webhook events
6. Dashboard reads activities from local database for fast performance

### Database Schema
- Users table with `id` (int8 - primary key)field (using Strava athlete id) and auth_user_id (uuid)
- Activities table with `id` (bigint, PK), `athlete_id` (FK), activity data, and indexing for fast user queries
- Charities table with `name` (primary key), `description`and `donation_address`
- Junction table `users_charities` to link charities and users
- Supabase client configured with service role key for server-side operations
- Auto-refresh token and session persistence enabled

### Component Architecture
- Modular component structure with co-located CSS files
- Components include: CharityForm, Connection, Features, Footer, Header, Hero, StravaConnectButton
- Page-level components in dedicated directories (charities, dashboard, auth callbacks)

### Authentication & Security
- Strava OAuth with proper token validation
- Service role key for Supabase operations
- Bearer token authentication for Strava API calls
- Error handling for expired/invalid tokens