// models/companyProfileModel.js
const mongoose = require('mongoose');

const companyProfileSchema = new mongoose.Schema({
    companyName: {
        type: String,
        required: true
    },
    logoUrl: {
        type: String
    },
    primaryColor: {
        type: String,
        default: '#2E86C1'
    },
    settings: {
        enableCarburantTracking: {
            type: Boolean,
            default: true
        },
        enableMaintenanceTracking: {
            type: Boolean,
            default: true
        },
        enableDocumentTracking: {
            type: Boolean,
            default: true
        },
        enableCumulativeReceipts: {
            type: Boolean,
            default: true
        },
        enableDetailedExpenses: {
            type: Boolean,
            default: true
        }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('CompanyProfile', companyProfileSchema);