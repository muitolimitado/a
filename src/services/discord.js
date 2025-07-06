// customer-backend/src/services/discord.js
const axios = require('axios');

async function addUserToGuild(userId, accessToken) {
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!guildId || !botToken) {
    console.warn('⚠️ DISCORD_GUILD_ID ou DISCORD_BOT_TOKEN não configurados');
    return false;
  }

  try {
    const response = await axios.put(
      `https://discord.com/api/guilds/${guildId}/members/${userId}`,
      { access_token: accessToken },
      {
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    if (response.status === 201 || response.status === 204) {
      console.log('✅ Usuário adicionado ou já está no servidor');
      return true;
    }

    console.log('⚠️ Status inesperado:', response.status);
    return false;
  } catch (error) {
    const status = error.response?.status;
    const data = error.response?.data || error.message;

    if (status === 403) {
      console.error('❌ Bot sem permissão "Manage Members"');
    } else if (status === 404) {
      console.error('❌ Servidor ou bot não encontrado');
    } else if (status === 400) {
      console.error('❌ Requisição inválida:', data);
    } else {
      console.error('❌ Erro ao adicionar ao servidor:', data);
    }

    return false;
  }
}

module.exports = { addUserToGuild };