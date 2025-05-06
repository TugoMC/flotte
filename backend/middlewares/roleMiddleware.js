// middleware/roleMiddleware.js
exports.admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Non autorisé, accès administrateur requis' });
    }
};

exports.manager = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'manager')) {
        next();
    } else {
        res.status(403).json({ message: 'Non autorisé, accès manager ou administrateur requis' });
    }
};

exports.driver = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'manager' || req.user.role === 'driver')) {
        next();
    } else {
        res.status(403).json({ message: 'Non autorisé' });
    }
};