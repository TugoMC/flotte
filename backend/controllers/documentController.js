// controllers/documentController.js
const Document = require('../models/documentModel');
const Vehicle = require('../models/vehicleModel');
const Driver = require('../models/driverModel');
const History = require('../models/historyModel');
const { deleteFile } = require('../services/fileUploadService');
const { logHistory } = require('../helpers/historyHelper');

// Créer un nouveau document
exports.create = async (req, res) => {
    try {
        const { vehicle, driver, documentType, expiryDate } = req.body;

        // Validation des champs obligatoires
        if (!documentType || !expiryDate) {
            return res.status(400).json({ message: 'Le type de document et la date d\'expiration sont obligatoires' });
        }

        // Vérifier que le véhicule ou le chauffeur existe
        if (vehicle) {
            const vehicleExists = await Vehicle.findById(vehicle);
            if (!vehicleExists) {
                return res.status(404).json({ message: 'Véhicule non trouvé' });
            }
        }

        if (driver) {
            const driverExists = await Driver.findById(driver);
            if (!driverExists) {
                return res.status(404).json({ message: 'Chauffeur non trouvé' });
            }
        }

        // Archiver automatiquement l'ancien document courant s'il existe
        await archiveExistingCurrentDocument({ vehicle, driver, documentType });

        // Calculer le numéro de version
        const lastVersion = await getLatestVersion({ vehicle, driver, documentType });

        // Récupérer correctement les chemins des fichiers
        const pdfPaths = req.files ? req.files.map(file => file.path) : [];

        const document = new Document({
            ...req.body,
            pdf: pdfPaths,
            version: lastVersion + 1,
            isCurrent: true
        });

        const savedDocument = await document.save();

        // Historique
        await logHistory({
            eventType: 'document_create',
            module: 'document',
            entityId: savedDocument._id,
            newData: savedDocument.toObject(),
            performedBy: req.user?._id,
            description: `Création d'un document ${savedDocument.documentType} ${vehicle ? 'pour véhicule' : 'pour chauffeur'} (version ${savedDocument.version})`,
            ipAddress: req.ip
        });

        res.status(201).json(savedDocument);
    } catch (error) {
        // Nettoyer les fichiers uploadés en cas d'erreur
        if (req.files) {
            for (const file of req.files) {
                try {
                    await deleteFile(file.path);
                } catch (err) {
                    console.error(`Erreur lors du nettoyage du fichier ${file.path}:`, err);
                }
            }
        }
        res.status(400).json({ message: error.message });
    }
};

// Récupérer tous les documents
exports.getAll = async (req, res) => {
    try {
        const { vehicleId, driverId, documentType, includeArchived = false } = req.query;
        const query = {};

        if (vehicleId) query.vehicle = vehicleId;
        if (driverId) query.driver = driverId;
        if (documentType) query.documentType = documentType;

        // Par défaut, ne montrer que les documents courants
        if (includeArchived !== 'true') {
            query.isCurrent = true;
        }

        const documents = await Document.find(query)
            .populate('vehicle', 'licensePlate brand model')
            .populate('driver', 'firstName lastName licenseNumber')
            .sort({ createdAt: -1 });

        res.json(documents);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Récupérer un document par ID
exports.getById = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id)
            .populate('vehicle', 'licensePlate brand model')
            .populate('driver', 'firstName lastName licenseNumber');

        if (!document) {
            return res.status(404).json({ message: 'Document non trouvé' });
        }

        res.json(document);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Mettre à jour un document
exports.update = async (req, res) => {
    try {
        const oldDocument = await Document.findById(req.params.id).lean();
        if (!oldDocument) {
            return res.status(404).json({ message: 'Document non trouvé' });
        }

        // Empêcher la modification des documents archivés
        if (!oldDocument.isCurrent) {
            return res.status(400).json({ message: 'Impossible de modifier un document archivé' });
        }

        // Vérifier les références si elles sont fournies
        if (req.body.vehicle) {
            const vehicleExists = await Vehicle.findById(req.body.vehicle);
            if (!vehicleExists) {
                return res.status(404).json({ message: 'Véhicule non trouvé' });
            }
        }

        if (req.body.driver) {
            const driverExists = await Driver.findById(req.body.driver);
            if (!driverExists) {
                return res.status(404).json({ message: 'Chauffeur non trouvé' });
            }
        }

        // Vérifier si le type de document change (validation spéciale)
        if (req.body.documentType && req.body.documentType !== oldDocument.documentType) {
            // Valider la nouvelle configuration
            const newConfig = {
                vehicle: req.body.vehicle || oldDocument.vehicle,
                driver: req.body.driver || oldDocument.driver,
                documentType: req.body.documentType
            };

            // Validation selon les nouvelles règles
            if (newConfig.documentType === 'contract') {
                if (!newConfig.vehicle || !newConfig.driver) {
                    return res.status(400).json({
                        message: 'Un contrat doit avoir un véhicule ET un chauffeur'
                    });
                }
            } else {
                if (newConfig.vehicle && newConfig.driver) {
                    return res.status(400).json({
                        message: 'Pour ce type de document, seul un véhicule OU un chauffeur doit être spécifié'
                    });
                }
            }
        }

        const updateData = { ...req.body };

        // Gestion des nouveaux fichiers
        if (req.files && req.files.length > 0) {
            updateData.pdf = [...oldDocument.pdf, ...req.files.map(file => file.path)];
        }

        // Incrémenter la version si des changements significatifs
        const significantFields = ['documentType', 'expiryDate', 'vehicle', 'driver'];
        const hasSignificantChanges = significantFields.some(field =>
            req.body[field] && req.body[field] !== oldDocument[field]?.toString()
        ) || (req.files && req.files.length > 0);

        if (hasSignificantChanges) {
            updateData.version = oldDocument.version + 1;
        }

        const document = await Document.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate('vehicle driver');

        // Historique
        await logHistory({
            eventType: 'document_update',
            module: 'document',
            entityId: document._id,
            oldData: oldDocument,
            newData: document.toObject(),
            performedBy: req.user?._id,
            description: `Mise à jour du document ${document.documentType}${hasSignificantChanges ? ` (version ${document.version})` : ''}`,
            ipAddress: req.ip
        });

        res.json(document);
    } catch (error) {
        // Nettoyer les fichiers uploadés en cas d'erreur
        if (req.files) {
            for (const file of req.files) {
                try {
                    await deleteFile(file.path);
                } catch (err) {
                    console.error(`Erreur lors du nettoyage du fichier ${file.path}:`, err);
                }
            }
        }
        res.status(400).json({ message: error.message });
    }
};

// Supprimer un document
exports.delete = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document) {
            return res.status(404).json({ message: 'Document non trouvé' });
        }

        // Supprimer les fichiers PDF associés
        for (const filePath of document.pdf) {
            try {
                await deleteFile(filePath);
            } catch (err) {
                console.error(`Erreur lors de la suppression du fichier ${filePath}:`, err);
            }
        }

        // Historique avant suppression
        await logHistory({
            eventType: 'document_delete',
            module: 'document',
            entityId: document._id,
            oldData: document.toObject(),
            performedBy: req.user?._id,
            description: `Suppression du document ${document.documentType} (version ${document.version})`,
            ipAddress: req.ip
        });

        await Document.findByIdAndDelete(req.params.id);

        // Si c'était le document courant, promouvoir la version précédente
        if (document.isCurrent) {
            await promoteLatestVersionToCurrent({
                vehicle: document.vehicle,
                driver: document.driver,
                documentType: document.documentType
            });
        }

        res.json({ message: 'Document supprimé avec succès' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Ajouter des fichiers PDF à un document (avec protection contre race condition)
exports.addPdf = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'Aucun fichier PDF fourni' });
        }

        // Utiliser findByIdAndUpdate avec versioning pour éviter les race conditions
        const newPdfPaths = req.files.map(file => file.path);

        const document = await Document.findByIdAndUpdate(
            req.params.id,
            {
                $push: { pdf: { $each: newPdfPaths } },
                $inc: { version: 1 }
            },
            {
                new: true,
                runValidators: true,
                select: '+pdf' // S'assurer que le champ pdf est inclus
            }
        );

        if (!document) {
            // Nettoyer les fichiers si le document n'existe pas
            for (const file of req.files) {
                try {
                    await deleteFile(file.path);
                } catch (err) {
                    console.error(`Erreur lors du nettoyage du fichier ${file.path}:`, err);
                }
            }
            return res.status(404).json({ message: 'Document non trouvé' });
        }

        // Historique
        await logHistory({
            eventType: 'document_pdf_add',
            module: 'document',
            entityId: document._id,
            newData: { pdf: document.pdf, version: document.version },
            performedBy: req.user?._id,
            description: `Ajout de ${req.files.length} PDF(s) au document ${document.documentType} (version ${document.version})`,
            ipAddress: req.ip,
            metadata: { count: req.files.length }
        });

        res.json({
            message: 'Fichiers PDF ajoutés avec succès',
            document
        });
    } catch (error) {
        // Nettoyer les fichiers uploadés en cas d'erreur
        if (req.files) {
            for (const file of req.files) {
                try {
                    await deleteFile(file.path);
                } catch (err) {
                    console.error(`Erreur lors du nettoyage du fichier ${file.path}:`, err);
                }
            }
        }
        res.status(500).json({ message: error.message });
    }
};

// Supprimer un PDF d'un document (avec protection contre race condition)
exports.deletePdf = async (req, res) => {
    try {
        const { id, pdfIndex } = req.params;
        const index = parseInt(pdfIndex);

        if (isNaN(index) || index < 0) {
            return res.status(400).json({ message: 'Index de PDF invalide' });
        }

        // Récupérer le document pour vérifier l'index
        const document = await Document.findById(id);
        if (!document) {
            return res.status(404).json({ message: 'Document non trouvé' });
        }

        if (index >= document.pdf.length) {
            return res.status(400).json({ message: 'Index de PDF invalide' });
        }

        const fileToDelete = document.pdf[index];

        // Supprimer l'élément du tableau de manière atomique
        const updatedDocument = await Document.findByIdAndUpdate(
            id,
            {
                $unset: { [`pdf.${index}`]: 1 },
                $inc: { version: 1 }
            },
            { new: false } // Récupérer l'ancien document pour l'historique
        );

        // Nettoyer les éléments null du tableau
        await Document.findByIdAndUpdate(
            id,
            { $pull: { pdf: null } }
        );

        // Supprimer le fichier physique
        try {
            await deleteFile(fileToDelete);
        } catch (err) {
            console.error(`Erreur lors de la suppression du fichier ${fileToDelete}:`, err);
        }

        // Récupérer le document mis à jour
        const finalDocument = await Document.findById(id);

        // Historique
        await logHistory({
            eventType: 'document_pdf_delete',
            module: 'document',
            entityId: finalDocument._id,
            oldData: { pdf: updatedDocument.pdf, version: updatedDocument.version },
            newData: { pdf: finalDocument.pdf, version: finalDocument.version },
            performedBy: req.user?._id,
            description: `Suppression d'un PDF du document ${finalDocument.documentType} (version ${finalDocument.version})`,
            ipAddress: req.ip
        });

        res.json({
            message: 'PDF supprimé avec succès',
            document: finalDocument
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Récupérer les documents expirés ou sur le point d'expirer
exports.getExpiringDocuments = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() + parseInt(days));

        const expiringDocuments = await Document.find({
            expiryDate: { $lte: thresholdDate },
            isCurrent: true
        })
            .populate('vehicle', 'licensePlate brand model')
            .populate('driver', 'firstName lastName licenseNumber')
            .sort({ expiryDate: 1 });

        res.json(expiringDocuments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Archiver un document et promouvoir la version précédente
exports.archiveDocument = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document) {
            return res.status(404).json({ message: 'Document non trouvé' });
        }

        if (!document.isCurrent) {
            return res.status(400).json({ message: 'Ce document est déjà archivé' });
        }

        // Archiver le document courant
        document.isCurrent = false;
        await document.save();

        // Promouvoir la version précédente (si elle existe)
        const promoted = await promoteLatestVersionToCurrent({
            vehicle: document.vehicle,
            driver: document.driver,
            documentType: document.documentType
        });

        // Historique
        await logHistory({
            eventType: 'document_archive',
            module: 'document',
            entityId: document._id,
            oldData: { isCurrent: true },
            newData: { isCurrent: false },
            performedBy: req.user?._id,
            description: `Archivage du document ${document.documentType} (version ${document.version})${promoted ? ` - Version ${promoted.version} promue` : ''}`,
            ipAddress: req.ip
        });

        res.json({
            message: 'Document archivé avec succès',
            document,
            promotedDocument: promoted
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Récupérer la version actuelle d'un document
exports.getCurrentVersion = async (req, res) => {
    try {
        const { vehicleId, driverId, documentType } = req.query;

        if (!documentType) {
            return res.status(400).json({ message: 'Le type de document est requis' });
        }

        const query = {
            documentType,
            isCurrent: true
        };

        if (vehicleId) query.vehicle = vehicleId;
        if (driverId) query.driver = driverId;

        const document = await Document.findOne(query)
            .populate('vehicle', 'licensePlate brand model')
            .populate('driver', 'firstName lastName licenseNumber');

        if (!document) {
            return res.status(404).json({ message: 'Aucun document actif trouvé' });
        }

        res.json(document);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Récupérer l'historique des versions d'un document
exports.getVersionHistory = async (req, res) => {
    try {
        const { vehicleId, driverId, documentType } = req.query;

        if (!documentType) {
            return res.status(400).json({ message: 'Le type de document est requis' });
        }

        const query = { documentType };
        if (vehicleId) query.vehicle = vehicleId;
        if (driverId) query.driver = driverId;

        const documents = await Document.find(query)
            .populate('vehicle', 'licensePlate brand model')
            .populate('driver', 'firstName lastName licenseNumber')
            .sort({ version: -1 });

        res.json(documents);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Fonctions utilitaires ---

async function archiveExistingCurrentDocument({ vehicle, driver, documentType }) {
    const query = { documentType, isCurrent: true };
    if (vehicle) query.vehicle = vehicle;
    if (driver) query.driver = driver;

    await Document.updateMany(query, { isCurrent: false });
}

async function getLatestVersion({ vehicle, driver, documentType }) {
    const query = { documentType };
    if (vehicle) query.vehicle = vehicle;
    if (driver) query.driver = driver;

    const latestDoc = await Document.findOne(query).sort({ version: -1 });
    return latestDoc ? latestDoc.version : 0;
}

async function promoteLatestVersionToCurrent({ vehicle, driver, documentType }) {
    const query = { documentType, isCurrent: false };
    if (vehicle) query.vehicle = vehicle;
    if (driver) query.driver = driver;

    const latestVersion = await Document.findOne(query).sort({ version: -1 });

    if (latestVersion) {
        latestVersion.isCurrent = true;
        await latestVersion.save();
        return latestVersion;
    }

    return null;
}