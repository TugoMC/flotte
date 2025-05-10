// routes/scheduleRoutes.js
const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { protect } = require('../middlewares/authMiddleware');
const { manager } = require('../middlewares/roleMiddleware');

// Routes spécifiques
router.get('/current', protect, manager, scheduleController.getCurrent);
router.get('/future', protect, manager, scheduleController.getFuture);
router.get('/driver/:driverId', protect, manager, scheduleController.getByDriver);
router.get('/vehicle/:vehicleId', protect, manager, scheduleController.getByVehicle);
router.get('/date/:date', protect, manager, scheduleController.getByDate);
router.get('/period', protect, manager, scheduleController.getByPeriod);
router.get('/', protect, manager, scheduleController.getAll);

// Route pour vérifier les plannings expirés manuellement
router.post('/check-expired', protect, manager, scheduleController.checkExpiredSchedules);

// Routes standard
router.post('/', protect, manager, scheduleController.create);
router.get('/:id', protect, manager, scheduleController.getById);

// Routes réservées aux managers/admin
router.post('/', protect, manager, scheduleController.create);
router.put('/:id', protect, manager, scheduleController.update);
router.delete('/:id', protect, manager, scheduleController.delete);
router.put('/:id/status', protect, manager, scheduleController.changeStatus);

module.exports = router;