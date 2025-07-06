const express = require('express');
const supportController = require('../controllers/supportController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Todas as rotas são protegidas
router.use(authMiddleware);

router.get('/tickets', supportController.getMyTickets);
router.post('/tickets', supportController.createTicket);
router.get('/tickets/:id', supportController.getTicketDetails);
router.post('/tickets/:id/messages', supportController.addMessage);

module.exports = router;