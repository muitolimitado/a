const express = require('express');
const database = require('../config/database');
const apiSecretAuth = require('../middleware/apiSecretAuth');

const router = express.Router();

// Função para buscar usuário por Discord ID
const findUserByDiscordId = (discordId) => {
  return new Promise((resolve, reject) => {
    database.getDB().get(
      'SELECT * FROM users WHERE discord_id = ?',
      [discordId],
      (err, user) => {
        if (err) {
          console.error('❌ Erro ao buscar usuário:', err);
          reject(err);
        } else {
          resolve(user);
        }
      }
    );
  });
};

// Rota para buscar usuário por Discord ID (para integração com backend EFI Bank)
router.get('/by-discord-id/:discordId', apiSecretAuth, async (req, res) => {
  try {
    const { discordId } = req.params;
    
    console.log('🔍 [USER ROUTE] Buscando usuário por Discord ID:', discordId);
    
    if (!discordId) {
      console.log('❌ [USER ROUTE] Discord ID não fornecido');
      return res.status(400).json({
        success: false,
        error: 'Discord ID é obrigatório'
      });
    }

    // Validar formato do Discord ID
    if (!/^\d{17,19}$/.test(discordId)) {
      console.log('❌ [USER ROUTE] Discord ID com formato inválido:', discordId);
      return res.status(400).json({
        success: false,
        error: 'Discord ID deve ter entre 17-19 dígitos'
      });
    }

    const user = await findUserByDiscordId(discordId);
    
    if (!user) {
      console.log('❌ [USER ROUTE] Usuário não encontrado:', discordId);
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      });
    }

    console.log('✅ [USER ROUTE] Usuário encontrado:', { 
      id: user.id, 
      username: user.username,
      discord_id: user.discord_id 
    });

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('❌ [USER ROUTE] Erro ao buscar usuário por Discord ID:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

module.exports = router;