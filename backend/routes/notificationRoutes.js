const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middlewares/authMiddleware');
const { manager, admin } = require('../middlewares/roleMiddleware');

// Routes pour les notifications
router.get('/', protect, notificationController.getNotifications);
router.put('/:id/read', protect, notificationController.markAsRead);
router.put('/read-all', protect, notificationController.markAllAsRead);

// Route admin pour déclencher manuellement la vérification des documents expirants
router.post('/check-expiring', protect, admin, notificationController.checkExpiringDocuments);
router.post('/check-pending-payments', protect, admin, notificationController.checkPendingPayments);

module.exports = router;