# WhatsApp Business Cloud API Setup Guide

This guide walks you through setting up your WhatsApp Business account for integration with the platform.

## Prerequisites

- A Meta Business Account
- A verified phone number for WhatsApp Business
- Business verification (required for production)

## Step 1: Create Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click **My Apps** → **Create App**
3. Select **Business** as the app type
4. Fill in your app details:
   - App Name: Your application name
   - App Contact Email: Your email
   - Business Account: Select your business account
5. Click **Create App**

## Step 2: Add WhatsApp Product

1. In your app dashboard, find **WhatsApp** in the products list
2. Click **Set up** to add WhatsApp to your app
3. You'll be redirected to the WhatsApp setup page

## Step 3: Configure WhatsApp Business Account

### Using Embedded Signup (Recommended)

1. In the WhatsApp setup page, click **Start using the API**
2. Follow the Embedded Signup flow:
   - Select or create a Business Portfolio
   - Create or select a WhatsApp Business Account
   - Add a phone number (must be able to receive SMS or calls)
   - Verify the phone number with the code sent via SMS

### Manual Configuration

If you already have a WhatsApp Business Account:

1. Note your **WhatsApp Business Account ID**
2. Note your **Phone Number ID**
3. Generate a **Permanent Access Token** (see Step 4)

## Step 4: Generate Access Token

### Temporary Token (Development)

1. In the WhatsApp setup page, under **API Setup**
2. You'll see a temporary access token
3. This token expires after 24 hours

### Permanent Token (Production)

1. Go to **Settings** → **Business Settings**
2. Under **System Users**, create a new system user
3. Assign the system user to your WhatsApp app
4. Generate a token with these permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
5. Save this token securely - you won't see it again

## Step 5: Configure Webhooks

1. In the WhatsApp setup page, find **Configuration**
2. Click **Edit** next to Webhook
3. Enter your webhook URL:
   ```
   https://your-domain.com/api/v1/whatsapp/webhook
   ```
4. Enter a **Verify Token** (create a random secure string)
5. Save this verify token - you'll need it for `.env`
6. Click **Verify and Save**

### Subscribe to Webhook Fields

Subscribe to these webhook fields:
- ✅ messages
- ✅ message_status (optional but recommended)

## Step 6: Configure Environment Variables

Add these to your `.env` file:

```bash
# WhatsApp Cloud API
WHATSAPP_API_VERSION=v18.0
WHATSAPP_GRAPH_API_URL=https://graph.facebook.com
WHATSAPP_WEBHOOK_SECRET=your-verify-token-here

# Encryption key for storing access tokens (32 bytes hex)
ENCRYPTION_KEY=your-32-byte-encryption-key-in-hex
```

Generate encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 7: Connect Account in Platform

1. Log into your workspace
2. Go to **Settings** → **WhatsApp Accounts**
3. Click **Connect WhatsApp Account**
4. Fill in the form:
   - **Account Name**: Friendly name for this connection
   - **Business Account ID**: From Meta app
   - **Phone Number ID**: From Meta app
   - **Phone Number**: The WhatsApp number
   - **Access Token**: Your permanent token
   - **Webhook Secret**: Same as verify token
5. Click **Connect**

The platform will verify the connection by fetching phone number info.

## Step 8: Sync Message Templates

1. In the platform, go to your connected WhatsApp account
2. Click **Sync Templates**
3. All approved templates will be imported

## Step 9: Test the Integration

### Test Incoming Messages

1. Send a WhatsApp message to your business number
2. Check the platform inbox - you should see the message

### Test Outgoing Messages

1. In the platform, open a conversation
2. Send a text message
3. Verify it's received on WhatsApp

## Troubleshooting

### Webhook Verification Fails

- Ensure your server is publicly accessible
- Check that the verify token matches exactly
- Verify SSL certificate is valid (webhooks require HTTPS)

### Messages Not Being Received

- Check webhook subscriptions are active
- Verify webhook signature validation is working
- Check webhook event logs in Meta Business Suite

### Cannot Send Messages

- Verify access token has correct permissions
- Check phone number is verified and not restricted
- Ensure you're within the 24-hour messaging window (or using approved templates)

### "Account Restricted" Error

- Your account may have quality issues
- Check your quality rating in Meta Business Suite
- Review WhatsApp Business policies

## Production Checklist

Before going live:

- [ ] Business verification completed
- [ ] Using permanent access token (not temporary)
- [ ] Webhooks configured with HTTPS
- [ ] Phone number fully verified
- [ ] Message templates created and approved
- [ ] Privacy policy URL added to Meta app
- [ ] Terms of service URL added to Meta app
- [ ] Display name matches business name
- [ ] Profile picture uploaded
- [ ] About text configured

## API Rate Limits

Meta enforces rate limits:

- **Messaging**: 1000 messages per day (increases with quality rating)
- **API Calls**: 200 requests per hour per app
- **Template Creation**: 250 per month

Quality rating affects limits:
- High Quality: Higher limits
- Medium Quality: Standard limits
- Low Quality: Restricted sending

## Message Template Guidelines

Templates must follow WhatsApp policies:

1. **No prohibited content**: No illegal, misleading, or abusive content
2. **Clear opt-out**: Include unsubscribe option for marketing
3. **Accurate information**: No false claims or misleading info
4. **Relevant variables**: Template parameters must be relevant
5. **Professional tone**: Appropriate for business communication

## Resources

- [WhatsApp Business Platform Docs](https://developers.facebook.com/docs/whatsapp)
- [Cloud API Getting Started](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
- [Message Templates](https://developers.facebook.com/docs/whatsapp/message-templates)
- [Webhooks Reference](https://developers.facebook.com/docs/graph-api/webhooks)
- [API Rate Limits](https://developers.facebook.com/docs/graph-api/overview/rate-limiting)
- [Business Verification](https://www.facebook.com/business/help/2058515294227817)

## Support

For platform-specific issues:
- Check application logs
- Review webhook event processing
- Test provider health endpoint

For WhatsApp API issues:
- Meta Business Support
- WhatsApp Business API Support Portal
