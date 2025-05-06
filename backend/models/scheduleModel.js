// models/scheduleModel.js
const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        required: true
    },
    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true
    },
    scheduleDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date  // Peut être null pour une affectation indéfinie
    },
    shiftStart: {
        type: String,  // Format "HH:MM"
        required: false
    },
    shiftEnd: {
        type: String,  // Format "HH:MM"
        required: false
    },
    status: {
        type: String,
        enum: ['pending', 'assigned', 'completed', 'canceled'],
        default: 'assigned'
    },
    notes: {
        type: String
    }
}, {
    timestamps: true
});

// Index pour améliorer les performances des requêtes fréquentes
scheduleSchema.index({ driver: 1, scheduleDate: 1 });
scheduleSchema.index({ vehicle: 1, scheduleDate: 1 });
scheduleSchema.index({ status: 1 });

module.exports = mongoose.model('Schedule', scheduleSchema);