const apiSecretAuth = (req, res, next) => {
  try {
    console.log('🔍 [API SECRET AUTH] Verificando autenticação...');
    console.log('🔍 [API SECRET AUTH] Headers recebidos:', {
      authorization: req.headers.authorization ? 'Presente' : 'Ausente',
      contentType: req.headers['content-type'],
      userAgent: req.headers['user-agent'],
      origin: req.headers.origin
    });
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [API SECRET AUTH] Header Authorization inválido ou ausente');
      console.log('🔍 [API SECRET AUTH] Header recebido:', authHeader);
      return res.status(401).json({
        success: false,
        error: 'Token de autorização necessário',
        details: 'Header Authorization deve estar no formato: Bearer <token>'
      });
    }
    
    const token = authHeader.substring(7); // Remove "Bearer "
    console.log('🔍 [API SECRET AUTH] Token recebido:', token.substring(0, 20) + '...');
    console.log('🔍 [API SECRET AUTH] Tamanho do token:', token.length);
    
    const expectedSecret = process.env.API_SECRET;
    console.log('🔍 [API SECRET AUTH] API_SECRET esperado:', expectedSecret ? expectedSecret.substring(0, 20) + '...' : 'UNDEFINED');
    console.log('🔍 [API SECRET AUTH] Tamanho do API_SECRET:', expectedSecret ? expectedSecret.length : 0);
    
    if (!expectedSecret) {
      console.error('❌ [API SECRET AUTH] API_SECRET não configurado no ambiente');
      return res.status(500).json({
        success: false,
        error: 'Configuração do servidor inválida',
        details: 'API_SECRET não está configurado'
      });
    }
    
    // Comparação detalhada caractere por caractere
    const tokensMatch = token === expectedSecret;
    console.log('🔍 [API SECRET AUTH] Comparação detalhada:', {
      tokenLength: token.length,
      secretLength: expectedSecret.length,
      tokensMatch,
      tokenStart: token.substring(0, 15),
      secretStart: expectedSecret.substring(0, 15),
      tokenEnd: token.substring(token.length - 10),
      secretEnd: expectedSecret.substring(expectedSecret.length - 10)
    });
    
    // Verificar caractere por caractere para debug
    if (!tokensMatch) {
      console.log('🔍 [API SECRET AUTH] Análise caractere por caractere:');
      const minLength = Math.min(token.length, expectedSecret.length);
      for (let i = 0; i < minLength; i++) {
        if (token[i] !== expectedSecret[i]) {
          console.log(`❌ Diferença na posição ${i}: token='${token[i]}' vs secret='${expectedSecret[i]}'`);
          break;
        }
      }
      
      console.warn('⚠️ [API SECRET AUTH] Token inválido:', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        tokenReceived: token.substring(0, 20) + '...',
        expectedToken: expectedSecret.substring(0, 20) + '...',
        lengthMatch: token.length === expectedSecret.length,
        method: req.method,
        url: req.url
      });
      
      return res.status(403).json({
        success: false,
        error: 'Token inválido',
        details: 'O token fornecido não corresponde ao esperado',
        debug: {
          tokenLength: token.length,
          expectedLength: expectedSecret.length,
          lengthMatch: token.length === expectedSecret.length
        }
      });
    }
    
    console.log('✅ [API SECRET AUTH] Token válido, prosseguindo...');
    next();
  } catch (error) {
    console.error('❌ [API SECRET AUTH] Erro interno:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
};

module.exports = apiSecretAuth;