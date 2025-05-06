// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

exports.protect = async (req, res, next) => {
    let token;

    // Vérifier si le token existe dans les headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Récupérer le token depuis le header
            token = req.headers.authorization.split(' ')[1];

            // Vérifier le token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Récupérer l'utilisateur à partir du token
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ message: 'Non autorisé, utilisateur non trouvé' });
            }

            next();
        } catch (error) {
            console.error(error);
            return res.status(401).json({ message: 'Non autorisé, token invalide' });
        }
    } else {
        return res.status(401).json({ message: 'Non autorisé, pas de token' });
    }
};