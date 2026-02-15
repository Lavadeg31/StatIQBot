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
    console.warn('⚠️  No allowed roles configured. All users will be denied access.');
    return false;
  }
  return member.roles.cache.some(role => ALLOWED_ROLES.includes(role.id));
}

// Execute refresh script
async function refreshEvent(eventId) {
  const scriptPath = path.join(ROBOSTEM_DB_PATH, 'scripts', 'refresh-event.js');
  const command = `node "${scriptPath}" ${eventId}`;
  
  console.log(`Executing: ${command}`);
  
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
      
      await processingMsg.edit({ embeds: [successEmbed] });
      console.log(`✅ Event ${eventId} refreshed by ${message.author.tag}`);
    } else {
      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Refresh Failed')
        .setDescription(`Failed to refresh event \`${eventId}\`.`)
        .setTimestamp();
      
      await processingMsg.edit({ embeds: [errorEmbed] });
      console.error(`❌ Failed to refresh event ${eventId}:`, result.error);
    }
  } catch (error) {
    const errorEmbed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('❌ Error')
      .setDescription('An unexpected error occurred.')
      .setTimestamp();
    
    await processingMsg.edit({ embeds: [errorEmbed] });
    console.error('❌ Unexpected error:', error);
  }
});

// Bot ready event
client.once('clientReady', () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ StatIQBot is online!`);
  console.log(`📝 Logged in as: ${client.user.tag}`);
  console.log(`🤖 Bot ID: ${client.user.id}`);
  console.log(`📊 Serving ${client.guilds.cache.size} server(s)`);
  console.log(`📁 Database path: ${ROBOSTEM_DB_PATH}`);
  console.log(`🔐 Allowed roles: ${ALLOWED_ROLES.length > 0 ? ALLOWED_ROLES.length : 'None configured!'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Commands:');
  console.log('  !refresh <event_id> - Refresh an event');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  client.user.setActivity('!refresh <event_id>', { type: ActivityType.Watching });
});

// Error handling
client.on('error', (error) => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// Login
client.login(TOKEN).catch((error) => {
  console.error('Failed to login:', error);
  process.exit(1);
});
