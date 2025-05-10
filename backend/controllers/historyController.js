// controllers/historyController.js
const History = require('../models/historyModel');

// Récupérer tous les événements avec filtres
exports.getAll = async (req, res) => {
    try {
        const { module, eventType, startDate, endDate, limit = 100 } = req.query;

        const query = {};
        if (module) query.module = module;
        if (eventType) query.eventType = eventType;
        if (startDate || endDate) {
            query.eventDate = {};
            if (startDate) query.eventDate.$gte = new Date(startDate);
            if (endDate) query.eventDate.$lte = new Date(endDate);
        }

        const history = await History.find(query)
            .sort({ eventDate: -1 })
            .limit(parseInt(limit))
            .populate('performedBy', 'username email firstName lastName');

        res.json(history);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Récupérer l'historique d'une entité spécifique
exports.getByEntity = async (req, res) => {
    try {
        const { id } = req.params;
        const history = await History.find({ entityId: id })
            .sort({ eventDate: -1 })
            .populate('performedBy', 'username email firstName lastName');

        res.json(history);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Statistiques sur l'historique
exports.getStats = async (req, res) => {
    try {
        const stats = await History.aggregate([
            {
                $group: {
                    _id: {
                        module: "$module",
                        eventType: "$eventType"
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Récupérer les activités récentes pour le dashboard
exports.getRecentActivities = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const { module } = req.params;

        const query = {};
        if (module) query.module = module;

        const history = await History.find(query)
            .sort({ eventDate: -1 })
            .limit(limit)
            .populate('performedBy', 'username firstName lastName')
            .lean();

        // Formater pour le dashboard
        const formattedHistory = history.map(item => ({
            id: item._id,
            type: item.eventType,
            module: item.module,
            date: item.eventDate,
            user: item.performedBy ?
                `${item.performedBy.firstName} ${item.performedBy.lastName}` :
                'Système',
            description: this.getEventDescription(item),
            icon: this.getModuleIcon(item.module),
            entityId: item.entityId
        }));

        res.json(formattedHistory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Récupérer les activités filtrées (alternative avancée)
exports.getFiltered = async (req, res) => {
    try {
        const { modules, types, users, limit = 10 } = req.query;

        const query = {};
        if (modules) query.module = { $in: modules.split(',') };
        if (types) query.eventType = { $in: types.split(',') };
        if (users) query.performedBy = { $in: users.split(',') };

        const history = await History.find(query)
            .sort({ eventDate: -1 })
            .limit(parseInt(limit))
            .populate('performedBy', 'username firstName lastName')
            .lean();

        const formattedHistory = history.map(item => ({
            id: item._id,
            type: item.eventType,
            module: item.module,
            date: item.eventDate,
            user: item.performedBy ?
                `${item.performedBy.firstName} ${item.performedBy.lastName}` :
                'Système',
            description: this.getEventDescription(item),
            icon: this.getModuleIcon(item.module),
            entityId: item.entityId,
            metadata: item.metadata
        }));

        res.json(formattedHistory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Helper: Description lisible des événements
exports.getEventDescription = (item) => {
    if (item.description) return item.description;

    const actionMap = {
        create: 'Création',
        update: 'Modification',
        delete: 'Suppression',
        assign: 'Assignation',
        release: 'Libération',
        upload: 'Téléchargement',
        confirm: 'Confirmation',
        reject: 'Rejet',
        start: 'Début',
        end: 'Fin',
        change: 'Changement',
        status_change: 'Changement de statut'
    };

    const [module, action] = item.eventType.split('_');
    const readableAction = actionMap[action] || action;

    // Cas spécifique pour les véhicules
    if (module === 'vehicle') {
        let details = '';
        if (item.newData) {
            if (action === 'create') {
                details = `: ${item.newData.brand} ${item.newData.model} (${item.newData.licensePlate})`;
            } else if (action === 'update') {
                details = ` du véhicule ${item.oldData?.licensePlate || item.newData?.licensePlate || ''}`;
            } else if (action === 'status_change') {
                details = ` du véhicule ${item.newData.licensePlate} (${item.oldData?.status} → ${item.newData.status})`;
            } else if (action === 'delete') {
                details = ` du véhicule ${item.oldData?.licensePlate || ''}`;
            }
        }
        return `${readableAction}${details}`;
    }

    if (module === 'schedule') {
        let details = '';
        if (item.newData) {
            if (action === 'create') {
                const driverName = item.newData.driver
                    ? `${item.newData.driver.firstName} ${item.newData.driver.lastName}`
                    : 'Chauffeur inconnu';
                const vehicleInfo = item.newData.vehicle
                    ? `${item.newData.vehicle.brand} ${item.newData.vehicle.model} (${item.newData.vehicle.licensePlate})`
                    : 'Véhicule inconnu';
                details = ` pour ${driverName} avec ${vehicleInfo}`;
            } else if (action === 'update') {
                details = ` du planning #${item.entityId}`;
            } else if (action === 'status_change') {
                details = ` du planning #${item.entityId} (${item.oldData?.status} → ${item.newData.status})`;
            } else if (action === 'delete') {
                details = ` du planning #${item.entityId}`;
            }
        }
        return `${readableAction}${details}`;
    }

    return `${readableAction} ${this.getModuleName(module)}`;
};

// Helper: Nom lisible des modules
exports.getModuleName = (module) => {
    const modules = {
        vehicle: 'de véhicule',
        driver: 'de chauffeur',
        payment: 'de paiement',
        maintenance: 'de maintenance',
        schedule: 'de planning'
    };
    return modules[module] || module;
};

// Helper: Icônes pour le frontend
exports.getModuleIcon = (module) => {
    const icons = {
        vehicle: 'car',
        driver: 'user',
        payment: 'credit-card',
        maintenance: 'tools',
        schedule: 'calendar'
    };
    return icons[module] || 'activity';
};

// Récupérer les activités récentes avec plus de détails
exports.getDashboardActivities = async (req, res) => {
    try {
        const activities = await History.find()
            .sort({ eventDate: -1 })
            .limit(10)
            .populate('performedBy', 'username firstName lastName')
            .lean();

        const formatted = activities.map(item => ({
            id: item._id,
            type: item.eventType,
            module: item.module,
            date: item.eventDate,
            user: item.performedBy ?
                `${item.performedBy.firstName} ${item.performedBy.lastName}` :
                'Système',
            description: item.description || this.generateDescription(item),
            icon: this.getModuleIcon(item.module),
            entityId: item.entityId
        }));

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Helper pour générer des descriptions si non fournies
exports.generateDescription = (item) => {
    const actionMap = {
        create: 'Création',
        update: 'Modification',
        delete: 'Suppression',
        assign: 'Assignation',
        release: 'Libération'
    };

    const [module, action] = item.eventType.split('_');
    const readableAction = actionMap[action] || action;

    return `${readableAction} ${module}`;
};

// Helper pour les icônes
exports.getModuleIcon = (module) => {
    const icons = {
        driver: 'user',
        vehicle: 'car',
        schedule: 'calendar',
        payment: 'dollar',
        maintenance: 'wrench'
    };
    return icons[module] || 'activity';
};

exports.getFilteredActivities = async (req, res) => {
    try {
        const { modules, types, users, startDate, endDate } = req.query;

        const query = {};
        if (modules) query.module = { $in: modules.split(',') };
        if (types) query.eventType = { $in: types.split(',') };
        if (users) query.performedBy = { $in: users.split(',') };
        if (startDate || endDate) {
            query.eventDate = {};
            if (startDate) query.eventDate.$gte = new Date(startDate);
            if (endDate) query.eventDate.$lte = new Date(endDate);
        }

        const activities = await History.find(query)
            .sort({ eventDate: -1 })
            .populate('performedBy', 'username firstName lastName');

        res.json(activities);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};