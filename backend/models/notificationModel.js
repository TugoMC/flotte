const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        required: true
    },
    notificationType: {
        type: String,
        enum: ['document_expiry', 'payment_due', 'maintenance', 'system', 'payment_pending'],
        required: true
    },
    relatedDocument: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document'
    },
    expiryDate: {
        type: Date
    },
    daysUntilExpiry: {
        type: Number
    },
    isRead: {
        type: Boolean,
        default: false
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    }
}, {
    timestamps: true
});

// Index pour optimiser les requêtes
notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ notificationType: 1, isRead: 1 });
notificationSchema.index({ expiryDate: 1 });
notificationSchema.index({ user: 1, relatedDocument: 1, notificationType: 1 });
notificationSchema.index({ user: 1, 'additionalData.paymentId': 1, notificationType: 1 });

module.exports = mongoose.model('Notification', notificationSchema);