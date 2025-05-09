// routes/historyRoutes.js
const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');
const { protect } = require('../middlewares/authMiddleware');
const { manager } = require('../middlewares/roleMiddleware');

/**
 * @swagger
 * tags:
 *   name: Historique
 *   description: Gestion de l'historique des activités
 */

/**
 * @swagger
 * /api/history:
 *   get:
 *     summary: Récupère tous les événements avec filtres
 *     tags: [Historique]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: module
 *         schema:
 *           type: string
 *           enum: [driver, vehicle, schedule, payment, maintenance]
 *         description: Filtre par module
 *       - in: query
 *         name: eventType
 *         schema:
 *           type: string
 *         description: Type d'événement (ex: vehicle_create)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Date de début pour le filtre
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Date de fin pour le filtre
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Nombre maximum d'événements à retourner
 *     responses:
 *       200:
 *         description: Liste des événements historiques
 *       500:
 *         description: Erreur serveur
 */
router.get('/history/', protect, historyController.getAll);

/**
 * @swagger
 * /api/history/entity/{id}:
 *   get:
 *     summary: Récupère l'historique d'une entité spécifique
 *     tags: [Historique]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'entité
 *     responses:
 *       200:
 *         description: Historique de l'entité
 *       404:
 *         description: Entité non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.get('/history/entity/:id', protect, historyController.getByEntity);

/**
 * @swagger
 * /api/history/stats:
 *   get:
 *     summary: Statistiques sur l'historique
 *     tags: [Historique]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques par module et type d'événement
 *       500:
 *         description: Erreur serveur
 */
router.get('/history/stats', protect, manager, historyController.getStats);

/**
 * @swagger
 * /api/history/recent:
 *   get:
 *     summary: Récupère les activités récentes (pour dashboard)
 *     tags: [Historique]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Nombre maximum d'événements à retourner
 *     responses:
 *       200:
 *         description: Liste des activités récentes formatées pour le dashboard
 *       500:
 *         description: Erreur serveur
 */
router.get('/history/recent', protect, historyController.getRecentActivities);

/**
 * @swagger
 * /api/history/recent/{module}:
 *   get:
 *     summary: Récupère les activités récentes d'un module spécifique
 *     tags: [Historique]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: module
 *         required: true
 *         schema:
 *           type: string
 *           enum: [driver, vehicle, schedule, payment, maintenance]
 *         description: Module à filtrer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Nombre maximum d'événements à retourner
 *     responses:
 *       200:
 *         description: Liste des activités récentes du module
 *       500:
 *         description: Erreur serveur
 */
router.get('/recent/:module', protect, historyController.getRecentActivities);

/**
 * @swagger
 * /api/history/filtered:
 *   get:
 *     summary: Récupère les activités avec filtres avancés
 *     tags: [Historique]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: modules
 *         schema:
 *           type: string
 *         description: Modules à inclure (séparés par des virgules)
 *       - in: query
 *         name: types
 *         schema:
 *           type: string
 *         description: Types d'événements à inclure (séparés par des virgules)
 *       - in: query
 *         name: users
 *         schema:
 *           type: string
 *         description: IDs des utilisateurs à filtrer (séparés par des virgules)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Nombre maximum d'événements à retourner
 *     responses:
 *       200:
 *         description: Liste des activités filtrées
 *       500:
 *         description: Erreur serveur
 */
router.get('/filtered', protect, historyController.getFiltered);

module.exports = router;