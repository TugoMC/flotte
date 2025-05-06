// controllers/vehicleController.js
const Vehicle = require('../models/vehicleModel');
const Driver = require('../models/driverModel');

// Récupérer tous les véhicules
exports.getAll = async (req, res) => {
    try {
        const vehicles = await Vehicle.find().populate('currentDriver', 'firstName lastName');
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
        // Validation des champs obligatoires
        const { type, licensePlate, brand, model, registrationDate, serviceEntryDate } = req.body;

        if (!type || !licensePlate || !brand || !model || !registrationDate || !serviceEntryDate) {
            return res.status(400).json({ message: 'Tous les champs obligatoires doivent être remplis' });
        }

        // Vérifier si le véhicule existe déjà (plaque d'immatriculation unique)
        const vehicleExists = await Vehicle.findOne({ licensePlate });
        if (vehicleExists) {
            return res.status(400).json({ message: 'Un véhicule avec cette plaque d\'immatriculation existe déjà' });
        }

        const vehicle = new Vehicle(req.body);
        const savedVehicle = await vehicle.save();
        res.status(201).json(savedVehicle);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Mettre à jour un véhicule
exports.update = async (req, res) => {
    try {
        // Vérifier si la plaque d'immatriculation est mise à jour et si elle est unique
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
        res.json(vehicle);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Supprimer un véhicule
exports.delete = async (req, res) => {
    try {
        // Vérifier si un chauffeur est toujours assigné à ce véhicule
        const hasDriver = await Driver.findOne({ currentVehicle: req.params.id });
        if (hasDriver) {
            return res.status(400).json({
                message: 'Ce véhicule est assigné à un chauffeur. Veuillez désaffecter le chauffeur avant de supprimer.'
            });
        }

        const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
        if (!vehicle) {
            return res.status(404).json({ message: 'Véhicule non trouvé' });
        }
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

        if (!['active', 'inactive', 'maintenance'].includes(status)) {
            return res.status(400).json({ message: 'Statut invalide' });
        }

        const vehicle = await Vehicle.findById(req.params.id);

        if (!vehicle) {
            return res.status(404).json({ message: 'Véhicule non trouvé' });
        }

        // Si le véhicule passe à un statut inactif ou maintenance, on libère le chauffeur associé
        if (status !== 'active' && vehicle.currentDriver) {
            await Driver.findByIdAndUpdate(
                vehicle.currentDriver,
                { currentVehicle: null }
            );
            vehicle.currentDriver = null;
        }

        vehicle.status = status;
        await vehicle.save();

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

        // Vérifier que le véhicule existe et est actif
        const vehicle = await Vehicle.findById(req.params.id);

        if (!vehicle) {
            return res.status(404).json({ message: 'Véhicule non trouvé' });
        }

        if (vehicle.status !== 'active') {
            return res.status(400).json({
                message: 'Impossible d\'assigner un chauffeur à un véhicule inactif ou en maintenance'
            });
        }

        // Vérifier que le chauffeur existe et est actif
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

        // Faire l'assignation dans les deux sens
        vehicle.currentDriver = driverId;
        await vehicle.save();

        driver.currentVehicle = vehicle._id;
        await driver.save();

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

        // Libérer le chauffeur du véhicule
        const driver = await Driver.findById(vehicle.currentDriver);
        if (driver) {
            driver.currentVehicle = null;
            await driver.save();
        }

        // Libérer le véhicule du chauffeur
        vehicle.currentDriver = null;
        await vehicle.save();

        res.json({ message: 'Chauffeur libéré avec succès', vehicle });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};