// src/services/notificationService.js
import api from './api';

export const notificationService = {
    // Récupérer toutes les notifications de l'utilisateur
    getNotifications: () => api.get('/notifications'),

    // Marquer une notification comme lue
    markAsRead: (notificationId) => api.put(`/notifications/${notificationId}/read`),

    // Marquer toutes les notifications comme lues
    markAllAsRead: () => api.put('/notifications/read-all'),

    // Déclencher manuellement la vérification des documents expirants (admin uniquement)
    checkExpiringDocuments: () => api.post('/notifications/check-expiring'),

    // CORRECTION: Utiliser POST au lieu de GET
    checkPendingPayments: () => api.post('/notifications/check-pending-payments'),

    // Méthodes utilitaires pour filtrer les notifications côté client
    getUnreadNotifications: async () => {
        const response = await notificationService.getNotifications();
        return response.data.filter(notification => !notification.isRead);
    },

    getNotificationsByType: async (type) => {
        const response = await notificationService.getNotifications();
        return response.data.filter(notification => notification.notificationType === type);
    },

    getHighPriorityNotifications: async () => {
        const response = await notificationService.getNotifications();
        return response.data.filter(notification => notification.priority === 'high');
    },

    getDocumentExpiryNotifications: async () => {
        return notificationService.getNotificationsByType('document_expiry');
    },

    // AJOUT: Méthode spécifique pour les notifications de paiements en attente
    getPendingPaymentNotifications: async () => {
        return notificationService.getNotificationsByType('payment_pending');
    },

    // Compter les notifications non lues
    getUnreadCount: async () => {
        const unreadNotifications = await notificationService.getUnreadNotifications();
        return unreadNotifications.length;
    }
};