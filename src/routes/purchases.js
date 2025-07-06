const express = require('express');
const purchaseController = require('../controllers/purchaseController');
const authMiddleware = require('../middleware/auth');
const apiSecretAuth = require('../middleware/apiSecretAuth');

const router = express.Router();

// Rotas protegidas por JWT (usuário logado)
router.get('/my', authMiddleware, purchaseController.getMyPurchases);
router.get('/stats', authMiddleware, purchaseController.getStats);
router.get('/:id', authMiddleware, purchaseController.getPurchaseDetails);

// CORRIGIDO: Rotas para integração (protegidas por API_SECRET)
router.post('/create', apiSecretAuth, purchaseController.createPurchase);

module.exports = router;