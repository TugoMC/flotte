// controllers/vehicleController.js
const Vehicle = require('../models/vehicleModel');
const Driver = require('../models/driverModel');
const History = require('../models/historyModel');

// Récupérer tous les véhicules
exports.getAll = async (req, res) => {
    try {
        const vehicles = await Vehicle.find()
            .populate('currentDriver', 'firstName lastName');
        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Récupérer un véhicule par ID
exports.getById = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id)
            .populate('currentDriver', 'firstName lastName');

        if (!vehicle) {
            return res.status(404).json({ message: 'Véhicule non trouvé' });
        }
        res.json(vehicle);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// Créer un nouveau véhicule
exports.create = async (req, res) => {
    try {
        const { type, licensePlate, brand, model, registrationDate, serviceEntryDate } = req.body;

        if (!type || !licensePlate || !brand || !model || !registrationDate || !serviceEntryDate) {
            return res.status(400).json({ message: 'Tous les champs obligatoires doivent être remplis' });
        }

        const vehicleExists = await Vehicle.findOne({ licensePlate });
        if (vehicleExists) {
            return res.status(400).json({ message: 'Un véhicule avec cette plaque d\'immatriculation existe déjà' });
        }

        const vehicle = new Vehicle(req.body);
        const savedVehicle = await vehicle.save();

        // Historique de création
        await History.create({
            eventType: 'vehicle_create',
            module: 'vehicle',
            entityId: savedVehicle._id,
            newData: savedVehicle.toObject(),
            performedBy: req.user?._id,
            description: `Création du véhicule ${savedVehicle.brand} ${savedVehicle.model} (${savedVehicle.licensePlate})`,
            ipAddress: req.ip
        });

        res.status(201).json(savedVehicle);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Mettre à jour un véhicule
exports.update = async (req, res) => {
    try {
        const oldVehicle = await Vehicle.findById(req.params.id).lean();

        if (req.body.licensePlate) {
            const existingVehicle = await Vehicle.findOne({
                licensePlate: req.body.licensePlate,
                _id: { $ne: req.params.id }
            });

            if (existingVehicle) {
                return res.status(400).json({
                    message: 'Un véhicule avec cette plaque d\'immatriculation existe déjà'
                });
            }
        }

        const vehicle = await Vehicle.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('currentDriver', 'firstName lastName');

        if (!vehicle) {
            return res.status(404).json({ message: 'Véhicule non trouvé' });
        }

        // Détecter si c'est un changement de statut
        let description;
        if (req.body.status && req.body.status !== oldVehicle.status) {
            description = `Changement de statut du véhicule ${vehicle.licensePlate} (${oldVehicle.status} → ${vehicle.status})`;
        } else {
            description = `Modification du véhicule ${vehicle.licensePlate}`;
        }

        // Historique de modification
        await History.create({
            eventType: req.body.status ? 'vehicle_status_change' : 'vehicle_update',
            module: 'vehicle',
            entityId: vehicle._id,
            oldData: oldVehicle,
            newData: vehicle.toObject(),
            performedBy: req.user?._id,
            description: description,
            ipAddress: req.ip
        });

        res.json(vehicle);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Supprimer un véhicule
exports.delete = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) {
            return res.status(404).json({ message: 'Véhicule non trouvé' });
        }

        const hasDriver = await Driver.findOne({ currentVehicle: req.params.id });
        if (hasDriver) {
            return res.status(400).json({
                message: 'Ce véhicule est assigné à un chauffeur. Veuillez désaffecter le chauffeur avant de supprimer.'
            });
        }

        // Historique avant suppression
        await History.create({
            eventType: 'vehicle_delete',
            module: 'vehicle',
            entityId: vehicle._id,
            oldData: vehicle.toObject(),
            performedBy: req.user?._id,
            description: `Suppression du véhicule ${vehicle.licensePlate}`,
            ipAddress: req.ip
        });

        await Vehicle.findByIdAndDelete(req.params.id);
        res.json({ message: 'Véhicule supprimé avec succès' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Récupérer les véhicules disponibles (actifs)
exports.getAvailable = async (req, res) => {
    try {
        const vehicles = await Vehicle.find({ status: 'active' })
            .populate('currentDriver', 'firstName lastName');
        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Récupérer les véhicules par statut
exports.getByStatus = async (req, res) => {
    try {
        const status = req.params.status;
        // Vérifier que le statut est valide
        if (!['active', 'inactive', 'maintenance'].includes(status)) {
            return res.status(400).json({ message: 'Statut invalide' });
        }

        const vehicles = await Vehicle.find({ status })
            .populate('currentDriver', 'firstName lastName');
        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Définir l'objectif de recette journalière
exports.setDailyTarget = async (req, res) => {
    try {
        const { dailyIncomeTarget } = req.body;

        if (!dailyIncomeTarget || isNaN(dailyIncomeTarget) || dailyIncomeTarget < 0) {
            return res.status(400).json({ message: 'Objectif journalier invalide' });
        }

        const vehicle = await Vehicle.findByIdAndUpdate(
            req.params.id,
            { dailyIncomeTarget },
            { new: true, runValidators: true }
        );

        if (!vehicle) {
            return res.status(404).json({ message: 'Véhicule non trouvé' });
        }

        res.json(vehicle);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Changer le statut d'un véhicule
exports.changeStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['active', 'inactive', 'maintenance'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Statut invalide' });
        }

        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) {
            return res.status(404).json({ message: 'Véhicule non trouvé' });
        }

        const oldStatus = vehicle.status;

        // Si le véhicule passe à un statut inactif ou maintenance, on libère le chauffeur
        if (status !== 'active' && vehicle.currentDriver) {
            await Driver.findByIdAndUpdate(
                vehicle.currentDriver,
                { currentVehicle: null }
            );
            vehicle.currentDriver = null;
        }

        vehicle.status = status;
        await vehicle.save();

        // Historique de changement de statut
        await History.create({
            eventType: 'vehicle_status_change',
            module: 'vehicle',
            entityId: vehicle._id,
            oldData: { status: oldStatus },
            newData: { status: vehicle.status },
            performedBy: req.user?._id,
            description: `Changement de statut du véhicule ${vehicle.licensePlate} (${oldStatus} → ${vehicle.status})`,
            ipAddress: req.ip
        });

        res.json(vehicle);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Assigner un chauffeur à un véhicule
exports.assignDriver = async (req, res) => {
    try {
        const { driverId } = req.body;
        if (!driverId) {
            return res.status(400).json({ message: 'ID du chauffeur requis' });
        }

        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) {
            return res.status(404).json({ message: 'Véhicule non trouvé' });
        }

        if (vehicle.status !== 'active') {
            return res.status(400).json({
                message: 'Impossible d\'assigner un chauffeur à un véhicule inactif ou en maintenance'
            });
        }

        const driver = await Driver.findById(driverId);
        if (!driver) {
            return res.status(404).json({ message: 'Chauffeur non trouvé' });
        }

        if (driver.status !== 'active') {
            return res.status(400).json({ message: 'Ce chauffeur n\'est pas actif' });
        }

        // Si le chauffeur est déjà assigné à un autre véhicule, le libérer
        if (driver.currentVehicle) {
            await Vehicle.findByIdAndUpdate(
                driver.currentVehicle,
                { currentDriver: null }
            );
        }

        // Si le véhicule a déjà un chauffeur, le libérer
        if (vehicle.currentDriver) {
            await Driver.findByIdAndUpdate(
                vehicle.currentDriver,
                { currentVehicle: null }
            );
        }

        // Faire l'assignation
        vehicle.currentDriver = driverId;
        await vehicle.save();

        driver.currentVehicle = vehicle._id;
        await driver.save();

        // Historique d'assignation
        await History.create({
            eventType: 'vehicle_driver_assign',
            module: 'vehicle',
            entityId: vehicle._id,
            oldData: { currentDriver: null },
            newData: { currentDriver: driverId },
            performedBy: req.user?._id,
            description: `Assignation du chauffeur ${driver.firstName} ${driver.lastName} au véhicule ${vehicle.licensePlate}`,
            ipAddress: req.ip
        });

        res.json({
            message: 'Chauffeur assigné avec succès',
            vehicle: await Vehicle.findById(vehicle._id).populate('currentDriver', 'firstName lastName')
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Libérer un chauffeur d'un véhicule
exports.releaseDriver = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) {
            return res.status(404).json({ message: 'Véhicule non trouvé' });
        }

        if (!vehicle.currentDriver) {
            return res.status(400).json({ message: 'Ce véhicule n\'a pas de chauffeur assigné' });
        }

        const driver = await Driver.findById(vehicle.currentDriver);
        if (driver) {
            driver.currentVehicle = null;
            await driver.save();
        }

        // Historique avant libération
        await History.create({
            eventType: 'vehicle_driver_release',
            module: 'vehicle',
            entityId: vehicle._id,
            oldData: { currentDriver: vehicle.currentDriver },
            newData: { currentDriver: null },
            performedBy: req.user?._id,
            description: `Libération du chauffeur du véhicule ${vehicle.licensePlate}`,
            ipAddress: req.ip
        });

        vehicle.currentDriver = null;
        await vehicle.save();

        res.json({ message: 'Chauffeur libéré avec succès', vehicle });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Télécharger et ajouter des photos à un véhicule
exports.uploadPhotos = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) {
            return res.status(404).json({ message: 'Véhicule non trouvé' });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'Aucun fichier téléchargé' });
        }

        const photoPaths = req.files.map(file => file.path);
        vehicle.photos = [...vehicle.photos, ...photoPaths];
        await vehicle.save();

        // Historique d'upload de photos
        await History.create({
            eventType: 'vehicle_photo_upload',
            module: 'vehicle',
            entityId: vehicle._id,
            newData: { photos: vehicle.photos },
            performedBy: req.user?._id,
            description: `Ajout de ${req.files.length} photo(s) au véhicule ${vehicle.licensePlate}`,
            ipAddress: req.ip,
            metadata: { count: req.files.length }
        });

        res.json({
            message: 'Photos du véhicule ajoutées avec succès',
            vehicle: await Vehicle.findById(vehicle._id).populate('currentDriver', 'firstName lastName')
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Supprimer une photo d'un véhicule
exports.deletePhoto = async (req, res) => {
    try {
        const { photoIndex } = req.params;
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) {
            return res.status(404).json({ message: 'Véhicule non trouvé' });
        }

        if (photoIndex < 0 || photoIndex >= vehicle.photos.length) {
            return res.status(400).json({ message: 'Index de photo invalide' });
        }

        const deletedPhoto = vehicle.photos[photoIndex];

        vehicle.photos.splice(photoIndex, 1);
        await vehicle.save();

        // Historique de suppression de photo
        await History.create({
            eventType: 'vehicle_photo_delete',
            module: 'vehicle',
            entityId: vehicle._id,
            oldData: { photos: [...vehicle.photos, deletedPhoto] },
            newData: { photos: vehicle.photos },
            performedBy: req.user?._id,
            description: `Suppression d'une photo du véhicule ${vehicle.licensePlate}`,
            ipAddress: req.ip
        });

        res.json({
            message: 'Photo supprimée avec succès',
            vehicle: await Vehicle.findById(vehicle._id).populate('currentDriver', 'firstName lastName')
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.startMaintenance = async (req, res) => {
    try {
        const { id } = req.params;
        const { maintenanceType, maintenanceNature, description, duration, mileage } = req.body;

        // Validation
        if (!maintenanceType || !maintenanceNature) {
            return res.status(400).json({
                message: 'Le type et la nature de maintenance sont obligatoires'
            });
        }

        // Trouver le véhicule
        const vehicle = await Vehicle.findById(id);
        if (!vehicle) {
            return res.status(404).json({ message: 'Véhicule non trouvé' });
        }

        // Si le véhicule a un chauffeur assigné, le libérer
        if (vehicle.currentDriver) {
            await Driver.findByIdAndUpdate(
                vehicle.currentDriver,
                { currentVehicle: null }
            );
        }

        // Mettre le véhicule en maintenance (peu importe son statut précédent)
        const oldStatus = vehicle.status;
        vehicle.status = 'maintenance';
        vehicle.currentDriver = null;
        await vehicle.save();

        // Créer une nouvelle entrée de maintenance
        const Maintenance = require('../models/maintenanceModel');
        const maintenance = new Maintenance({
            vehicle: id,
            maintenanceType,
            maintenanceNature,
            description,
            duration: duration || 1,
            mileage,
            maintenanceDate: new Date(),
            previousStatus: oldStatus // Stocker l'ancien statut pour référence
        });

        await maintenance.save();

        await History.create({
            eventType: 'vehicle_maintenance_start',
            module: 'vehicle',
            entityId: vehicle._id,
            oldData: { status: oldStatus },
            newData: { status: 'maintenance' },
            performedBy: req.user ? req.user._id : null,
            description: `Mise en maintenance (${maintenanceType}) du véhicule ${vehicle.licensePlate}`,
            ipAddress: req.ip,
            metadata: {
                maintenanceId: maintenance._id,
                maintenanceType,
                duration
            }
        });

        res.json({
            message: 'Véhicule mis en maintenance avec succès',
            vehicle,
            maintenance
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};