const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middlewares/authMiddleware');
const { manager } = require('../middlewares/roleMiddleware');

// Routes pour les statistiques
router.get('/stats', protect, manager, paymentController.getStats);
router.get('/daily-stats', protect, manager, paymentController.getDailyStats);
router.get('/driver-stats', protect, manager, paymentController.getDriverStats);
router.get('/vehicle-stats', protect, manager, paymentController.getVehicleStats);

// Routes de filtrage
router.get('/driver/:driverId', protect, manager, paymentController.getByDriver);
router.get('/vehicle/:vehicleId', protect, manager, paymentController.getByVehicle);
router.get('/date/:date', protect, manager, paymentController.getByDate);
router.get('/period', protect, manager, paymentController.getByPeriod);
router.get('/schedule/:scheduleId/missing', protect, manager, paymentController.getMissingPaymentsForSchedule);

// Routes CRUD standard
router.get('/', protect, manager, paymentController.getAll);
router.get('/:id', protect, manager, paymentController.getById);
router.post('/', protect, manager, paymentController.create);
router.put('/:id', protect, manager, paymentController.update);
router.delete('/:id', protect, manager, paymentController.delete);

// Route spéciale pour changement de statut
router.patch('/:id/status', protect, manager, paymentController.changeStatus);

module.exports = router;