const Document = require('../models/documentModel');
const Notification = require('../models/notificationModel');
const User = require('../models/userModel');

class NotificationService {
    static MAX_NOTIFICATIONS_PER_USER = 50;

    // Mapping des types de documents vers leurs noms français
    static getDocumentTypeLabel(documentType) {
        const documentTypes = {
            'insurance': 'Assurance',
            'registration': 'Carte grise',
            'license': 'Permis de conduire',
            'contract': 'Contrat',
            'vtc_license': 'Licence VTC',
            'technical_inspection': 'Contrôle technique'
        };
        return documentTypes[documentType] || documentType;
    }

    // Obtenir le nom complet du chauffeur
    static getDriverFullName(driver) {
        if (!driver) return null;
        if (driver.firstName && driver.lastName) {
            return `${driver.firstName} ${driver.lastName}`;
        }
        return driver.name || driver._id;
    }

    // Fonction pour maintenir la limite de notifications par utilisateur
    static async maintainNotificationLimit(userId) {
        try {
            const notificationCount = await Notification.countDocuments({ user: userId });

            if (notificationCount >= this.MAX_NOTIFICATIONS_PER_USER) {
                const excessCount = notificationCount - this.MAX_NOTIFICATIONS_PER_USER + 1;

                // Récupérer les notifications les plus anciennes à supprimer
                const oldestNotifications = await Notification.find({ user: userId })
                    .sort({ createdAt: 1 })
                    .limit(excessCount)
                    .select('_id');

                const idsToDelete = oldestNotifications.map(n => n._id);

                // Supprimer les notifications les plus anciennes
                await Notification.deleteMany({ _id: { $in: idsToDelete } });

                console.log(`Supprimé ${excessCount} anciennes notifications pour l'utilisateur ${userId}`);
            }
        } catch (error) {
            console.error('Erreur lors du maintien de la limite de notifications:', error);
        }
    }

    // Fonction pour créer une notification avec gestion automatique de la limite
    static async createNotification(notificationData) {
        try {
            // Maintenir la limite avant de créer la nouvelle notification
            await this.maintainNotificationLimit(notificationData.user);

            // Créer la nouvelle notification
            const notification = await Notification.create(notificationData);
            return notification;
        } catch (error) {
            console.error('Erreur lors de la création de la notification:', error);
            throw error;
        }
    }

    static async checkExpiringDocuments() {
        try {
            // Trouver les documents qui expirent dans les 30 prochains jours
            const thresholdDate = new Date();
            thresholdDate.setDate(thresholdDate.getDate() + 30);

            const expiringDocuments = await Document.find({
                expiryDate: { $lte: thresholdDate },
                isCurrent: true
            }).populate('vehicle driver');

            // Trouver les administrateurs/managers qui doivent recevoir les notifications
            const adminUsers = await User.find({
                role: { $in: ['admin', 'manager'] }
            }).select('_id');

            let notificationsCreated = 0;
            let notificationsUpdated = 0;

            // Pour chaque document expirant, créer ou mettre à jour des notifications
            for (const doc of expiringDocuments) {
                const daysUntilExpiry = Math.ceil((doc.expiryDate - new Date()) / (1000 * 60 * 60 * 24));
                const documentTypeLabel = this.getDocumentTypeLabel(doc.documentType);

                // Créer un batch d'opérations pour tous les utilisateurs
                const bulkOps = adminUsers.map(user => {
                    let message;
                    let priority = 'medium';

                    if (daysUntilExpiry <= 0) {
                        message = `Le document "${documentTypeLabel}" est expiré`;
                        priority = 'high';
                    } else if (daysUntilExpiry <= 7) {
                        message = `Le document "${documentTypeLabel}" expire dans ${daysUntilExpiry} jour${daysUntilExpiry > 1 ? 's' : ''}`;
                        priority = 'high';
                    } else {
                        message = `Le document "${documentTypeLabel}" expire dans ${daysUntilExpiry} jours`;
                        priority = 'medium';
                    }

                    // Ajouter des détails spécifiques selon le type de document
                    if (doc.vehicle) {
                        message += ` pour le véhicule ${doc.vehicle.licensePlate || doc.vehicle._id}`;
                    } else if (doc.driver) {
                        const driverName = this.getDriverFullName(doc.driver);
                        message += ` pour le chauffeur ${driverName}`;
                    }

                    return {
                        updateOne: {
                            filter: {
                                user: user._id,
                                relatedDocument: doc._id,
                                notificationType: 'document_expiry'
                            },
                            update: {
                                $set: {
                                    message,
                                    priority,
                                    daysUntilExpiry,
                                    isRead: false,
                                    readAt: null,
                                    expiryDate: doc.expiryDate
                                },
                                $setOnInsert: {
                                    createdAt: new Date()
                                }
                            },
                            upsert: true
                        }
                    };
                });

                // Exécuter les opérations en batch
                if (bulkOps.length > 0) {
                    const result = await Notification.bulkWrite(bulkOps);
                    notificationsCreated += result.upsertedCount;
                    notificationsUpdated += result.modifiedCount;
                }
            }

            return {
                success: true,
                notificationsCreated,
                notificationsUpdated,
                documentsChecked: expiringDocuments.length
            };
        } catch (error) {
            console.error('Error in checkExpiringDocuments:', error);
            return { success: false, error: error.message };
        }
    }

    static async getUserNotifications(userId, limit = 50) {
        try {
            const notifications = await Notification.find({ user: userId })
                .sort({ createdAt: -1 })
                .limit(limit)
                .populate({
                    path: 'relatedDocument',
                    populate: [
                        { path: 'vehicle', select: 'licensePlate brand model' },
                        { path: 'driver', select: 'firstName lastName' }
                    ]
                });

            // Enrichir les notifications avec les informations formatées
            const enrichedNotifications = notifications.map(notification => {
                const notifObj = notification.toObject();

                if (notifObj.relatedDocument) {
                    notifObj.relatedDocument.documentTypeLabel = this.getDocumentTypeLabel(
                        notifObj.relatedDocument.documentType
                    );

                    if (notifObj.relatedDocument.driver) {
                        notifObj.relatedDocument.driverFullName = this.getDriverFullName(
                            notifObj.relatedDocument.driver
                        );
                    }
                }

                return notifObj;
            });

            return { success: true, notifications: enrichedNotifications };
        } catch (error) {
            console.error('Error in getUserNotifications:', error);
            return { success: false, error: error.message };
        }
    }

    static async markAsRead(notificationId) {
        try {
            const notification = await Notification.findByIdAndUpdate(
                notificationId,
                { isRead: true, readAt: new Date() },
                { new: true }
            );

            if (!notification) {
                return { success: false, error: 'Notification non trouvée' };
            }

            return { success: true, notification };
        } catch (error) {
            console.error('Error in markAsRead:', error);
            return { success: false, error: error.message };
        }
    }

    static async markAllAsRead(userId) {
        try {
            const result = await Notification.updateMany(
                { user: userId, isRead: false },
                {
                    $set: {
                        isRead: true,
                        readAt: new Date()
                    }
                }
            );

            return { success: true, updatedCount: result.modifiedCount };
        } catch (error) {
            console.error('Error in markAllAsRead:', error);
            return { success: false, error: error.message };
        }
    }

    static async getNotificationStats(userId) {
        try {
            const stats = await Notification.aggregate([
                { $match: { user: mongoose.Types.ObjectId(userId) } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        unread: {
                            $sum: {
                                $cond: [{ $eq: ['$isRead', false] }, 1, 0]
                            }
                        },
                        highPriority: {
                            $sum: {
                                $cond: [{ $eq: ['$priority', 'high'] }, 1, 0]
                            }
                        },
                        expired: {
                            $sum: {
                                $cond: [{ $lte: ['$daysUntilExpiry', 0] }, 1, 0]
                            }
                        }
                    }
                }
            ]);

            const result = stats[0] || {
                total: 0,
                unread: 0,
                highPriority: 0,
                expired: 0
            };

            return { success: true, stats: result };
        } catch (error) {
            console.error('Error in getNotificationStats:', error);
            return { success: false, error: error.message };
        }
    }

    // Fonction pour créer une notification générique (utilisée par d'autres services)
    static async createSystemNotification(userId, message, type = 'system', priority = 'medium', additionalData = {}) {
        try {
            const notificationData = {
                user: userId,
                message,
                notificationType: type,
                priority,
                ...additionalData
            };

            const notification = await this.createNotification(notificationData);
            return { success: true, notification };
        } catch (error) {
            console.error('Error in createSystemNotification:', error);
            return { success: false, error: error.message };
        }
    }

    static async checkPendingPayments() {
        try {
            const Payment = require('../models/paymentModel');
            const pendingPayments = await Payment.find({ status: 'pending' })
                .populate({
                    path: 'schedule',
                    populate: [
                        { path: 'driver', select: 'firstName lastName' },
                        { path: 'vehicle', select: 'licensePlate' }
                    ]
                });

            const adminUsers = await User.find({
                role: { $in: ['admin', 'manager'] }
            }).select('_id');

            let notificationsCreated = 0;
            let notificationsUpdated = 0;

            // Créer un batch d'opérations pour tous les paiements en attente
            const bulkOps = [];

            for (const payment of pendingPayments) {
                const hoursSinceCreation = Math.floor((new Date() - payment.createdAt) / (1000 * 60 * 60));

                // On crée une notification seulement si le paiement est en attente depuis plus d'1 heure
                if (hoursSinceCreation >= 1) {
                    const driverName = this.getDriverFullName(payment.schedule.driver);
                    const message = `Paiement en attente pour la course du ${payment.schedule.scheduleDate.toLocaleDateString()} (${driverName}, ${payment.schedule.vehicle.licensePlate})`;

                    // Ajouter une opération pour chaque admin
                    adminUsers.forEach(user => {
                        bulkOps.push({
                            updateOne: {
                                filter: {
                                    user: user._id,
                                    'additionalData.paymentId': payment._id,
                                    notificationType: 'payment_pending'
                                },
                                update: {
                                    $set: {
                                        message,
                                        priority: 'medium',
                                        isRead: false,
                                        readAt: null,
                                        additionalData: {
                                            paymentId: payment._id,
                                            scheduleId: payment.schedule._id
                                        }
                                    },
                                    $setOnInsert: {
                                        createdAt: new Date()
                                    }
                                },
                                upsert: true
                            }
                        });
                    });
                }
            }

            // Exécuter toutes les opérations en une seule requête
            if (bulkOps.length > 0) {
                const result = await Notification.bulkWrite(bulkOps);
                notificationsCreated = result.upsertedCount;
                notificationsUpdated = result.modifiedCount;
            }

            return {
                success: true,
                notificationsCreated,
                notificationsUpdated,
                paymentsChecked: pendingPayments.length
            };
        } catch (error) {
            console.error('Error in checkPendingPayments:', error);
            return { success: false, error: error.message };
        }
    }

    static startPaymentCheckCron() {
        // Vérifie toutes les heures
        setInterval(async () => {
            console.log('Vérification des paiements en attente...');
            await this.checkPendingPayments();
        }, 60 * 60 * 1000); // 1 heure
    }

    // Fonction utilitaire pour nettoyer les notifications en cas de problème
    static async cleanupExcessNotifications() {
        try {
            const users = await User.find({}, '_id');
            let totalCleaned = 0;

            for (const user of users) {
                const notificationCount = await Notification.countDocuments({ user: user._id });

                if (notificationCount > this.MAX_NOTIFICATIONS_PER_USER) {
                    const excessCount = notificationCount - this.MAX_NOTIFICATIONS_PER_USER;

                    const oldestNotifications = await Notification.find({ user: user._id })
                        .sort({ createdAt: 1 })
                        .limit(excessCount)
                        .select('_id');

                    const idsToDelete = oldestNotifications.map(n => n._id);

                    await Notification.deleteMany({ _id: { $in: idsToDelete } });
                    totalCleaned += excessCount;
                }
            }

            return { success: true, totalCleaned };
        } catch (error) {
            console.error('Error in cleanupExcessNotifications:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = NotificationService;