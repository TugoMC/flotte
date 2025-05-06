// models/documentModel.js
const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle'
    },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver'
    },
    documentType: {
        type: String,
        enum: ['insurance', 'registration', 'license'],
        required: true
    },
    expiryDate: {
        type: Date,
        required: true
    },
    media: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media'
    }
}, {
    timestamps: true
});

// Validation : soit un véhicule soit un chauffeur doit être spécifié
documentSchema.pre('validate', function (next) {
    if (!this.vehicle && !this.driver) {
        this.invalidate('vehicle', 'Un véhicule ou un chauffeur doit être spécifié');
    }
    next();
});

module.exports = mongoose.model('Document', documentSchema);