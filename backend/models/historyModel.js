// models/historyModel.js
const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
    eventType: {
        type: String,
        required: true,
        enum: [
            // Document events
            'document_create', 'document_update', 'document_delete',
            'document_pdf_add', 'document_pdf_delete', 'document_archive',

            // Driver events
            'driver_create', 'driver_update', 'driver_delete', 'driver_status_change',
            'driver_vehicle_assign', 'driver_vehicle_release', 'driver_photo_upload', 'driver_photo_delete',

            // Vehicle events
            'vehicle_create', 'vehicle_update', 'vehicle_delete', 'vehicle_status_change',
            'vehicle_driver_assign', 'vehicle_driver_release', 'vehicle_photo_upload', 'vehicle_photo_delete',
            'vehicle_maintenance_start', 'vehicle_maintenance_end',

            // Schedule events
            'schedule_create', 'schedule_update', 'schedule_delete', 'schedule_status_change',

            // Payment events
            'payment_create', 'payment_update', 'payment_delete', 'payment_confirm', 'payment_reject',
            'payment_photo_upload', 'payment_photo_delete',

            // Maintenance events
            'maintenance_create', 'maintenance_update', 'maintenance_delete', 'maintenance_complete',
            'maintenance_photo_upload', 'maintenance_photo_delete',

            // System events
            'user_login', 'user_logout', 'system_backup', 'system_restore'
        ]
    },

    module: {
        type: String,
        required: true,
        enum: ['document', 'driver', 'vehicle', 'schedule', 'payment', 'maintenance', 'system']
    },

    // ID de l'entité concernée
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },

    // Données avant modification (pour les updates)
    oldData: {
        type: mongoose.Schema.Types.Mixed
    },

    // Données après modification
    newData: {
        type: mongoose.Schema.Types.Mixed
    },

    // Utilisateur qui a effectué l'action (si applicable)
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Date de l'événement
    eventDate: {
        type: Date,
        default: Date.now
    },

    // Description textuelle de l'événement
    description: {
        type: String
    },

    // IP de l'utilisateur (pour audit)
    ipAddress: {
        type: String
    },

    // Métadonnées supplémentaires
    metadata: {
        type: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true,
    // Index pour optimiser les requêtes fréquentes
    indexes: [
        { fields: { eventType: 1 } },
        { fields: { module: 1 } },
        { fields: { entityId: 1 } },
        { fields: { eventDate: -1 } },
        { fields: { performedBy: 1 } }
    ]
});

// Méthode pour formater une entrée d'historique lisible
historySchema.methods.toReadableFormat = function () {
    let message = '';
    const date = this.eventDate.toLocaleString();

    switch (this.eventType) {
        case 'driver_creation':
            message = `Nouveau chauffeur créé: ${this.newData.firstName} ${this.newData.lastName}`;
            break;
        case 'driver_update':
            message = `Chauffeur ${this.entityId} modifié`;
            break;
        case 'payment_confirmation':
            message = `Paiement confirmé pour le planning ${this.newData.schedule}`;
            break;
        // Ajouter d'autres cas selon les besoins
        default:
            message = `Événement ${this.eventType} sur ${this.module}`;
    }

    return `${date} - ${message}`;
};

module.exports = mongoose.model('History', historySchema);