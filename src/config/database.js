const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
  constructor() {
    this.db = null;
    this.dbPath = process.env.DATABASE_PATH || './database/customers.db';
    this.init();
  }

  init() {
    // Criar diretório do banco se não existir
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log('📁 Diretório do banco criado:', dbDir);
    }

    // Conectar ao banco
    this.db = new sqlite3.Database(this.dbPath, (err) => {
      if (err) {
        console.error('❌ Erro ao conectar com o banco:', err.message);
        process.exit(1);
      }
      console.log('✅ Conectado ao banco SQLite:', this.dbPath);
      this.createTables();
    });
  }

  createTables() {
    // Tabela de usuários
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        discord_id TEXT UNIQUE NOT NULL,
        username TEXT NOT NULL,
        discriminator TEXT,
        email TEXT,
        avatar TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Tabela de compras
    const createPurchasesTable = `
      CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        item TEXT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        status TEXT DEFAULT 'ativo' CHECK(status IN ('ativo', 'entregue', 'pendente', 'cancelado')),
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        download_url TEXT,
        notes TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `;

    // Tabela de tickets de suporte
    const createTicketsTable = `
      CREATE TABLE IF NOT EXISTS support_tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT DEFAULT 'aberto' CHECK(status IN ('aberto', 'em_andamento', 'fechado')),
        priority TEXT DEFAULT 'normal' CHECK(priority IN ('baixa', 'normal', 'alta', 'urgente')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `;

    // Tabela de mensagens dos tickets
    const createTicketMessagesTable = `
      CREATE TABLE IF NOT EXISTS ticket_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER NOT NULL,
        user_id INTEGER,
        message TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ticket_id) REFERENCES support_tickets (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
      )
    `;

    // Tabela de notificações
    const createNotificationsTable = `
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info' CHECK(type IN ('info', 'success', 'warning', 'error')),
        read BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `;

    // Executar criação das tabelas
    this.db.serialize(() => {
      this.db.run(createUsersTable, (err) => {
        if (err) console.error('❌ Erro ao criar tabela users:', err);
        else console.log('✅ Tabela users criada/verificada');
      });

      this.db.run(createPurchasesTable, (err) => {
        if (err) console.error('❌ Erro ao criar tabela purchases:', err);
        else console.log('✅ Tabela purchases criada/verificada');
      });

      this.db.run(createTicketsTable, (err) => {
        if (err) console.error('❌ Erro ao criar tabela support_tickets:', err);
        else console.log('✅ Tabela support_tickets criada/verificada');
      });

      this.db.run(createTicketMessagesTable, (err) => {
        if (err) console.error('❌ Erro ao criar tabela ticket_messages:', err);
        else console.log('✅ Tabela ticket_messages criada/verificada');
      });

      this.db.run(createNotificationsTable, (err) => {
        if (err) console.error('❌ Erro ao criar tabela notifications:', err);
        else console.log('✅ Tabela notifications criada/verificada');
      });

      console.log('🎉 Todas as tabelas foram criadas/verificadas com sucesso');
    });
  }

  getDB() {
    return this.db;
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('❌ Erro ao fechar banco:', err.message);
        } else {
          console.log('✅ Conexão com banco fechada');
        }
      });
    }
  }
}

const database = new Database();

module.exports = database;