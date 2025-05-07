// utils/setupUploadDirs.js
const fs = require('fs');
const path = require('path');

/**
 * Crée les répertoires nécessaires pour les téléchargements de fichiers
 */
function setupUploadDirectories() {
    const uploadDirs = [
        'uploads',
        'uploads/vehicles',
        'uploads/drivers',
        'uploads/users',
        'uploads/documents',
        'uploads/other'
    ];

    uploadDirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            console.log(`Création du répertoire: ${dir}`);
            fs.mkdirSync(dir, { recursive: true });
        }
    });

    console.log('Répertoires de téléchargement configurés avec succès.');
}

module.exports = setupUploadDirectories;