// routes/driverRoutes.js
const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const { protect } = require('../middlewares/authMiddleware');
const { manager } = require('../middlewares/roleMiddleware');
const { uploadMultipleFiles } = require('../services/fileUploadService');

// Routes spécifiques
router.get('/available', protect, driverController.getAvailable);
router.get('/active', protect, driverController.getActive);
router.get('/former', protect, driverController.getFormer);

// Routes standard
router.get('/', protect, driverController.getAll);
router.get('/:id', protect, driverController.getById);

// Routes réservées aux managers/admin
router.post('/', protect, manager, driverController.create);
router.put('/:id', protect, manager, driverController.update);
router.delete('/:id', protect, manager, driverController.delete);

// Routes pour la gestion des photos
router.post('/:id/photos', protect, manager, uploadMultipleFiles, driverController.uploadPhotos);
router.delete('/:id/photos/:photoIndex', protect, manager, driverController.deletePhoto);

module.exports = router;