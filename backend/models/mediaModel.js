// models/mediaModel.js
const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
    entityType: {
        type: String,
        enum: ['driver', 'vehicle', 'payment', 'expense'],
        required: true
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    mediaUrl: {
        type: String,
        required: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Media', mediaSchema);