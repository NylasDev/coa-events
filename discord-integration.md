# Discord Integration for COA Events

This document explains how to set up and use the Discord integration features for the COA Events application.

## Features

- **Automatic Event Notifications**: Discord notifications for new events
- **Event Reminders**: Automatic reminders 8 hours, 4 hours, 1 hour, and 10 minutes before events
- **Discord Commands**: Allow members to sign up directly from Discord
- **Participant Lists**: See who has signed up within Discord

## Setup Instructions

### 1. Create a Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application (or use your existing OAuth app)
3. Go to the "Bot" tab and click "Add Bot"
4. Copy the bot token
5. Under "Privileged Gateway Intents", enable "Server Members Intent"
6. Go to "OAuth2" → "URL Generator"
7. Select the following permissions:
   - Scopes: `bot`
   - Bot Permissions: `Send Messages`, `Embed Links`, `Read Message History`
8. Use the generated URL to invite the bot to your server

### 2. Create a Discord Webhook

1. In your Discord server, go to the channel where you want event notifications
2. Click the gear icon next to the channel name → "Integrations" → "Webhooks"
3. Click "New Webhook"
4. Name it (e.g., "COA Events") and set an avatar if desired
5. Click "Copy Webhook URL"

### 3. Update Environment Variables

Add these to your `.env` file:

```env
# Discord Bot & Webhook Configuration
DISCORD_BOT_TOKEN=your_discord_bot_token_here
DISCORD_WEBHOOK_URL=your_discord_webhook_url_here
DISCORD_WEBHOOK_SECRET=create_a_random_secret_string_here

# Discord Notification Channel (optional override)
DISCORD_EVENTS_CHANNEL=events
```

### 4. Restart the Application

```bash
npm restart
```

## Discord Commands

Members can use these commands in Discord:

- `/signup EVENT_ID` - Sign up for an event
- `/unsignup EVENT_ID` - Remove signup from an event

The EVENT_ID is visible in event notifications or at the bottom of each event card in the Discord messages.

## Manual Notifications

Admins can manually trigger event notifications:

1. Go to the "All Guild Events" page
2. Click the bell icon 🔔 on any event card

## Notification Schedule

The system automatically sends:

- New event notification when an event is created
- Reminder 8 hours before the event
- Reminder 4 hours before the event
- Reminder 1 hour before the event
- Final reminder 10 minutes before the event

## Webhook Integration

For custom Discord bots that want to integrate with the system:

```javascript
// Example of using the webhook API to process commands
const fetch = require('node-fetch');

async function processCommand(command, user) {
  const response = await fetch('https://your-coa-events-app.com/api/discord/command', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': 'your_webhook_secret_from_env'
    },
    body: JSON.stringify({ command, user })
  });
  
  return await response.json();
}

// Example usage
processCommand('/signup 123', {
  id: '123456789012345678',
  username: 'ExampleUser',
  discriminator: '1234'
});
```

## Troubleshooting

- **No notifications**: Check that `DISCORD_WEBHOOK_URL` is correctly set
- **Bot not responding**: Verify `DISCORD_BOT_TOKEN` is correct and the bot has proper permissions
- **Command errors**: Ensure webhook secret matches between your bot and the COA Events application
