const database = require('../config/database');

class SupportController {
  // Listar tickets do usuário
  getMyTickets(req, res) {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM support_tickets WHERE user_id = ?';
    let params = [userId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    database.getDB().all(query, params, (err, tickets) => {
      if (err) {
        console.error('❌ Erro ao buscar tickets:', err);
        return res.status(500).json({
          success: false,
          error: 'Erro interno do servidor'
        });
      }

      res.json({
        success: true,
        data: tickets
      });
    });
  }

  // Criar novo ticket
  createTicket(req, res) {
    const userId = req.user.id;
    const { title, description, priority = 'normal' } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: 'Título e descrição são obrigatórios'
      });
    }

    database.getDB().run(
      'INSERT INTO support_tickets (user_id, title, description, priority) VALUES (?, ?, ?, ?)',
      [userId, title, description, priority],
      function(err) {
        if (err) {
          console.error('❌ Erro ao criar ticket:', err);
          return res.status(500).json({
            success: false,
            error: 'Erro ao criar ticket'
          });
        }

        const ticketId = this.lastID;

        // Adicionar mensagem inicial
        database.getDB().run(
          'INSERT INTO ticket_messages (ticket_id, user_id, message, is_admin) VALUES (?, ?, ?, ?)',
          [ticketId, userId, description, false],
          (err) => {
            if (err) {
              console.error('❌ Erro ao adicionar mensagem inicial:', err);
            }
          }
        );

        // Criar notificação
        database.getDB().run(
          'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
          [userId, 'Ticket Criado', `Seu ticket "${title}" foi criado com sucesso.`, 'info']
        );

        res.status(201).json({
          success: true,
          message: 'Ticket criado com sucesso',
          data: { id: ticketId }
        });
      }
    );
  }

  // Obter detalhes de um ticket
  getTicketDetails(req, res) {
    const userId = req.user.id;
    const ticketId = req.params.id;

    database.getDB().get(
      'SELECT * FROM support_tickets WHERE id = ? AND user_id = ?',
      [ticketId, userId],
      (err, ticket) => {
        if (err) {
          console.error('❌ Erro ao buscar ticket:', err);
          return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
          });
        }

        if (!ticket) {
          return res.status(404).json({
            success: false,
            error: 'Ticket não encontrado'
          });
        }

        // Buscar mensagens do ticket
        database.getDB().all(
          `SELECT tm.*, u.username, u.avatar 
           FROM ticket_messages tm 
           LEFT JOIN users u ON tm.user_id = u.id 
           WHERE tm.ticket_id = ? 
           ORDER BY tm.created_at ASC`,
          [ticketId],
          (err, messages) => {
            if (err) {
              console.error('❌ Erro ao buscar mensagens:', err);
              return res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
              });
            }

            res.json({
              success: true,
              data: {
                ticket,
                messages
              }
            });
          }
        );
      }
    );
  }

  // Adicionar mensagem ao ticket
  addMessage(req, res) {
    const userId = req.user.id;
    const ticketId = req.params.id;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Mensagem é obrigatória'
      });
    }

    // Verificar se o ticket pertence ao usuário
    database.getDB().get(
      'SELECT * FROM support_tickets WHERE id = ? AND user_id = ?',
      [ticketId, userId],
      (err, ticket) => {
        if (err || !ticket) {
          return res.status(404).json({
            success: false,
            error: 'Ticket não encontrado'
          });
        }

        // Adicionar mensagem
        database.getDB().run(
          'INSERT INTO ticket_messages (ticket_id, user_id, message, is_admin) VALUES (?, ?, ?, ?)',
          [ticketId, userId, message, false],
          function(err) {
            if (err) {
              console.error('❌ Erro ao adicionar mensagem:', err);
              return res.status(500).json({
                success: false,
                error: 'Erro ao adicionar mensagem'
              });
            }

            // Atualizar timestamp do ticket
            database.getDB().run(
              'UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [ticketId]
            );

            res.status(201).json({
              success: true,
              message: 'Mensagem adicionada com sucesso',
              data: { id: this.lastID }
            });
          }
        );
      }
    );
  }
}

module.exports = new SupportController();