const database = require('../config/database');

class NotificationController {
  // Listar notificações do usuário
  getMyNotifications(req, res) {
    const userId = req.user.id;
    const { page = 1, limit = 20, unread_only = false } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    let params = [userId];

    if (unread_only === 'true') {
      query += ' AND read = FALSE';
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    database.getDB().all(query, params, (err, notifications) => {
      if (err) {
        console.error('❌ Erro ao buscar notificações:', err);
        return res.status(500).json({
          success: false,
          error: 'Erro interno do servidor'
        });
      }

      // Contar notificações não lidas
      database.getDB().get(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = FALSE',
        [userId],
        (err, unreadResult) => {
          if (err) {
            console.error('❌ Erro ao contar notificações não lidas:', err);
          }

          res.json({
            success: true,
            data: {
              notifications,
              unread_count: unreadResult ? unreadResult.count : 0
            }
          });
        }
      );
    });
  }

  // Marcar notificação como lida
  markAsRead(req, res) {
    const userId = req.user.id;
    const notificationId = req.params.id;

    database.getDB().run(
      'UPDATE notifications SET read = TRUE WHERE id = ? AND user_id = ?',
      [notificationId, userId],
      function(err) {
        if (err) {
          console.error('❌ Erro ao marcar notificação como lida:', err);
          return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
          });
        }

        if (this.changes === 0) {
          return res.status(404).json({
            success: false,
            error: 'Notificação não encontrada'
          });
        }

        res.json({
          success: true,
          message: 'Notificação marcada como lida'
        });
      }
    );
  }

  // Marcar todas as notificações como lidas
  markAllAsRead(req, res) {
    const userId = req.user.id;

    database.getDB().run(
      'UPDATE notifications SET read = TRUE WHERE user_id = ? AND read = FALSE',
      [userId],
      function(err) {
        if (err) {
          console.error('❌ Erro ao marcar todas as notificações como lidas:', err);
          return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
          });
        }

        res.json({
          success: true,
          message: `${this.changes} notificações marcadas como lidas`
        });
      }
    );
  }

  // Deletar notificação
  deleteNotification(req, res) {
    const userId = req.user.id;
    const notificationId = req.params.id;

    database.getDB().run(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, userId],
      function(err) {
        if (err) {
          console.error('❌ Erro ao deletar notificação:', err);
          return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
          });
        }

        if (this.changes === 0) {
          return res.status(404).json({
            success: false,
            error: 'Notificação não encontrada'
          });
        }

        res.json({
          success: true,
          message: 'Notificação deletada com sucesso'
        });
      }
    );
  }

  // NOVO: Criar notificação (para integração com webhook)
  createNotification(req, res) {
    const { user_id, title, message, type = 'info' } = req.body;

    if (!user_id || !title || !message) {
      return res.status(400).json({
        success: false,
        error: 'user_id, title e message são obrigatórios'
      });
    }

    database.getDB().run(
      'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
      [user_id, title, message, type],
      function(err) {
        if (err) {
          console.error('❌ Erro ao criar notificação:', err);
          return res.status(500).json({
            success: false,
            error: 'Erro ao criar notificação'
          });
        }

        console.log('✅ Notificação criada com ID:', this.lastID);

        res.status(201).json({
          success: true,
          message: 'Notificação criada com sucesso',
          data: { id: this.lastID }
        });
      }
    );
  }
}

module.exports = new NotificationController();