const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    navbarTitle: {
        type: String,
        default: 'Gestion de Flotte'
    },
    sidebarTitle: {
        type: String,
        default: 'Gestion de Flotte'
    }
});

module.exports = mongoose.model('Settings', settingsSchema);