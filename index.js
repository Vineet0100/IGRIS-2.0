const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const triggersPath = path.join(__dirname, 'triggers.json');
let triggers = fs.existsSync(triggersPath)
  ? JSON.parse(fs.readFileSync(triggersPath, 'utf-8'))
  : {};

function saveTriggers() {
  fs.writeFileSync(triggersPath, JSON.stringify(triggers, null, 2));
}

function isValidImageURL(url) {
  return url.match(/\.(jpeg|jpg|gif|png)$/);
}

client.once('ready', async () => {
  console.log(`🟢 Logged in as ${client.user.tag}`);

  // Register Slash Commands
  const commands = [
    new SlashCommandBuilder().setName('arise').setDescription('Summon Igris from the shadows'),
    new SlashCommandBuilder().setName('avatar').setDescription('Get your or a mentioned user\'s avatar'),
    new SlashCommandBuilder().setName('help').setDescription('Show available bot commands'),
    new SlashCommandBuilder().setName('calc').setDescription('Perform a calculation').addStringOption(option => option.setName('expression').setDescription('Enter math expression').setRequired(true)),
    new SlashCommandBuilder().setName('addtrigger').setDescription('Add a custom trigger').addStringOption(option => option.setName('word').setDescription('Trigger word').setRequired(true)),
    new SlashCommandBuilder().setName('removetrigger').setDescription('Remove a custom trigger').addStringOption(option => option.setName('word').setDescription('Trigger word').setRequired(true)),
    new SlashCommandBuilder().setName('listtriggers').setDescription('List all custom triggers'),
    new SlashCommandBuilder().setName('cleartriggers').setDescription('Clear all custom triggers'),
    new SlashCommandBuilder().setName('kick').setDescription('Kick a user').addUserOption(option => option.setName('user').setDescription('User to kick').setRequired(true)),
    new SlashCommandBuilder().setName('ban').setDescription('Ban a user').addUserOption(option => option.setName('user').setDescription('User to ban').setRequired(true)),
    new SlashCommandBuilder().setName('unban').setDescription('Unban a user').addStringOption(option => option.setName('user').setDescription('User to unban').setRequired(true)),
    new SlashCommandBuilder().setName('timeout').setDescription('Timeout a user').addUserOption(option => option.setName('user').setDescription('User to timeout').setRequired(true)).addIntegerOption(option => option.setName('duration').setDescription('Timeout duration in seconds').setRequired(true)),
  ];

  await client.guilds.cache.get(process.env.GUILD_ID).commands.set(commands);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName, options } = interaction;

  // Handle the slash commands
  if (commandName === 'arise') {
    const embed = new EmbedBuilder()
      .setTitle('⚔️ Igris Has Awakened!')
      .setDescription('Summoned by the shadows, Igris stands ready.\n\n**How can I assist you today, master?**')
      .setColor('DarkPurple')
      .setFooter({ text: `⚔️ ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });

  } else if (commandName === 'avatar') {
    const user = options.getUser('user') || interaction.user;
    const embed = new EmbedBuilder()
      .setTitle(`${user.username}'s Avatar`)
      .setImage(user.displayAvatarURL({ size: 1024 }))
      .setColor('Blue');
    await interaction.reply({ embeds: [embed] });

  } else if (commandName === 'help') {
    const helpEmbed = new EmbedBuilder()
      .setTitle('🛡️ Igris Bot Help')
      .setColor('Blue')
      .setDescription(`Here's a list of available commands:`)
      .addFields(
        { name: '/arise', value: 'Summon Igris from the shadows.' },
        { name: '/avatar', value: 'Get your or a mentioned user\'s avatar.' },
        { name: '/calc', value: 'Perform a quick calculation.' },
        { name: '/addtrigger', value: 'Add a custom trigger.' },
        { name: '/removetrigger', value: 'Remove a trigger.' },
        { name: '/listtriggers', value: 'List all custom triggers.' },
        { name: '/cleartriggers', value: 'Clear all custom triggers.' },
        { name: '/kick', value: 'Kick a user from the server.' },
        { name: '/ban', value: 'Ban a user from the server.' },
        { name: '/unban', value: 'Unban a user from the server.' },
        { name: '/timeout', value: 'Timeout a user.' }
      );
    await interaction.reply({ embeds: [helpEmbed] });

  } else if (commandName === 'calc') {
    const expression = options.getString('expression');
    try {
      const result = Function(`"use strict"; return (${expression})`)();
      if (isNaN(result)) return interaction.reply('❌ Invalid expression.');

      const embed = new EmbedBuilder()
        .setTitle('🧮 Calculation Result')
        .setDescription(`\`\`\`${expression} = ${result}\`\`\``)
        .setColor('Green')
        .setFooter({ text: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Calculation Error:', err);
      await interaction.reply('❌ Error in calculation. Please check your expression.');
    }

  } else if (commandName === 'addtrigger') {
    const word = options.getString('word').toLowerCase();
    await interaction.channel.send('Enter the response content:');
    const filter = (response) => response.author.id === interaction.user.id;
    const responseMsg = (await interaction.channel.awaitMessages({ filter, max: 1, time: 60000 })).first();
    const response = responseMsg?.content;
    if (!response) return interaction.channel.send('⛔ Cancelled.');
    const type = 'text'; // Assuming text type by default. Adjust if needed.
    if (type === 'image' && !isValidImageURL(response)) return interaction.channel.send('⛔ Invalid image URL.');

    triggers[word] = { type, response };
    saveTriggers();
    await interaction.channel.send(`✅ Trigger \`${word}\` added.`);

  } else if (commandName === 'removetrigger') {
    const word = options.getString('word').toLowerCase();
    if (!word || !triggers[word]) return interaction.reply('⛔ Trigger not found.');
    delete triggers[word];
    saveTriggers();
    interaction.reply(`✅ Trigger \`${word}\` removed.`);

  } else if (commandName === 'listtriggers') {
    if (!Object.keys(triggers).length) return interaction.reply('No triggers found.');
    const list = Object.entries(triggers).map(([key, val]) => `• **${key}** → ${val.type}`).join('\n');
    const embed = new EmbedBuilder().setTitle('🧠 Active Triggers').setDescription(list).setColor('Purple');
    await interaction.reply({ embeds: [embed] });

  } else if (commandName === 'cleartriggers') {
    triggers = {};
    saveTriggers();
    await interaction.reply('✅ All triggers have been cleared.');

  } else if (commandName === 'kick') {
    const user = options.getUser('user');
    if (!user) return interaction.reply('❌ User not found.');
    const member = await interaction.guild.members.fetch(user.id);
    if (!member.kickable) return interaction.reply('❌ I cannot kick this user.');
    await member.kick();
    await interaction.reply(`✅ Kicked ${user.tag}.`);

  } else if (commandName === 'ban') {
    const user = options.getUser('user');
    if (!user) return interaction.reply('❌ User not found.');
    const member = await interaction.guild.members.fetch(user.id);
    if (!member.bannable) return interaction.reply('❌ I cannot ban this user.');
    await member.ban();
    await interaction.reply(`✅ Banned ${user.tag}.`);

  } else if (commandName === 'unban') {
    const userId = options.getString('user');
    const bannedUser = await interaction.guild.bans.fetch(userId);
    if (!bannedUser) return interaction.reply('❌ User not found in banned list.');
    await interaction.guild.bans.remove(userId);
    await interaction.reply(`✅ Unbanned ${bannedUser.user.tag}.`);

  } else if (commandName === 'timeout') {
    const user = options.getUser('user');
    const duration = options.getInteger('duration');
    const member = await interaction.guild.members.fetch(user.id);
    if (!member.manageable) return interaction.reply('❌ I cannot timeout this user.');
    await member.timeout(duration * 1000); // Convert to milliseconds
    await interaction.reply(`✅ Timed out ${user.tag} for ${duration} seconds.`);
  }
});

client.login(process.env.TOKEN);
