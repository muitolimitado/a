// src/services/userService.js
const database = require('../config/database');

async function findUserByDiscordId(discordId) {
  return new Promise((resolve, reject) => {
    database.getDB().get(
      'SELECT * FROM users WHERE discord_id = ?',
      [discordId],
      (err, user) => {
        if (err) reject(err);
        else resolve(user);
      }
    );
  });
}

async function createUser(userData) {
  return new Promise((resolve, reject) => {
    database.getDB().run(
      'INSERT INTO users (discord_id, username, discriminator, email, avatar) VALUES (?, ?, ?, ?, ?)',
      [userData.discord_id, userData.username, userData.discriminator, userData.email, userData.avatar],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

async function updateUser(userId, userData) {
  return new Promise((resolve, reject) => {
    database.getDB().run(
      'UPDATE users SET username = ?, discriminator = ?, email = ?, avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [userData.username, userData.discriminator, userData.email, userData.avatar, userId],
      function(err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

async function createWelcomeNotification(userId, addedToServer) {
  return new Promise((resolve, reject) => {
    const message = addedToServer 
      ? 'Sua conta foi criada com sucesso! Você foi automaticamente adicionado ao nosso servidor Discord. Bem-vindo à Hype Store!'
      : 'Sua conta foi criada com sucesso! Entre no nosso Discord: discord.gg/hypestore';

    database.getDB().run(
      'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
      [userId, 'Bem-vindo à Hype Store!', message, 'success'],
      function(err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

module.exports = {
  findUserByDiscordId,
  createUser,
  updateUser,
  createWelcomeNotification
};