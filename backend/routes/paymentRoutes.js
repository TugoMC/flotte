const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { uploadMultipleFiles } = require('../services/fileUploadService');
const { protect } = require('../middlewares/authMiddleware');
const { manager, driver } = require('../middlewares/roleMiddleware');

// Routes statistiques
router.get('/stats', paymentController.getStats);

router.get('/stats/daily', protect, manager, driver, paymentController.getDailyStats);
router.get('/stats/drivers', protect, manager, driver, paymentController.getDriverStats);
router.get('/stats/vehicles', protect, manager, paymentController.getVehicleStats);
router.get('/stats/daily-revenue', protect, manager, driver, paymentController.getDailyRevenue);

// Routes GET
router.get('/', protect, manager, paymentController.getAll);
router.get('/pending', protect, manager, paymentController.getPendingPayments);
router.get('/:id', protect, manager, paymentController.getById);
router.get('/schedule/:scheduleId', protect, manager, paymentController.getBySchedule);
router.get('/schedule/:scheduleId/pending', protect, manager, paymentController.getPendingPaymentsBySchedule);
router.get('/schedule/:scheduleId/missing', protect, manager, paymentController.getMissingPaymentsForSchedule);
// Modification pour permettre aux chauffeurs d'accéder à leurs propres données
router.get('/driver/:driverId', paymentController.getByDriver);
router.get('/vehicle/:vehicleId', protect, manager, paymentController.getByVehicle);
router.get('/date/:date', protect, manager, paymentController.getByDate);
router.get('/period', protect, manager, paymentController.getByPeriod);
router.get('/list/paginated', protect, manager, paymentController.getPaginatedPayments);



// Routes POST
router.post('/', protect, manager, paymentController.create);
router.post('/confirm-multiple', protect, manager, paymentController.confirmMultiplePayments);
router.post('/:id/status', protect, manager, paymentController.changeStatus);


// Routes pour la gestion des photos
router.post('/:id/photos', protect, manager, uploadMultipleFiles, paymentController.uploadPhotos);
router.delete('/:id/photos/:photoIndex', protect, manager, paymentController.deletePhoto);

// Routes PUT
router.put('/:id', protect, manager, paymentController.update);

// Routes DELETE
router.delete('/:id', protect, manager, paymentController.delete);

module.exports = router;