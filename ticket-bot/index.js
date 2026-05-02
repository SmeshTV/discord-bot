require('dotenv').config();
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

const GUILD_ID = '1463228311118549124';

client.once('ready', () => {
  console.log(`✅ Бот запущен: ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const customId = interaction.customId;

  // Закрываем тикет по кнопке
  if (customId.startsWith('close_ticket_')) {
    await interaction.deferUpdate();

    const channelId = customId.replace('close_ticket_', '');
    const channel = interaction.guild.channels.cache.get(channelId);

    if (!channel) {
      return interaction.followUp({ content: '❌ Канал не найден', ephemeral: true });
    }

    try {
      // Отправляем сообщение о закрытии
      await channel.send({
        content: '🔒 **Тикет закрыт. Канал будет удалён через 10 секунд.**',
      });

      // Удаляем канал через 10 секунд
      setTimeout(async () => {
        try {
          await channel.delete('Ticket closed via website button');
        } catch (err) {
          console.error('Failed to delete channel:', err);
        }
      }, 10000);
    } catch (err) {
      console.error('Error closing ticket:', err);
      await interaction.followUp({ content: '❌ Ошибка при закрытии тикета', ephemeral: true });
    }
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
