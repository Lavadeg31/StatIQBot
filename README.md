# StatIQBot - Discord Event Refresh Bot

A Discord bot for the RoboStem Foundation that allows authorized users to refresh scouting app events running on Raspberry Pi 4.

## Features

- 🔐 Role-based access control
- 🔄 Event refresh via command
- 📊 Real-time status updates with embeds
- 🤖 Supports both event SKUs and numeric IDs
- 📝 Detailed logging

## Prerequisites

- Node.js 16.9.0 or higher
- Discord Bot Token
- Access to RoboStem-DB project at `/home/robostem-db/projects/RoboStem-DB`

## Installation

1. Clone this repository or copy files to your Raspberry Pi 4

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from example:
```bash
cp .env.example .env
```

4. Configure your `.env` file:
```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
ALLOWED_ROLES=role_id_1,role_id_2,role_id_3
ROBOSTEM_DB_PATH=/home/robostem-db/projects/RoboStem-DB
```

## Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section and create a bot
4. Copy the bot token and add it to `.env`
5. Enable the following **Privileged Gateway Intents**:
   - Message Content Intent
6. Go to OAuth2 > URL Generator:
   - Select scope: `bot`
   - Select permissions:
     - Read Messages/View Channels
     - Send Messages
     - Embed Links
   - Copy the generated URL and invite the bot to your server

## Getting Role IDs

1. Enable Developer Mode in Discord (Settings > Advanced > Developer Mode)
2. Right-click on a role and select "Copy ID"
3. Add the role ID to your `.env` file in `ALLOWED_ROLES`

## Usage

Start the bot:
```bash
npm start
```

### Commands

- `!refresh <event_id>` - Refresh an event

### Examples

```
!refresh RE-VIQRC-25-1974
!refresh 61974
```

## Running as a Service (Systemd)

Create a service file at `/etc/systemd/system/statiqbot.service`:

```ini
[Unit]
Description=StatIQBot Discord Bot
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/StatIQBot
ExecStart=/usr/bin/node bot.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl enable statiqbot
sudo systemctl start statiqbot
sudo systemctl status statiqbot
```

View logs:
```bash
sudo journalctl -u statiqbot -f
```

## Troubleshooting

### Bot doesn't respond
- Check that the bot has proper permissions in your Discord server
- Verify Message Content Intent is enabled in Discord Developer Portal
- Ensure your role ID is correctly configured in `.env`

### Script execution fails
- Verify the `ROBOSTEM_DB_PATH` is correct
- Check that the refresh script exists at the expected location
- Ensure the bot has permissions to execute Node.js scripts

### Check logs
```bash
# If running directly
npm start

# If running as service
sudo journalctl -u statiqbot -f
```

## Security Notes

- Never commit your `.env` file
- Keep your Discord token secure
- Only give bot permissions to trusted roles
- Run the bot with minimal system permissions

## License

MIT License - RoboStem Foundation
