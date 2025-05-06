// routes/vehicleRoutes.js
const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const { protect } = require('../middlewares/authMiddleware');
const { manager } = require('../middlewares/roleMiddleware');
const { uploadSingleFile, processUploadedFile } = require('../services/mediaUploadService');

// Routes spécifiques (doivent être avant les routes paramétrées)
router.get('/available', protect, vehicleController.getAvailable);
router.get('/status/:status', protect, vehicleController.getByStatus);

// Routes standard avec ID
router.get('/', protect, vehicleController.getAll);
router.get('/:id', protect, vehicleController.getById);


// Routes pour créer/modifier/supprimer (réservées aux managers/admin)
router.post('/', protect, manager, vehicleController.create);
router.post('/:id/media', protect, manager, uploadSingleFile, processUploadedFile, vehicleController.uploadMedia);
router.put('/:id', protect, manager, vehicleController.update);
router.delete('/:id', protect, manager, vehicleController.delete);

// Routes avancées
router.put('/:id/target', protect, manager, vehicleController.setDailyTarget);
router.put('/:id/status', protect, manager, vehicleController.changeStatus);
router.put('/:id/assign-driver', protect, manager, vehicleController.assignDriver);
router.put('/:id/release-driver', protect, manager, vehicleController.releaseDriver);

module.exports = router;