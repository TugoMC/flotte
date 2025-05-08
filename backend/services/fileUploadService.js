// services/fileUploadService.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuration du stockage pour multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Destination en fonction du type de fichier
        let uploadDir;

        if (req.originalUrl.includes('/vehicles')) {
            uploadDir = 'uploads/vehicles/';
        } else if (req.originalUrl.includes('/drivers')) {
            uploadDir = 'uploads/drivers/';
        } else if (req.originalUrl.includes('/maintenance')) {
            uploadDir = 'uploads/maintenance/';
        } else {
            uploadDir = 'uploads/other/';
        }

        // Créer le répertoire s'il n'existe pas
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Renommer le fichier pour éviter les conflits de noms
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + extension);
    }
});

// Filtre pour n'accepter que certains types de fichiers
const fileFilter = (req, file, cb) => {
    // Accepter uniquement les images
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Type de fichier non supporté. Seules les images sont acceptées.'), false);
    }
};

// Configuration de base pour multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limite de taille
        files: 10 // Limiter à 10 fichiers maximum
    }
});

// Middleware pour télécharger un seul fichier
exports.uploadSingleFile = (req, res, next) => {
    const uploadSingle = upload.single('file');

    uploadSingle(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            // Erreur Multer lors du téléchargement
            return res.status(400).json({
                message: `Erreur de téléchargement: ${err.message}`
            });
        } else if (err) {
            // Autre type d'erreur
            return res.status(400).json({
                message: err.message
            });
        }

        // Tout s'est bien passé, passer au middleware suivant
        next();
    });
};

// Middleware pour télécharger plusieurs fichiers
exports.uploadMultipleFiles = (req, res, next) => {
    const uploadMultiple = upload.array('photos', 10); // 'photos' est le nom du champ, 10 est le maximum

    uploadMultiple(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            // Erreur Multer lors du téléchargement
            return res.status(400).json({
                message: `Erreur de téléchargement: ${err.message}`
            });
        } else if (err) {
            // Autre type d'erreur
            return res.status(400).json({
                message: err.message
            });
        }

        // Tout s'est bien passé, passer au middleware suivant
        next();
    });
};

// Middleware pour télécharger plusieurs champs différents
exports.uploadFields = (fields) => {
    return (req, res, next) => {
        const uploadFields = upload.fields(fields); // fields est un tableau d'objets { name, maxCount }

        uploadFields(req, res, function (err) {
            if (err instanceof multer.MulterError) {
                // Erreur Multer lors du téléchargement
                return res.status(400).json({
                    message: `Erreur de téléchargement: ${err.message}`
                });
            } else if (err) {
                // Autre type d'erreur
                return res.status(400).json({
                    message: err.message
                });
            }

            // Tout s'est bien passé, passer au middleware suivant
            next();
        });
    };
};

// Fonction utilitaire pour supprimer un fichier
exports.deleteFile = (filePath) => {
    return new Promise((resolve, reject) => {
        // Vérifier si le chemin commence par 'uploads/'
        if (!filePath.startsWith('uploads/')) {
            filePath = path.join('uploads', filePath);
        }

        fs.unlink(filePath, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(true);
            }
        });
    });
};