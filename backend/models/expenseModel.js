// models/expenseModel.js
const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    expenseType: {
        type: String,
        enum: ['fuel', 'maintenance', 'ticket', 'accident'],
        required: true
    },
    description: String,
    expenseDate: {
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

module.exports = mongoose.model('Expense', expenseSchema);