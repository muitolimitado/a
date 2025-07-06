const axios = require('axios');
const jwt = require('jsonwebtoken');
const database = require('../config/database');
const { addUserToGuild } = require('../services/discord');
const userService = require('../services/userService');
const qs = require('querystring');

class AuthController {
  // Redirecionar para Discord OAuth
  login(req, res) {
    const scopes = 'identify email guilds.join';
    const discordAuthURL = `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.DISCORD_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scopes)}`;

    console.log('🔄 Redirecionando para Discord OAuth:', discordAuthURL);
    res.redirect(discordAuthURL);
  }

  // Callback do Discord OAuth
  async callback(req, res) {
    const { code } = req.query;

    console.log('📨 Callback recebido com código:', code ? 'Presente' : 'Ausente');

    if (!code) {
      console.error('❌ Código de autorização não fornecido');
      return res.redirect(`${process.env.FRONTEND_URL}?error=no_code`);
    }

    try {
      console.log('🔄 Trocando código por access token...');

      const data = qs.stringify({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI,
        scope: 'identify email guilds.join'
      });

      const tokenResponse = await axios.post(
        'https://discord.com/api/oauth2/token',
        data,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { access_token } = tokenResponse.data;
      console.log('✅ Access token obtido com sucesso');

      console.log('🔄 Obtendo dados do usuário...');
      const userResponse = await axios.get('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      const discordUser = userResponse.data;
      console.log('✅ Dados do usuário obtidos:', {
        id: discordUser.id,
        username: discordUser.username,
        email: discordUser.email
      });

      const addedToServer = await addUserToGuild(discordUser.id, access_token);
      console.log('🏠 Resultado do auto-join:', addedToServer ? 'Sucesso' : 'Falhou');

      const existingUser = await userService.findUserByDiscordId(discordUser.id);

      const userData = {
        discord_id: discordUser.id,
        username: discordUser.username,
        discriminator: discordUser.discriminator || '0',
        email: discordUser.email,
        avatar: discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : null
      };

      let userId;

      if (existingUser) {
        console.log('🔄 Atualizando usuário existente...');
        await userService.updateUser(existingUser.id, userData);
        userId = existingUser.id;
        console.log('✅ Usuário atualizado com sucesso');
      } else {
        console.log('🔄 Criando novo usuário...');
        userId = await userService.createUser(userData);
        console.log('✅ Novo usuário criado com ID:', userId);
        await userService.createWelcomeNotification(userId, addedToServer);
      }

      const token = jwt.sign(
        {
          id: userId,
          discord_id: userData.discord_id,
          username: userData.username
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      console.log('✅ JWT gerado com sucesso');

      const redirectURL = `${process.env.FRONTEND_URL}/customer?token=${token}`;
      console.log('🔄 Redirecionando para:', redirectURL);
      res.redirect(redirectURL);

    } catch (error) {
      console.error('❌ Erro na autenticação Discord:', error.response?.data || error.message);
      res.redirect(`${process.env.FRONTEND_URL}?error=auth_failed`);
    }
  }

  // Obter dados do usuário autenticado
  me(req, res) {
    const userId = req.user.id;

    database.getDB().get(
      'SELECT id, discord_id, username, discriminator, email, avatar, created_at FROM users WHERE id = ?',
      [userId],
      (err, user) => {
        if (err) {
          console.error('❌ Erro ao buscar usuário:', err);
          return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
          });
        }

        if (!user) {
          return res.status(404).json({
            success: false,
            error: 'Usuário não encontrado'
          });
        }

        res.json({
          success: true,
          data: user
        });
      }
    );
  }

  // Atualizar perfil do usuário
  async updateProfile(req, res) {
    const userId = req.user.id;

    try {
      database.getDB().get(
        'SELECT * FROM users WHERE id = ?',
        [userId],
        (err, user) => {
          if (err) {
            return res.status(500).json({
              success: false,
              error: 'Erro ao atualizar perfil'
            });
          }

          res.json({
            success: true,
            message: 'Perfil atualizado com sucesso',
            data: user
          });
        }
      );
    } catch (error) {
      console.error('❌ Erro ao atualizar perfil:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao atualizar perfil'
      });
    }
  }

  // Logout
  logout(req, res) {
    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
  }
}

module.exports = new AuthController();