const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    navbarTitle: {
        type: String,
        default: 'Gestion de Flotte'
    },
    sidebarTitle: {
        type: String,
        default: 'Gestion de Flotte'
    },
    notificationSettings: {
        expirationAlerts: {
            type: Boolean,
            default: true
        },
        maintenanceAlerts: {
            type: Boolean,
            default: false
        },
        paymentAlerts: {
            type: Boolean,
            default: false
        },
        alertThreshold: {
            type: String,
            enum: ['7', '15', '30', '60'],
            default: '30'
        }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Settings', settingsSchema);