// models/maintenanceModel.js
const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true
    },
    maintenanceType: {
        type: String,
        enum: ['oil_change', 'tire_replacement', 'engine', 'other'],
        required: true
    },
    maintenanceNature: {
        type: String,
        enum: ['preventive', 'corrective'],
        required: true
    },
    cost: {
        type: Number,
        default: 0
    },
    maintenanceDate: {
        type: Date,
        default: Date.now
    },
    duration: {
        type: Number,  // Durée d'immobilisation en jours
        default: 0
    },
    mileage: {
        type: Number,  // Kilométrage au moment de la maintenance
    },
    description: {
        type: String
    },
    completed: {
        type: Boolean,
        default: false
    },
    completionDate: {
        type: Date
    },
    technicianName: {
        type: String
    },
    notes: {
        type: String
    },
    photos: {
        type: [String],  // Tableau de chemins/URLs vers les photos
        default: []
    }
}, {
    timestamps: true
});

// Méthode pour calculer la fin prévue de la maintenance
maintenanceSchema.methods.getEstimatedCompletionDate = function () {
    if (!this.maintenanceDate || !this.duration) {
        return null;
    }
    const estimatedDate = new Date(this.maintenanceDate);
    estimatedDate.setDate(estimatedDate.getDate() + this.duration);
    return estimatedDate;
};

// Hook pre-save pour vérifier si la maintenance est terminée
maintenanceSchema.pre('save', function (next) {
    if (this.isModified('completed') && this.completed && !this.completionDate) {
        this.completionDate = new Date();
    }
    next();
});

module.exports = mongoose.model('Maintenance', maintenanceSchema);