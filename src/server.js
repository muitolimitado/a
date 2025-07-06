require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

// Importar rotas
const authRoutes = require('./routes/auth');
const purchaseRoutes = require('./routes/purchases');
const supportRoutes = require('./routes/support');
const notificationRoutes = require('./routes/notifications');
const userRoutes = require('./routes/users');

// Validar variáveis de ambiente
const requiredEnvVars = [
  'DISCORD_CLIENT_ID',
  'DISCORD_CLIENT_SECRET',
  'DISCORD_REDIRECT_URI',
  'JWT_SECRET',
  'FRONTEND_URL',
  'API_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  console.error('❌ Variáveis de ambiente obrigatórias não configuradas:');
  missingEnvVars.forEach(envVar => console.error(`   - ${envVar}`));
  console.error('\n📝 Configure o arquivo .env baseado no .env.example');
  process.exit(1);
}

// Verificar configurações do bot (opcionais mas recomendadas)
if (!process.env.DISCORD_BOT_TOKEN) {
  console.warn('⚠️ DISCORD_BOT_TOKEN não configurado - auto-join no servidor será desabilitado');
}

if (!process.env.DISCORD_GUILD_ID) {
  console.warn('⚠️ DISCORD_GUILD_ID não configurado - auto-join no servidor será desabilitado');
}

// Log da configuração da API_SECRET
console.log('🔧 [CONFIG] API_SECRET configurado:', process.env.API_SECRET ? process.env.API_SECRET.substring(0, 20) + '...' : 'UNDEFINED');

const app = express();
const PORT = process.env.PORT || 3002;

// Middlewares de segurança
app.use(helmet());

// CORS
app.use(cors({
  origin: [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP por janela
  message: {
    error: 'Muitas requisições. Tente novamente em 15 minutos.'
  }
});
app.use('/api/', limiter);

// Logging
app.use(morgan('combined', {
  stream: {
    write: (message) => console.log(message.trim())
  }
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rotas
app.use('/auth', authRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/user', userRoutes);

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: 'Hype Store - Customer Area API',
    version: '1.0.0',
    status: 'online',
    features: {
      discord_oauth: true,
      auto_join: !!(process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_GUILD_ID),
      guild_id: process.env.DISCORD_GUILD_ID ? 'Configurado' : 'Não configurado',
      api_secret_configured: !!process.env.API_SECRET
    },
    endpoints: {
      'GET /auth/login': 'Iniciar login com Discord',
      'GET /auth/callback': 'Callback do Discord OAuth',
      'GET /auth/me': 'Dados do usuário autenticado',
      'GET /api/purchases/my': 'Minhas compras',
      'GET /api/purchases/stats': 'Estatísticas das compras',
      'GET /api/support/tickets': 'Meus tickets de suporte',
      'GET /api/notifications': 'Minhas notificações',
      'GET /api/user/by-discord-id/:discordId': 'Buscar usuário por Discord ID (API_SECRET)',
      'POST /api/purchases/create': 'Criar compra (API_SECRET)',
      'POST /api/notifications/create': 'Criar notificação (API_SECRET)'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    discord_config: {
      oauth_configured: !!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET),
      bot_configured: !!process.env.DISCORD_BOT_TOKEN,
      guild_configured: !!process.env.DISCORD_GUILD_ID,
      auto_join_enabled: !!(process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_GUILD_ID)
    },
    api_config: {
      api_secret_configured: !!process.env.API_SECRET,
      api_secret_preview: process.env.API_SECRET ? process.env.API_SECRET.substring(0, 10) + '...' : 'NOT_SET'
    }
  });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('❌ Erro na aplicação:', err);
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado'
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada',
    message: `A rota ${req.originalUrl} não existe`
  });
});

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log('\n🚀 ===== HYPE STORE CUSTOMER BACKEND =====');
  console.log(`🌐 Servidor rodando na porta ${PORT}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`🔐 Discord OAuth configurado: ${!!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET)}`);
  console.log(`🔑 API_SECRET configurado: ${!!process.env.API_SECRET}`);
  
  if (process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_GUILD_ID) {
    console.log(`🤖 Auto-join habilitado para servidor: ${process.env.DISCORD_GUILD_ID}`);
  } else {
    console.log(`⚠️ Auto-join desabilitado - configure DISCORD_BOT_TOKEN e DISCORD_GUILD_ID`);
  }
  
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔑 Login URL: http://localhost:${PORT}/auth/login`);
  console.log('==========================================\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM recebido. Encerrando servidor...');
  server.close(() => {
    console.log('Servidor encerrado.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT recebido. Encerrando servidor...');
  server.close(() => {
    console.log('Servidor encerrado.');
    process.exit(0);
  });
});

module.exports = app;