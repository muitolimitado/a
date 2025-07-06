const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Rotas públicas
router.get('/login', (req, res) => authController.login(req, res));
router.get('/callback', (req, res) => authController.callback(req, res));

// Rotas protegidas
router.get('/me', authMiddleware, (req, res) => authController.me(req, res));
router.put('/profile', authMiddleware, (req, res) => authController.updateProfile(req, res));
router.post('/logout', authMiddleware, (req, res) => authController.logout(req, res));

module.exports = router;