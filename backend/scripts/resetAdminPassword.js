// scripts/resetAdminPassword.js
const mongoose = require('mongoose');
const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const resetAdminPassword = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connecté à MongoDB');

        const admin = await User.findOne({ username: 'admin' });
        if (!admin) {
            console.log('Administrateur non trouvé');
            return;
        }

        // Hashage du nouveau mot de passe
        const newPassword = 'admin123';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Mise à jour du mot de passe
        admin.password = hashedPassword;
        await admin.save();

        console.log('Mot de passe admin réinitialisé avec succès');

    } catch (error) {
        console.error('Erreur:', error);
    } finally {
        mongoose.connection.close();
    }
};

resetAdminPassword();