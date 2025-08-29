# Strava Webhook Testing Guide

This guide explains how to test Strava webhooks for the Move4Good application locally and in production.

## Prerequisites

- Node.js and npm installed
- Move4Good development server running (`npm run dev`)
- [ngrok](https://ngrok.com/) installed for local testing
- Strava Developer account with app configured

## Quick Start

### 1. Start Development Server

```bash
npm run dev
```

Your app should be running at `http://localhost:3000`

### 2. Set Up ngrok Tunnel (for local testing)

Install ngrok if you haven't already:
```bash
# macOS with Homebrew
brew install ngrok

# Or download from https://ngrok.com/download
```

Start ngrok tunnel:
```bash
ngrok http 3000
```

ngrok will provide a public URL like `https://abc123.ngrok.io` - **copy this URL**.

### 3. Test Webhook Management

Use the webhook testing utility to manage subscriptions:

```bash
# List existing webhook subscriptions
node src/scripts/test-webhooks.js list

# Create a new webhook subscription (replace with your ngrok URL)
node src/scripts/test-webhooks.js create --callback-url https://abc123.ngrok.io/api/strava/webhooks/callback

# Test webhook validation endpoint
node src/scripts/test-webhooks.js test --callback-url https://abc123.ngrok.io/api/strava/webhooks/callback

# Delete a webhook subscription (replace with actual subscription ID)
node src/scripts/test-webhooks.js delete --subscription-id 12345
```

### 4. Monitor Webhook Events

Visit the webhook events viewer in your browser:
```
http://localhost:3000/webhook-events
```

This page shows:
- Real-time webhook events and validation requests
- Raw and formatted activity data
- Database operations and their results
- Processing times and error details
- Event filtering and statistics

## Environment Variables

Ensure these variables are set in your `.env.local`:

```env
# Strava API credentials
NEXT_PUBLIC_STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret

# Webhook verification token (can be any random string)
STRAVA_WEBHOOK_VERIFY_TOKEN=your_random_verification_token

# Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SECRET_KEY=your_supabase_secret_key
```

## Webhook Testing Workflow

### 1. Create Webhook Subscription

```bash
# Replace with your ngrok URL or production domain
node src/scripts/test-webhooks.js create --callback-url https://abc123.ngrok.io/api/strava/webhooks/callback
```

### 2. Verify Subscription

Strava will immediately send a validation request to your callback URL. Check:
- Your terminal logs for the validation request
- The webhook events viewer at `/webhook-events`
- The validation should show status \"success\"

### 3. Test Activity Events

To test webhook events, you need real Strava activity data. You can:

**Option A: Use your own Strava account**
1. Complete the OAuth flow in your app to connect your Strava account
2. Record a new activity on Strava (or upload/edit an existing one)
3. Strava will send webhook events automatically

**Option B: Use Strava's test data**
Unfortunately, Strava doesn't provide a way to send test webhook events directly. You need real activity changes to trigger webhooks.

### 4. Monitor Events

Visit `/webhook-events` to see:
- **Validation Events**: GET requests from Strava to verify your endpoint
- **Activity Events**: POST requests when activities are created/updated/deleted
- **Raw Activity Data**: Complete activity details from Strava API
- **Database Operations**: What was saved/updated in your database
- **Processing Metrics**: How long each operation took

## Event Types You'll See

### Webhook Validation (GET)
```json
{
  \"type\": \"validation\",
  \"data\": {
    \"url\": \"https://your-domain.com/api/strava/webhooks/callback?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...\",
    \"method\": \"GET\"
  },
  \"status\": \"success\"
}
```

### Activity Creation (POST)
```json
{
  \"type\": \"webhook\",
  \"data\": {
    \"object_type\": \"activity\",
    \"object_id\": 12345678,
    \"aspect_type\": \"create\",
    \"owner_id\": 987654,
    \"event_time\": 1640995200
  },
  \"status\": \"success\"
}
```

### Activity Update (POST)
```json
{
  \"type\": \"webhook\",
  \"data\": {
    \"object_type\": \"activity\",
    \"object_id\": 12345678,
    \"aspect_type\": \"update\",
    \"owner_id\": 987654,
    \"event_time\": 1640995300
  },
  \"status\": \"success\"
}
```

### Activity Deletion (POST)
```json
{
  \"type\": \"webhook\",
  \"data\": {
    \"object_type\": \"activity\",
    \"object_id\": 12345678,
    \"aspect_type\": \"delete\",
    \"owner_id\": 987654,
    \"event_time\": 1640995400
  },
  \"status\": \"success\"
}
```

## Troubleshooting

### Webhook Validation Fails
- Check that `STRAVA_WEBHOOK_VERIFY_TOKEN` matches what you used when creating the subscription
- Ensure your webhook endpoint is publicly accessible
- Check ngrok is still running and the URL hasn't changed

### No Activity Events Received
- Ensure you've completed OAuth flow to connect a Strava account
- Try editing an existing Strava activity (change title/description)
- Check webhook subscription is still active: `node src/scripts/test-webhooks.js list`

### Events Show as \"Failed\" or \"Error\"
- Check the webhook events viewer for detailed error messages
- Verify Supabase credentials are correct
- Check user exists in your database with valid Strava tokens

### Database Operations Fail
- Ensure your Supabase database schema matches the expected structure
- Check the `users` and `activities` tables exist
- Verify Supabase secret key has appropriate permissions

## Production Deployment

### 1. Update Environment Variables
Replace localhost URLs with your production domain:
```env
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_STRAVA_REDIRECT_URI=https://yourdomain.com/auth/strava/callback
```

### 2. Update Strava App Settings
In your Strava app settings (https://www.strava.com/settings/api):
- Add your production callback URL to \"Authorization Callback Domain\"

### 3. Create Production Webhook
```bash
node src/scripts/test-webhooks.js create --callback-url https://yourdomain.com/api/strava/webhooks/callback
```

### 4. Test Production Webhook
```bash
node src/scripts/test-webhooks.js test --callback-url https://yourdomain.com/api/strava/webhooks/callback
```

## API Endpoints

The webhook system includes these API endpoints:

- `GET /api/strava/webhooks/subscribe` - List webhook subscriptions
- `POST /api/strava/webhooks/subscribe` - Create webhook subscription  
- `DELETE /api/strava/webhooks/subscribe?subscription_id=X` - Delete webhook subscription
- `GET /api/strava/webhooks/callback` - Webhook validation endpoint
- `POST /api/strava/webhooks/callback` - Webhook event handler
- `GET /api/webhook-events` - Get webhook events (for monitoring page)
- `DELETE /api/webhook-events` - Clear webhook events from memory

## Security Notes

- Webhook verification tokens should be random and kept secret
- Never log sensitive data like access tokens in webhook events
- Webhook events are stored only in memory and cleared on server restart
- Always validate webhook signatures in production (not implemented in this basic version)

## Need Help?

- Check the webhook events viewer at `/webhook-events` for real-time debugging
- Use the testing utility script for webhook management
- Review Strava's webhook documentation: https://developers.strava.com/docs/webhooks/
- Check server logs for detailed error messages