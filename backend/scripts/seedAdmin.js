// scripts/seedAdmin.js
const mongoose = require('mongoose');
const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const createDefaultAdmin = async () => {
    try {
        const adminExists = await User.findOne({ role: 'admin' });

        if (adminExists) {
            console.log('Un administrateur existe déjà dans la base de données');
            return;
        }

        const hashedPassword = await bcrypt.hash('admin123', 10);

        const newAdmin = new User({
            username: 'admin',
            password: hashedPassword,
            firstName: 'Admin',
            lastName: 'Système',
            email: 'admin@gestionflotte.com',
            role: 'admin',
            isActive: true,
        });

        await newAdmin.save();

        console.log('Administrateur par défaut créé avec succès');
        console.log('Identifiants: admin / admin123');
    } catch (error) {
        console.error('Erreur lors de la création de l\'administrateur par défaut:', error);
    }
};

// Connexion à MongoDB et exécution
const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connecté à MongoDB');

        await createDefaultAdmin();
    } catch (error) {
        console.error('Erreur de connexion à MongoDB:', error);
    } finally {
        mongoose.connection.close();
    }
};

run();
