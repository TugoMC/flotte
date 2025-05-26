// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

exports.protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];


            const decoded = jwt.verify(token, process.env.JWT_SECRET);


            req.user = await User.findById(decoded.id).select('-password');
            console.log('User found:', req.user);

            if (!req.user) {
                return res.status(401).json({ message: 'Non autorisé, utilisateur non trouvé' });
            }

            next();
        } catch (error) {
            console.error('Error in protect middleware:', error);
            return res.status(401).json({ message: 'Non autorisé, token invalide' });
        }
    } else {
        console.error('No token provided in request headers');
        return res.status(401).json({ message: 'Non autorisé, pas de token' });
    }
};