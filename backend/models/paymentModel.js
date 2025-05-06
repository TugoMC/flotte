const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    schedule: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Schedule',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: [0, 'Le montant doit être positif ou nul']
    },
    paymentDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    paymentType: {
        type: String,
        enum: ['cash', 'mobile_money'],
        required: true
    },
    media: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media',
        default: null
    },
    comments: {
        type: String,
        default: ''
    },
    isMeetingTarget: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'rejected'],
        default: 'pending'
    }
}, {
    timestamps: true
});

// Index améliorés
paymentSchema.index({ schedule: 1, paymentDate: 1 });
paymentSchema.index({ paymentType: 1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);