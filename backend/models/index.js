// models/index.js
// This file ensures that models are loaded in the correct order

// Import models in correct order to avoid dependency issues
const Media = require('./mediaModel');
const User = require('./userModel');  // Adjust this if your user model has a different name
const Driver = require('./driverModel');
const Vehicle = require('./vehicleModel');
const Schedule = require('./scheduleModel');
const Payment = require('./paymentModel');
const Expense = require('./expenseModel'); // If you have this model

// Export all models for convenience
module.exports = {
    Media,
    User,
    Driver,
    Vehicle,
    Schedule,
    Payment,
    Expense
};