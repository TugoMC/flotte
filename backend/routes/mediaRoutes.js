// routes/mediaRoutes.js
const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');
const { protect } = require('../middlewares/authMiddleware');
const { manager } = require('../middlewares/roleMiddleware');

// IMPORTANT: L'ordre des routes est crucial en Express
// Les routes spécifiques doivent être placées avant les routes avec des paramètres dynamiques

// Route pour les statistiques
router.get('/stats', protect, manager, mediaController.getStats);

// Routes pour les entités
router.get('/entity-type/:entityType', protect, manager, mediaController.getByEntityType);
router.get('/entity/:entityType/:entityId', protect, manager, mediaController.getByEntity);

// Routes CRUD standard
router.get('/', protect, manager, mediaController.getAll);
router.post('/', protect, manager, mediaController.create);
router.get('/:id', protect, manager, mediaController.getById);
router.put('/:id', protect, manager, mediaController.update);
router.delete('/:id', protect, manager, mediaController.delete);

module.exports = router;