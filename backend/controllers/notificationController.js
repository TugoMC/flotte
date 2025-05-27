const NotificationService = require('../services/notificationService');

const notificationController = {
    getNotifications: async (req, res) => {
        try {
            const result = await NotificationService.getUserNotifications(req.user._id);
            if (!result.success) {
                return res.status(400).json({ message: result.error });
            }
            res.json(result.notifications);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    markAsRead: async (req, res) => {
        try {
            const result = await NotificationService.markAsRead(req.params.id);
            if (!result.success) {
                return res.status(400).json({ message: result.error });
            }
            res.json(result.notification);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    markAllAsRead: async (req, res) => {
        try {
            const result = await NotificationService.markAllAsRead(req.user._id);
            if (!result.success) {
                return res.status(400).json({ message: result.error });
            }
            res.json({ message: `${result.updatedCount} notifications marquées comme lues` });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    checkExpiringDocuments: async (req, res) => {
        try {
            const result = await NotificationService.checkExpiringDocuments();
            if (!result.success) {
                return res.status(400).json({ message: result.error });
            }
            res.json({ message: `${result.notificationsCreated} notifications créées` });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Ajoutez cette nouvelle méthode au controller
    checkPendingPayments: async (req, res) => {
        try {
            const result = await NotificationService.checkPendingPayments();
            if (!result.success) {
                return res.status(400).json({ message: result.error });
            }
            res.json({ message: `${result.notificationsCreated} notifications créées` });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};

module.exports = notificationController;