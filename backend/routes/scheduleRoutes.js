// routes/scheduleRoutes.js
const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { protect } = require('../middlewares/authMiddleware');
const { manager } = require('../middlewares/roleMiddleware');

// Routes spécifiques
router.get('/current', protect, scheduleController.getCurrent);
router.get('/future', protect, scheduleController.getFuture);
router.get('/driver/:driverId', protect, scheduleController.getByDriver);
router.get('/vehicle/:vehicleId', protect, scheduleController.getByVehicle);
router.get('/date/:date', protect, scheduleController.getByDate);
router.get('/period', protect, scheduleController.getByPeriod);

// Route pour vérifier les plannings expirés manuellement
router.post('/check-expired', protect, manager, scheduleController.checkExpiredSchedules);

// Routes standard
router.get('/', protect, scheduleController.getAll);
router.get('/:id', protect, scheduleController.getById);

// Routes réservées aux managers/admin
router.post('/', protect, manager, scheduleController.create);
router.put('/:id', protect, manager, scheduleController.update);
router.delete('/:id', protect, manager, scheduleController.delete);
router.put('/:id/status', protect, manager, scheduleController.changeStatus);

module.exports = router;