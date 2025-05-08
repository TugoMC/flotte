// controllers/maintenanceController.js
const Maintenance = require('../models/maintenanceModel');
const Vehicle = require('../models/vehicleModel');
const mongoose = require('mongoose');

// Récupérer toutes les maintenances
exports.getAll = async (req, res) => {
    try {
        const maintenances = await Maintenance.find()
            .populate('vehicle', 'licensePlate brand model');
        res.json(maintenances);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Récupérer une maintenance par ID
exports.getById = async (req, res) => {
    try {
        const maintenance = await Maintenance.findById(req.params.id)
            .populate('vehicle', 'licensePlate brand model type');

        if (!maintenance) {
            return res.status(404).json({ message: 'Maintenance non trouvée' });
        }
        res.json(maintenance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Créer une nouvelle maintenance
// Fonction create améliorée avec vérification de doublons
exports.create = async (req, res) => {
    try {
        // Validation des champs obligatoires
        const { vehicle, maintenanceType, maintenanceNature } = req.body;

        if (!vehicle || !maintenanceType || !maintenanceNature) {
            return res.status(400).json({
                message: 'Le véhicule, le type et la nature de maintenance sont obligatoires'
            });
        }

        // Vérifier que le véhicule existe
        const vehicleExists = await Vehicle.findById(vehicle);
        if (!vehicleExists) {
            return res.status(404).json({ message: 'Véhicule non trouvé' });
        }

        // Vérifier si une maintenance similaire existe déjà pour ce véhicule
        const existingMaintenance = await Maintenance.findOne({
            vehicle: vehicle,
            maintenanceType: maintenanceType,
            completed: false
        });

        if (existingMaintenance) {
            return res.status(400).json({
                message: 'Une maintenance similaire non terminée existe déjà pour ce véhicule'
            });
        }

        // Validation des valeurs numériques
        if (req.body.cost && req.body.cost < 0) {
            return res.status(400).json({ message: 'Le coût ne peut pas être négatif' });
        }

        if (req.body.duration && req.body.duration <= 0) {
            return res.status(400).json({ message: 'La durée doit être positive' });
        }

        // Créer la maintenance
        const maintenance = new Maintenance(req.body);
        const savedMaintenance = await maintenance.save();

        // Si la maintenance est en cours, mettre à jour le statut du véhicule
        if (req.body.maintenanceDate && new Date(req.body.maintenanceDate) <= new Date()) {
            await Vehicle.findByIdAndUpdate(
                vehicle,
                { status: 'maintenance' },
                { new: true, runValidators: true }
            );
        }

        res.status(201).json(savedMaintenance);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Mettre à jour une maintenance
exports.update = async (req, res) => {
    try {
        // Vérifier que l'ID est valide
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'ID de maintenance invalide' });
        }

        // Validation des valeurs numériques
        if (req.body.cost !== undefined && req.body.cost < 0) {
            return res.status(400).json({ message: 'Le coût ne peut pas être négatif' });
        }

        if (req.body.duration !== undefined && req.body.duration <= 0) {
            return res.status(400).json({ message: 'La durée doit être positive' });
        }

        // Vérifier que le véhicule existe si on modifie le véhicule
        if (req.body.vehicle) {
            const vehicleExists = await Vehicle.findById(req.body.vehicle);
            if (!vehicleExists) {
                return res.status(404).json({ message: 'Véhicule spécifié non trouvé' });
            }
        }

        // Vérification de la cohérence des dates
        const currentMaintenance = await Maintenance.findById(req.params.id);
        if (!currentMaintenance) {
            return res.status(404).json({ message: 'Maintenance non trouvée' });
        }

        let maintenanceDate = currentMaintenance.maintenanceDate;
        if (req.body.maintenanceDate) {
            maintenanceDate = new Date(req.body.maintenanceDate);
        }

        // Si on essaie de définir une date de complétion
        if (req.body.completionDate) {
            const completionDate = new Date(req.body.completionDate);
            if (completionDate < maintenanceDate) {
                return res.status(400).json({
                    message: 'La date de fin ne peut pas être antérieure à la date de début'
                });
            }
        }

        // S'assurer de la cohérence avec l'attribut "completed"
        if (req.body.completed === true && !req.body.completionDate && !currentMaintenance.completionDate) {
            req.body.completionDate = new Date();
        }

        // Cohérence entre état complété et véhicule
        const vehicleId = req.body.vehicle || currentMaintenance.vehicle;
        const vehicle = await Vehicle.findById(vehicleId);

        // Mettre à jour la maintenance
        const maintenance = await Maintenance.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('vehicle', 'licensePlate brand model type');

        if (!maintenance) {
            return res.status(404).json({ message: 'Maintenance non trouvée' });
        }

        // Gestion de la cohérence du statut du véhicule
        if (vehicle) {
            // Si la maintenance est marquée comme terminée
            if (req.body.hasOwnProperty('completed') && req.body.completed === true) {
                // Vérifier s'il existe d'autres maintenances actives pour ce véhicule
                const otherActiveMaintenance = await Maintenance.findOne({
                    vehicle: vehicleId,
                    _id: { $ne: req.params.id }, // Exclure la maintenance actuelle
                    completed: false
                });

                // Ne remettre le véhicule en service que s'il n'y a pas d'autres maintenances actives
                if (!otherActiveMaintenance && vehicle.status === 'maintenance') {
                    await Vehicle.findByIdAndUpdate(
                        vehicleId,
                        { status: 'active' },
                        { new: true }
                    );
                }
            }
            // Si la maintenance est réactivée (passage de completed=true à completed=false)
            else if (req.body.hasOwnProperty('completed') && req.body.completed === false &&
                currentMaintenance.completed === true) {
                // Remettre le véhicule en maintenance
                await Vehicle.findByIdAndUpdate(
                    vehicleId,
                    { status: 'maintenance' },
                    { new: true }
                );
            }
        }

        res.json(maintenance);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Supprimer une maintenance
exports.delete = async (req, res) => {
    try {
        const maintenance = await Maintenance.findByIdAndDelete(req.params.id);

        if (!maintenance) {
            return res.status(404).json({ message: 'Maintenance non trouvée' });
        }

        res.json({ message: 'Maintenance supprimée avec succès' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Récupérer les maintenances par véhicule
exports.getByVehicle = async (req, res) => {
    try {
        const vehicleId = req.params.vehicleId;

        // Vérifier que l'ID est un ObjectId valide
        if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
            return res.status(400).json({ message: 'ID de véhicule invalide' });
        }

        const maintenances = await Maintenance.find({ vehicle: vehicleId })
            .populate('vehicle', 'licensePlate brand model type');

        res.json(maintenances);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Récupérer les maintenances par type
exports.getByType = async (req, res) => {
    try {
        const maintenanceType = req.params.type;

        // Vérifier que le type est valide
        if (!['oil_change', 'tire_replacement', 'engine', 'other'].includes(maintenanceType)) {
            return res.status(400).json({ message: 'Type de maintenance invalide' });
        }

        const maintenances = await Maintenance.find({ maintenanceType })
            .populate('vehicle', 'licensePlate brand model type');

        res.json(maintenances);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Marquer une maintenance comme terminée
exports.completeMaintenance = async (req, res) => {
    try {
        const maintenance = await Maintenance.findById(req.params.id);

        if (!maintenance) {
            return res.status(404).json({ message: 'Maintenance non trouvée' });
        }

        // Validation des données
        if (req.body.cost && req.body.cost < 0) {
            return res.status(400).json({ message: 'Le coût ne peut pas être négatif' });
        }

        // Mettre à jour la maintenance
        maintenance.completed = true;
        maintenance.completionDate = new Date();

        if (req.body.cost !== undefined) {
            maintenance.cost = req.body.cost;
        }

        if (req.body.notes) {
            maintenance.notes = req.body.notes;
        }

        if (req.body.technicianName) {
            maintenance.technicianName = req.body.technicianName;
        }

        await maintenance.save();

        // Vérifier s'il existe d'autres maintenances actives pour ce véhicule
        const otherActiveMaintenance = await Maintenance.findOne({
            vehicle: maintenance.vehicle,
            _id: { $ne: maintenance._id },
            completed: false
        });

        // Mettre à jour le statut du véhicule si nécessaire (seulement s'il n'y a pas d'autres maintenances actives)
        const vehicle = await Vehicle.findById(maintenance.vehicle);
        if (vehicle && vehicle.status === 'maintenance' && !otherActiveMaintenance) {
            vehicle.status = 'active';
            await vehicle.save();
        }

        res.json({
            message: 'Maintenance marquée comme terminée',
            maintenance: await Maintenance.findById(maintenance._id)
                .populate('vehicle', 'licensePlate brand model type')
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.checkStatusConsistency = async (req, res) => {
    try {
        // 1. Trouver tous les véhicules en maintenance
        const vehiclesInMaintenance = await Vehicle.find({ status: 'maintenance' });

        // 2. Pour chaque véhicule, vérifier s'il a au moins une maintenance active
        const statusUpdates = [];

        for (const vehicle of vehiclesInMaintenance) {
            const activeMaintenance = await Maintenance.findOne({
                vehicle: vehicle._id,
                completed: false
            });

            // Si aucune maintenance active n'est trouvée, corriger le statut du véhicule
            if (!activeMaintenance) {
                await Vehicle.findByIdAndUpdate(
                    vehicle._id,
                    { status: 'active' },
                    { new: true }
                );
                statusUpdates.push({
                    vehicleId: vehicle._id,
                    licensePlate: vehicle.licensePlate,
                    oldStatus: 'maintenance',
                    newStatus: 'active',
                    reason: 'Aucune maintenance active trouvée'
                });
            }
        }

        // 3. Trouver tous les véhicules actifs qui devraient être en maintenance
        const activeVehicles = await Vehicle.find({ status: 'active' });

        for (const vehicle of activeVehicles) {
            const pendingMaintenance = await Maintenance.findOne({
                vehicle: vehicle._id,
                completed: false
            });

            // Si une maintenance active est trouvée, corriger le statut du véhicule
            if (pendingMaintenance) {
                await Vehicle.findByIdAndUpdate(
                    vehicle._id,
                    { status: 'maintenance' },
                    { new: true }
                );
                statusUpdates.push({
                    vehicleId: vehicle._id,
                    licensePlate: vehicle.licensePlate,
                    oldStatus: 'active',
                    newStatus: 'maintenance',
                    reason: 'Maintenance active trouvée',
                    maintenanceId: pendingMaintenance._id
                });
            }
        }

        res.json({
            message: 'Vérification et correction des statuts terminée',
            corrections: statusUpdates,
            totalCorrected: statusUpdates.length
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.validateDates = async (req, res) => {
    try {
        // 1. Trouver toutes les maintenances avec des dates incohérentes
        const allMaintenances = await Maintenance.find();
        const dateIssues = [];

        for (const maintenance of allMaintenances) {
            const issues = {};

            // Vérifier que la date de maintenance est définie
            if (!maintenance.maintenanceDate) {
                issues.missingMaintenanceDate = true;
            }

            // Vérifier la cohérence entre completed et completionDate
            if (maintenance.completed && !maintenance.completionDate) {
                issues.completedWithoutDate = true;
                // Correction automatique
                maintenance.completionDate = new Date();
                await maintenance.save();
            } else if (!maintenance.completed && maintenance.completionDate) {
                issues.dateWithoutCompleted = true;
            }

            // Vérifier que la date de fin est postérieure à la date de début
            if (maintenance.maintenanceDate && maintenance.completionDate &&
                maintenance.completionDate < maintenance.maintenanceDate) {
                issues.endBeforeStart = true;
            }

            // Si des problèmes ont été identifiés, les ajouter à la liste
            if (Object.keys(issues).length > 0) {
                dateIssues.push({
                    maintenanceId: maintenance._id,
                    vehicleId: maintenance.vehicle,
                    issues: issues
                });
            }
        }

        res.json({
            message: 'Validation des dates terminée',
            issues: dateIssues,
            totalIssues: dateIssues.length
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Télécharger et ajouter des photos à une maintenance
exports.uploadPhotos = async (req, res) => {
    try {
        const maintenance = await Maintenance.findById(req.params.id);

        if (!maintenance) {
            return res.status(404).json({ message: 'Maintenance non trouvée' });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'Aucun fichier téléchargé' });
        }

        // Créer un tableau de chemins d'accès aux photos
        const photoPaths = req.files.map(file => file.path);

        // Ajouter les nouveaux chemins au tableau existant
        maintenance.photos = [...maintenance.photos, ...photoPaths];
        await maintenance.save();

        res.json({
            message: 'Photos de maintenance ajoutées avec succès',
            maintenance: await Maintenance.findById(maintenance._id)
                .populate('vehicle', 'licensePlate brand model type')
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Supprimer une photo d'une maintenance
exports.deletePhoto = async (req, res) => {
    try {
        const { photoIndex } = req.params;
        const maintenance = await Maintenance.findById(req.params.id);

        if (!maintenance) {
            return res.status(404).json({ message: 'Maintenance non trouvée' });
        }

        if (photoIndex < 0 || photoIndex >= maintenance.photos.length) {
            return res.status(400).json({ message: 'Index de photo invalide' });
        }

        // Supprimer la photo à l'index spécifié
        maintenance.photos.splice(photoIndex, 1);
        await maintenance.save();

        res.json({
            message: 'Photo supprimée avec succès',
            maintenance: await Maintenance.findById(maintenance._id)
                .populate('vehicle', 'licensePlate brand model type')
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Récupérer les statistiques de maintenance
exports.getStats = async (req, res) => {
    try {
        // Statistiques par type de maintenance
        const statsByType = await Maintenance.aggregate([
            {
                $group: {
                    _id: "$maintenanceType",
                    count: { $sum: 1 },
                    totalCost: { $sum: "$cost" },
                    avgCost: { $avg: "$cost" }
                }
            }
        ]);

        // Statistiques par nature de maintenance
        const statsByNature = await Maintenance.aggregate([
            {
                $group: {
                    _id: "$maintenanceNature",
                    count: { $sum: 1 },
                    totalCost: { $sum: "$cost" }
                }
            }
        ]);

        // Statistiques par véhicule
        const statsByVehicle = await Maintenance.aggregate([
            {
                $group: {
                    _id: "$vehicle",
                    count: { $sum: 1 },
                    totalCost: { $sum: "$cost" }
                }
            },
            {
                $lookup: {
                    from: "vehicles",
                    localField: "_id",
                    foreignField: "_id",
                    as: "vehicleInfo"
                }
            },
            {
                $project: {
                    count: 1,
                    totalCost: 1,
                    licensePlate: { $arrayElemAt: ["$vehicleInfo.licensePlate", 0] },
                    brand: { $arrayElemAt: ["$vehicleInfo.brand", 0] },
                    model: { $arrayElemAt: ["$vehicleInfo.model", 0] }
                }
            }
        ]);

        res.json({
            statsByType,
            statsByNature,
            statsByVehicle
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};