const database = require('../config/database');

class PurchaseController {
  // Listar compras do usuário
  async getMyPurchases(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10, status } = req.query;
      const offset = (page - 1) * limit;

      let query = 'SELECT * FROM purchases WHERE user_id = ?';
      let params = [userId];

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      query += ' ORDER BY date DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      database.getDB().all(query, params, (err, purchases) => {
        if (err) {
          console.error('❌ Erro ao buscar compras:', err);
          return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
          });
        }

        // Contar total de compras
        let countQuery = 'SELECT COUNT(*) as total FROM purchases WHERE user_id = ?';
        let countParams = [userId];

        if (status) {
          countQuery += ' AND status = ?';
          countParams.push(status);
        }

        database.getDB().get(countQuery, countParams, (err, countResult) => {
          if (err) {
            console.error('❌ Erro ao contar compras:', err);
            return res.status(500).json({
              success: false,
              error: 'Erro interno do servidor'
            });
          }

          res.json({
            success: true,
            data: {
              purchases,
              pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult.total,
                pages: Math.ceil(countResult.total / limit)
              }
            }
          });
        });
      });
    } catch (err) {
      console.error('❌ Erro ao buscar compras:', err);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Obter estatísticas das compras
  async getStats(req, res) {
    try {
      const userId = req.user.id;

      const queries = {
        totalPurchases: 'SELECT COUNT(*) as count FROM purchases WHERE user_id = ?',
        totalSpent: 'SELECT SUM(price) as total FROM purchases WHERE user_id = ?',
        activeProducts: 'SELECT COUNT(*) as count FROM purchases WHERE user_id = ? AND status IN ("ativo", "entregue")',
        recentPurchases: 'SELECT * FROM purchases WHERE user_id = ? ORDER BY date DESC LIMIT 5'
      };

      const stats = {};
      let completedQueries = 0;
      const totalQueries = Object.keys(queries).length;

      Object.entries(queries).forEach(([key, query]) => {
        database.getDB().all(query, [userId], (err, result) => {
          if (err) {
            console.error(`❌ Erro ao executar query ${key}:`, err);
            stats[key] = key === 'recentPurchases' ? [] : 0;
          } else {
            if (key === 'recentPurchases') {
              stats[key] = result;
            } else {
              stats[key] = result[0].count || result[0].total || 0;
            }
          }

          completedQueries++;
          if (completedQueries === totalQueries) {
            res.json({
              success: true,
              data: stats
            });
          }
        });
      });
    } catch (err) {
      console.error('❌ Erro ao calcular estatísticas:', err);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Obter detalhes de uma compra específica
  async getPurchaseDetails(req, res) {
    try {
      const userId = req.user.id;
      const purchaseId = req.params.id;

      database.getDB().get(
        'SELECT * FROM purchases WHERE id = ? AND user_id = ?',
        [purchaseId, userId],
        (err, purchase) => {
          if (err) {
            console.error('❌ Erro ao buscar compra:', err);
            return res.status(500).json({
              success: false,
              error: 'Erro interno do servidor'
            });
          }

          if (!purchase) {
            return res.status(404).json({
              success: false,
              error: 'Compra não encontrada'
            });
          }

          res.json({
            success: true,
            data: purchase
          });
        }
      );
    } catch (err) {
      console.error('❌ Erro ao buscar compra:', err);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // CORRIGIDO: Criar compra (para integração com webhook)
  createPurchase(req, res) {
    try {
      console.log('🛒 [PURCHASE CONTROLLER] Criando nova compra...');
      console.log('🛒 [PURCHASE CONTROLLER] Dados recebidos:', {
        user_id: req.body.user_id,
        item: req.body.item,
        price: req.body.price,
        status: req.body.status
      });

      const { user_id, item, price, status = 'entregue', download_url, notes } = req.body;

      if (!user_id || !item || !price) {
        console.log('❌ [PURCHASE CONTROLLER] Dados obrigatórios faltando');
        return res.status(400).json({
          success: false,
          error: 'user_id, item e price são obrigatórios'
        });
      }

      database.getDB().run(
        'INSERT INTO purchases (user_id, item, price, status, download_url, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [user_id, item, price, status, download_url, notes],
        function(err) {
          if (err) {
            console.error('❌ [PURCHASE CONTROLLER] Erro ao criar compra:', err);
            return res.status(500).json({
              success: false,
              error: 'Erro ao criar compra',
              details: err.message
            });
          }

          console.log('✅ [PURCHASE CONTROLLER] Compra criada com ID:', this.lastID);

          res.status(201).json({
            success: true,
            message: 'Compra criada com sucesso',
            data: { 
              id: this.lastID,
              user_id,
              item,
              price,
              status
            }
          });
        }
      );
    } catch (err) {
      console.error('❌ [PURCHASE CONTROLLER] Erro interno:', err);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        details: err.message
      });
    }
  }
}

module.exports = new PurchaseController();