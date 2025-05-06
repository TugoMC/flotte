// scripts/changeUserRole.js
const mongoose = require('mongoose');
const User = require('../models/userModel');
require('dotenv').config();

const changeUserRole = async (username) => {
    try {
        // Se connecter à MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connecté à MongoDB');

        // Rechercher l'utilisateur par son nom d'utilisateur
        const user = await User.findOne({ username });

        if (!user) {
            console.error(`Utilisateur "${username}" non trouvé.`);
            return;
        }

        // Afficher les informations de l'utilisateur avant la modification
        console.log('Informations utilisateur avant modification:');
        console.log(`- ID: ${user._id}`);
        console.log(`- Nom: ${user.firstName} ${user.lastName}`);
        console.log(`- Email: ${user.email}`);
        console.log(`- Rôle actuel: ${user.role}`);

        // Changer le rôle en admin
        user.role = 'admin';
        await user.save();

        console.log('\nRôle modifié avec succès!');
        console.log(`L'utilisateur "${username}" est maintenant administrateur.`);

    } catch (error) {
        console.error('Erreur lors de la modification du rôle:', error.message);
    } finally {
        // Fermer la connexion à MongoDB
        await mongoose.connection.close();
        console.log('Connexion à MongoDB fermée');
    }
};

// Récupérer le nom d'utilisateur depuis les arguments en ligne de commande
const username = process.argv[2];

if (!username) {
    console.error('Erreur: Veuillez fournir un nom d\'utilisateur.');
    console.log('Utilisation: node changeUserRole.js <nom_utilisateur>');
    process.exit(1);
}

// Exécuter la fonction
changeUserRole(username)
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Erreur non gérée:', err);
        process.exit(1);
    });

// Exemple d'utilisation :
// node changeUserRole.js <nom_utilisateur>

// node D:\Developpement_Web\ReactJs\flotte\backend\scripts\changeUserRole.js admin