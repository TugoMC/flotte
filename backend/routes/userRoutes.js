// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');
const { admin } = require('../middlewares/roleMiddleware');

// Routes publiques
router.post('/register', userController.register);
router.post('/login', userController.login);

// Routes protégées
router.post('/logout', protect, userController.logout);
router.get('/verify-token', protect, userController.verifyToken);

router.route('/me')
    .get(protect, userController.getUserProfile)
    .put(protect, userController.updateUserProfile);

// Routes admin uniquement
router.route('/')
    .get(protect, admin, userController.getUsers);

router.route('/:id')
    .delete(protect, admin, userController.deleteUser)
    .put(protect, admin, userController.updateUserRole);

module.exports = router;