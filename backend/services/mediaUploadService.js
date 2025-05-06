// services/mediaUploadService.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Configuration du stockage des fichiers
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');

        // Créer le répertoire s'il n'existe pas
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Générer un nom de fichier unique
        const uniqueFilename = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueFilename);
    }
});

// Filtre pour restreindre les types de fichiers
const fileFilter = (req, file, cb) => {
    // Définir les types MIME autorisés
    const allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'image/webp'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Type de fichier non autorisé. Utilisez JPG, PNG, GIF, WEBP ou PDF.'), false);
    }
};

// Configuration de Multer
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // Limite à 5MB
    }
});

module.exports = {
    // Middleware pour le téléchargement d'un seul fichier
    uploadSingleFile: upload.single('media'),

    // Middleware pour le traitement après téléchargement
    processUploadedFile: (req, res, next) => {
        if (!req.file) {
            return res.status(400).json({ message: 'Aucun fichier n\'a été téléchargé' });
        }

        // Créer l'URL du fichier
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;

        // Ajouter l'URL à l'objet de requête pour le contrôleur
        req.body.mediaUrl = fileUrl;

        next();
    },

    // Fonction pour supprimer un fichier
    deleteFile: (fileUrl) => {
        try {
            if (!fileUrl) return;

            // Extraire le nom du fichier de l'URL
            const filename = fileUrl.split('/').pop();
            const filePath = path.join(__dirname, '../uploads', filename);

            // Vérifier si le fichier existe avant de le supprimer
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`Fichier supprimé: ${filePath}`);
            }
        } catch (error) {
            console.error('Erreur lors de la suppression du fichier:', error);
        }
    }
};