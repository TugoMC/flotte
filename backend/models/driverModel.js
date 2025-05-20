// models/driverModel.js
const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        required: true
    },
    licenseNumber: {
        type: String,
        required: true,
        unique: true
    },
    hireDate: {
        type: Date,
        required: true
    },
    departureDate: {
        type: Date,
        default: null
    },
    photos: {
        type: [String],  // Tableau de chemins/URLs vers les photos
        default: []
    },
    currentVehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        default: null
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    assignedSchedules: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Schedule'
    }],
    completedSchedules: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Schedule'
    }],
    ratings: {
        type: Number,
        default: 0
    },
}, {
    timestamps: true
});

module.exports = mongoose.model('Driver', driverSchema);