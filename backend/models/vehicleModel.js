// models/vehicleModel.js
const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['taxi', 'moto'],
        required: true
    },
    licensePlate: {
        type: String,
        required: true,
        unique: true
    },
    brand: {
        type: String,
        required: true
    },
    model: {
        type: String,
        required: true
    },
    registrationDate: {
        type: Date,
        required: true
    },
    serviceEntryDate: {  // Ajout de la date d'entrée en service
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'maintenance'],
        default: 'active'
    },
    photos: {
        type: [String],  // Tableau de chemins/URLs vers les photos
        default: []
    },
    currentDriver: {  // Ajout d'une référence au chauffeur actuel
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        default: null
    },
    notes: String,
    dailyIncomeTarget: {  // Ajout de l'objectif de recette journalière
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Vehicle', vehicleSchema);