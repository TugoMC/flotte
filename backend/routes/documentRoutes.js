// routes/documentRoutes.js
const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { protect } = require('../middlewares/authMiddleware');
const { manager, admin } = require('../middlewares/roleMiddleware');
const { uploadMultipleFiles } = require('../services/fileUploadService');

// Routes publiques (nécessitent une authentification)
router.get('/', protect, documentController.getAll);
router.get('/expiring', protect, documentController.getExpiringDocuments);
router.get('/current', protect, documentController.getCurrentVersion);
router.get('/versions', protect, documentController.getVersionHistory);
router.get('/:id', protect, documentController.getById);

// Routes protégées (nécessitent le rôle manager/admin)
router.post(
    '/',
    protect,
    manager,
    uploadMultipleFiles,
    documentController.create
);
router.put('/:id', protect, manager, uploadMultipleFiles, documentController.update);
router.delete('/:id', protect, admin, documentController.delete);

// Routes pour les PDF
router.post(
    '/:id/pdf',
    protect,
    manager,
    uploadMultipleFiles,
    documentController.addPdf
);
router.delete('/:id/pdf/:pdfIndex', protect, admin, documentController.deletePdf);

// Route pour archiver
router.put('/:id/archive', protect, manager, documentController.archiveDocument);

module.exports = router;