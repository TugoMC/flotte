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
    },
    affectedSchedules: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Schedule' }],

    isPlanned: { type: Boolean, default: false },
    planningConflictResolved: { type: Boolean, default: false },
    previousStatus: {
        type: String,
        enum: ['active', 'inactive', 'maintenance']
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Maintenance', maintenanceSchema);