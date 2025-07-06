const express = require('express');
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/auth');
const apiSecretAuth = require('../middleware/apiSecretAuth');

const router = express.Router();

// Rotas protegidas por JWT (usuário logado)
router.get('/', authMiddleware, notificationController.getMyNotifications);
router.put('/:id/read', authMiddleware, notificationController.markAsRead);
router.put('/read-all', authMiddleware, notificationController.markAllAsRead);
router.delete('/:id', authMiddleware, notificationController.deleteNotification);

// Rotas para integração (protegidas por API_SECRET)
router.post('/create', apiSecretAuth, notificationController.createNotification);

module.exports = router;