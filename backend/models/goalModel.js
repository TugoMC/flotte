// models/goalModel.js
const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true
    },
    targetAmount: {
        type: Number,
        required: true
    },
    periodType: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Goal', goalSchema);