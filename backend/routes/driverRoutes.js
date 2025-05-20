// routes/driverRoutes.js
const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const { protect } = require('../middlewares/authMiddleware');
const { manager, driver, strictDriver } = require('../middlewares/roleMiddleware');
const { uploadMultipleFiles } = require('../services/fileUploadService');

// Routes spécifiques
router.get('/available', protect, driverController.getAvailable);
router.get('/active', protect, driverController.getActive);
router.get('/former', protect, driverController.getFormer);

router.post('/me/photos', protect, driver, uploadMultipleFiles, driverController.uploadMyPhotos);
router.delete('/me/photos/:photoIndex', protect, driver, driverController.deleteMyPhoto);

// Routes standard
router.get('/', protect, driverController.getAll);
router.get('/:id', protect, driverController.getById);

// Routes pour les chauffeurs (modification de leurs propres infos)
router.put('/me/update', protect, driver, driverController.updateDriverProfile);
router.put('/me/update-vehicle', protect, driver, driverController.updateDriverVehicle);

// Routes réservées aux managers/admin
router.post('/', protect, manager, driverController.create);
router.put('/:id', protect, manager, driverController.update);
router.delete('/:id', protect, manager, driverController.delete);

// Routes pour la gestion des photos
router.post('/:id/photos', uploadMultipleFiles, driverController.uploadPhotos);
router.delete('/:id/photos/:photoIndex', driverController.deletePhoto);



module.exports = router;