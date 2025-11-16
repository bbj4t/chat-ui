# Messaging Agent Configuration Examples

This document provides example configurations for different messaging platforms.

## Telegram Bot

### Configuration

```json
{
  "name": "My Telegram Bot",
  "platform": "telegram",
  "apiToken": "123456789:ABCdefGHIjklMNOpqrsTUVwxyz",
  "config": {
    "webhook_url": "https://your-domain.com/api/agents/telegram/webhook",
    "commands": [
      {
        "command": "/start",
        "description": "Start conversation with the bot"
      },
      {
        "command": "/help",
        "description": "Get help information"
      },
      {
        "command": "/settings",
        "description": "Configure bot settings"
      }
    ],
    "allowed_updates": ["message", "callback_query"],
    "max_connections": 40
  },
  "isActive": true
}
```

### Setting up Telegram Bot

1. Create a bot via [@BotFather](https://t.me/botfather)
2. Get your bot token
3. Set webhook URL: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=<YOUR_WEBHOOK_URL>`
4. Create the agent via API:

```bash
curl -X POST https://your-domain.com/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Telegram Bot",
    "platform": "telegram",
    "apiToken": "YOUR_BOT_TOKEN",
    "config": {
      "webhook_url": "https://your-domain.com/api/agents/telegram/webhook",
      "commands": ["/start", "/help"]
    },
    "isActive": true
  }'
```

### Handling Telegram Messages

Example webhook handler (pseudo-code):

```typescript
// Receive webhook from Telegram
POST /api/agents/telegram/webhook

{
  "message": {
    "message_id": 123,
    "from": {
      "id": 987654321,
      "first_name": "John"
    },
    "text": "Hello bot!"
  }
}

// Log the received message
POST /api/agents/{agentId}/logs
{
  "logType": "message_received",
  "logData": {
    "user_id": 987654321,
    "message": "Hello bot!",
    "timestamp": "2024-01-15T10:00:00Z"
  }
}

// Process and respond
// ... your bot logic here ...

// Log the sent message
POST /api/agents/{agentId}/logs
{
  "logType": "message_sent",
  "logData": {
    "user_id": 987654321,
    "message": "Hello! How can I help you?",
    "timestamp": "2024-01-15T10:00:05Z"
  }
}
```

## Instagram Direct Messages

### Configuration

```json
{
  "name": "Instagram Bot",
  "platform": "instagram",
  "apiToken": "INSTAGRAM_ACCESS_TOKEN",
  "config": {
    "webhook_url": "https://your-domain.com/api/agents/instagram/webhook",
    "verify_token": "YOUR_VERIFY_TOKEN",
    "instagram_business_account_id": "123456789",
    "auto_reply": true,
    "quick_replies": [
      {
        "title": "Product Info",
        "payload": "PRODUCT_INFO"
      },
      {
        "title": "Support",
        "payload": "SUPPORT"
      },
      {
        "title": "Order Status",
        "payload": "ORDER_STATUS"
      }
    ]
  },
  "isActive": true
}
```

### Setting up Instagram Bot

1. Create a Facebook App
2. Add Instagram Basic Display or Instagram Graph API
3. Get Instagram Business Account access token
4. Subscribe to messaging webhooks
5. Create the agent via API

```bash
curl -X POST https://your-domain.com/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Instagram Bot",
    "platform": "instagram",
    "apiToken": "YOUR_ACCESS_TOKEN",
    "config": {
      "webhook_url": "https://your-domain.com/api/agents/instagram/webhook",
      "verify_token": "YOUR_VERIFY_TOKEN",
      "instagram_business_account_id": "YOUR_ACCOUNT_ID"
    },
    "isActive": true
  }'
```

## WhatsApp Business API

### Configuration

```json
{
  "name": "WhatsApp Business Bot",
  "platform": "whatsapp",
  "apiToken": "YOUR_WHATSAPP_API_TOKEN",
  "config": {
    "webhook_url": "https://your-domain.com/api/agents/whatsapp/webhook",
    "verify_token": "YOUR_VERIFY_TOKEN",
    "phone_number_id": "123456789",
    "business_account_id": "987654321",
    "api_version": "v18.0",
    "message_templates": [
      {
        "name": "welcome_message",
        "language": "en",
        "components": [
          {
            "type": "body",
            "text": "Welcome! How can we help you today?"
          }
        ]
      }
    ]
  },
  "isActive": true
}
```

### Setting up WhatsApp Bot

1. Sign up for WhatsApp Business API
2. Get your phone number ID and access token
3. Configure webhook in Meta for Developers
4. Create the agent via API

```bash
curl -X POST https://your-domain.com/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "WhatsApp Business Bot",
    "platform": "whatsapp",
    "apiToken": "YOUR_API_TOKEN",
    "config": {
      "webhook_url": "https://your-domain.com/api/agents/whatsapp/webhook",
      "phone_number_id": "YOUR_PHONE_NUMBER_ID",
      "business_account_id": "YOUR_BUSINESS_ID"
    },
    "isActive": true
  }'
```

## Discord Bot

### Configuration

```json
{
  "name": "Discord Bot",
  "platform": "discord",
  "apiToken": "YOUR_DISCORD_BOT_TOKEN",
  "config": {
    "application_id": "123456789",
    "guild_ids": ["987654321", "123456789"],
    "intents": ["GUILDS", "GUILD_MESSAGES", "DIRECT_MESSAGES"],
    "prefix": "!",
    "commands": [
      {
        "name": "help",
        "description": "Show available commands"
      },
      {
        "name": "ask",
        "description": "Ask the AI a question"
      }
    ]
  },
  "isActive": true
}
```

## Slack Bot

### Configuration

```json
{
  "name": "Slack Bot",
  "platform": "slack",
  "apiToken": "xoxb-your-slack-bot-token",
  "config": {
    "webhook_url": "https://your-domain.com/api/agents/slack/webhook",
    "signing_secret": "YOUR_SIGNING_SECRET",
    "app_id": "A1234567",
    "team_id": "T1234567",
    "scopes": [
      "chat:write",
      "channels:history",
      "channels:read",
      "im:history",
      "im:read",
      "im:write"
    ],
    "slash_commands": [
      {
        "command": "/ask",
        "description": "Ask the AI a question",
        "usage_hint": "/ask [your question]"
      }
    ]
  },
  "isActive": true
}
```

## Generic Webhook Agent

For custom integrations:

```json
{
  "name": "Custom Webhook Bot",
  "platform": "webhook",
  "apiToken": null,
  "config": {
    "webhook_url": "https://your-domain.com/api/agents/custom/webhook",
    "webhook_secret": "YOUR_SECRET_KEY",
    "authentication": {
      "type": "bearer",
      "header": "Authorization"
    },
    "message_format": "json",
    "custom_headers": {
      "X-Custom-Header": "value"
    }
  },
  "isActive": true
}
```

## Best Practices

### Security

1. **Store tokens securely**: Never commit API tokens to version control
2. **Use environment variables**: Store sensitive data in environment variables
3. **Implement rate limiting**: Protect your API from abuse
4. **Validate webhooks**: Always verify webhook signatures
5. **Use HTTPS**: Ensure all webhook URLs use HTTPS

### Error Handling

Always log errors for debugging:

```bash
curl -X POST https://your-domain.com/api/agents/{agentId}/logs \
  -H "Content-Type: application/json" \
  -d '{
    "logType": "error",
    "logData": {
      "error": "Failed to send message",
      "details": "Network timeout",
      "user_id": "123456",
      "timestamp": "2024-01-15T10:00:00Z"
    }
  }'
```

### Monitoring

Monitor your agents with the logs API:

```bash
# Get recent errors
curl "https://your-domain.com/api/agents/{agentId}/logs?type=error&limit=50"

# Get all activity
curl "https://your-domain.com/api/agents/{agentId}/logs?limit=100"
```

### Testing

1. Start with a test bot/account
2. Use webhook testing tools like ngrok or RequestBin
3. Implement comprehensive logging
4. Test error scenarios
5. Monitor API rate limits

## Environment Variables

Add platform-specific tokens to your `.env` file:

```bash
# Telegram
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz

# Instagram
INSTAGRAM_ACCESS_TOKEN=your_instagram_token
INSTAGRAM_VERIFY_TOKEN=your_verify_token

# WhatsApp
WHATSAPP_API_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id

# Discord
DISCORD_BOT_TOKEN=your_discord_token

# Slack
SLACK_BOT_TOKEN=xoxb-your-slack-token
SLACK_SIGNING_SECRET=your_signing_secret
```

## Troubleshooting

### Common Issues

1. **Webhook not receiving messages**
   - Verify webhook URL is publicly accessible
   - Check webhook verification token
   - Review platform-specific webhook requirements

2. **Authentication errors**
   - Verify API tokens are correct and not expired
   - Check token permissions/scopes
   - Ensure tokens are properly formatted

3. **Rate limiting**
   - Implement exponential backoff
   - Cache responses where possible
   - Monitor API usage

4. **Message formatting issues**
   - Validate message format against platform specifications
   - Test with platform-specific testing tools
   - Check character limits and restrictions

## Additional Resources

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [Discord Developer Portal](https://discord.com/developers/docs)
- [Slack API](https://api.slack.com/)
