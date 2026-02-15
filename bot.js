const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits, ActivityType } = require('discord.js');
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
require('dotenv').config();

const execAsync = promisify(exec);

// Configuration
const TOKEN = process.env.DISCORD_TOKEN;
const ALLOWED_ROLES = process.env.ALLOWED_ROLES?.split(',').map(id => id.trim()) || [];
const ROBOSTEM_DB_PATH = process.env.ROBOSTEM_DB_PATH || '/home/robostem-db/projects/RoboStem-DB';

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Check if user has required role
function hasRequiredRole(member) {
  if (ALLOWED_ROLES.length === 0) {
    return false;
  }
  return member.roles.cache.some(role => ALLOWED_ROLES.includes(role.id));
}

// Execute refresh script
async function refreshEvent(eventId) {
  const scriptPath = path.join(ROBOSTEM_DB_PATH, 'scripts', 'refresh-event.js');
  const command = `node "${scriptPath}" ${eventId}`;
  
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: ROBOSTEM_DB_PATH,
      timeout: 300000 // 5 minute timeout
    });
    
    return {
      success: true,
      output: stdout || 'Event refreshed successfully',
      error: stderr
    };
  } catch (error) {
    return {
      success: false,
      output: error.stdout || '',
      error: error.stderr || error.message
    };
  }
}

// Handle messages
client.on('messageCreate', async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  // Check if message starts with !refresh
  if (!message.content.startsWith('!refresh')) return;

  // Check if user has required role
  if (!hasRequiredRole(message.member)) {
    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('❌ Access Denied')
      .setDescription('You do not have permission to use this command.')
      .setTimestamp();
    
    return message.reply({ embeds: [embed] });
  }

  // Parse command
  const args = message.content.trim().split(/\s+/);
  const command = args[0];
  const eventId = args[1];

  if (command !== '!refresh') return;

  // Validate event ID
  if (!eventId) {
    const embed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setTitle('⚠️ Missing Event ID')
      .setDescription('Please provide an event ID or SKU.')
      .addFields(
        { name: 'Usage', value: '`!refresh <event_id>`' },
        { name: 'Examples', value: '`!refresh RE-VIQRC-25-1974`\n`!refresh 61974`' }
      )
      .setTimestamp();
    
    return message.reply({ embeds: [embed] });
  }

  // Send processing message
  const processingEmbed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('🔄 Processing...')
    .setDescription(`Refreshing event: \`${eventId}\``)
    .setTimestamp();
  
  const processingMsg = await message.reply({ embeds: [processingEmbed] });

  // Execute refresh
  try {
    const result = await refreshEvent(eventId);
    
    if (result.success) {
      const successEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Event Refreshed Successfully')
        .setDescription(`Event \`${eventId}\` has been refreshed.`)
        .addFields(
          { name: 'Requested by', value: `${message.author.tag}`, inline: true },
          { name: 'Event ID', value: `\`${eventId}\``, inline: true }
        )
        .setTimestamp();
      
      if (result.output && result.output.trim()) {
        successEmbed.addFields({ name: 'Output', value: `\`\`\`\n${result.output.substring(0, 1000)}\n\`\`\`` });
      }
      
      await processingMsg.edit({ embeds: [successEmbed] });
    } else {
      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Refresh Failed')
        .setDescription(`Failed to refresh event \`${eventId}\`.`)
        .addFields(
          { name: 'Error', value: `\`\`\`\n${(result.error || 'Unknown error').substring(0, 1000)}\n\`\`\`` }
        )
        .setTimestamp();
      
      await processingMsg.edit({ embeds: [errorEmbed] });
    }
  } catch (error) {
    const errorEmbed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('❌ Error')
      .setDescription('An unexpected error occurred.')
      .addFields(
        { name: 'Error', value: `\`\`\`\n${error.message.substring(0, 1000)}\n\`\`\`` }
      )
      .setTimestamp();
    
    await processingMsg.edit({ embeds: [errorEmbed] });
  }
});

// Bot ready event
client.once('clientReady', () => {
  client.user.setActivity('!refresh <event_id>', { type: ActivityType.Watching });
});

// Error handling
client.on('error', () => {});

process.on('unhandledRejection', () => {});

// Login
client.login(TOKEN).catch(() => {
  process.exit(1);
});
