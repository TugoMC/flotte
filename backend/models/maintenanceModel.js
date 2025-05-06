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
    cost: {
        type: Number,
        required: true
    },
    maintenanceDate: {
        type: Date,
        required: true
    },
    description: String,
    media: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Maintenance', maintenanceSchema);