// routes/maintenanceRoutes.js
const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');
const { protect } = require('../middlewares/authMiddleware');
const { manager } = require('../middlewares/roleMiddleware');
const { uploadMultipleFiles } = require('../services/fileUploadService');

// Routes statistiques et de validation (placées avant les routes paramétrées)
router.get('/stats', protect, manager, maintenanceController.getStats);
router.get('/check-status', protect, manager, maintenanceController.checkStatusConsistency);
router.get('/validate-dates', protect, manager, maintenanceController.validateDates);
router.get('/daily-costs', protect, manager, maintenanceController.getDailyMaintenanceCosts);

// Routes par véhicule et par type
router.get('/vehicle/:vehicleId', protect, maintenanceController.getByVehicle);
router.get('/type/:type', protect, maintenanceController.getByType);

// Routes standard CRUD
router.get('/', protect, manager, maintenanceController.getAll);
router.get('/:id', protect, manager, maintenanceController.getById);
router.post('/', protect, manager, maintenanceController.create);
router.put('/:id', protect, manager, maintenanceController.update);
router.delete('/:id', protect, manager, maintenanceController.delete);

// Route pour marquer une maintenance comme terminée
router.put('/:id/complete', protect, manager, maintenanceController.completeMaintenance);

// Routes pour la gestion des photos
router.post('/:id/photos', protect, manager, uploadMultipleFiles, maintenanceController.uploadPhotos);
router.delete('/:id/photos/:photoIndex', protect, manager, maintenanceController.deletePhoto);

module.exports = router;