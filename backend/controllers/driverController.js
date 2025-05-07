// controllers/driverController.js
const Driver = require('../models/driverModel');
const Vehicle = require('../models/vehicleModel');
const User = require('../models/userModel');
const Schedule = require('../models/scheduleModel');

// Récupérer tous les chauffeurs
exports.getAll = async (req, res) => {
    try {
        const drivers = await Driver.find()
            .populate('currentVehicle', 'type brand model licensePlate')
            .populate('user', 'username email');
        res.json(drivers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Récupérer un chauffeur par ID
exports.getById = async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id)
            .populate('currentVehicle', 'type brand model licensePlate')
            .populate('user', 'username email');

        if (!driver) {
            return res.status(404).json({ message: 'Chauffeur non trouvé' });
        }
        res.json(driver);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Créer un nouveau chauffeur
exports.create = async (req, res) => {
    try {
        const { firstName, lastName, phoneNumber, licenseNumber, hireDate, departureDate, userId } = req.body;

        // Validation des champs requis
        if (!firstName || !lastName || !phoneNumber || !licenseNumber || !hireDate) {
            return res.status(400).json({ message: 'Tous les champs obligatoires doivent être remplis' });
        }

        // Vérifier si un chauffeur avec ce numéro de permis existe déjà
        const driverExists = await Driver.findOne({ licenseNumber });
        if (driverExists) {
            return res.status(400).json({ message: 'Un chauffeur avec ce numéro de permis existe déjà' });
        }

        // Si un userId est fourni, vérifier que l'utilisateur existe et n'est pas déjà lié à un chauffeur
        if (userId) {
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'Utilisateur non trouvé' });
            }

            if (user.driver) {
                return res.status(400).json({ message: 'Cet utilisateur est déjà lié à un chauffeur' });
            }

            // Lier l'utilisateur à ce nouveau chauffeur
            user.driver = true;
            await user.save();
        }

        const driver = new Driver({
            firstName,
            lastName,
            phoneNumber,
            licenseNumber,
            hireDate,
            departureDate,
            user: userId || null
        });

        const savedDriver = await driver.save();

        res.status(201).json(savedDriver);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Mettre à jour un chauffeur
exports.update = async (req, res) => {
    try {
        const { licenseNumber, userId, departureDate } = req.body;
        const driver = await Driver.findById(req.params.id);

        if (!driver) {
            return res.status(404).json({ message: 'Chauffeur non trouvé' });
        }

        // Vérifier si le numéro de permis est modifié et s'il est unique
        if (licenseNumber) {
            const existingDriver = await Driver.findOne({
                licenseNumber,
                _id: { $ne: req.params.id }
            });

            if (existingDriver) {
                return res.status(400).json({ message: 'Un chauffeur avec ce numéro de permis existe déjà' });
            }
        }

        // Si userId est modifié, vérifier les relations
        if (userId) {
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'Utilisateur non trouvé' });
            }

            // Vérifier si l'utilisateur est déjà assigné à un chauffeur différent
            const existingDriverWithUser = await Driver.findOne({ user: userId, _id: { $ne: req.params.id } });
            if (existingDriverWithUser) {
                return res.status(400).json({ message: 'Cet utilisateur est déjà assigné à un autre chauffeur' });
            }

            // Mettre à jour la relation utilisateur-chauffeur
            user.driver = true;
            await user.save();

            // Si le chauffeur était lié à un autre utilisateur, mettre à jour cet utilisateur
            if (driver.user && driver.user.toString() !== userId) {
                await User.findByIdAndUpdate(driver.user, { driver: null });
            }
        }

        // Si une date de départ est définie, vérifier les plannings actifs et futurs
        if (departureDate && (!driver.departureDate || new Date(departureDate) !== new Date(driver.departureDate))) {
            const departureDateTime = new Date(departureDate);

            // Vérifier s'il existe des plannings actifs ou futurs pour ce chauffeur
            const activeSchedules = await Schedule.find({
                driver: driver._id,
                status: 'assigned',
                $or: [
                    // Plannings qui commencent après la date de départ
                    { scheduleDate: { $gt: departureDateTime } },
                    // Plannings en cours qui finissent après la date de départ
                    {
                        scheduleDate: { $lte: departureDateTime },
                        $or: [
                            { endDate: { $gt: departureDateTime } },
                            { endDate: null }
                        ]
                    }
                ]
            });

            if (activeSchedules.length > 0) {
                return res.status(400).json({
                    message: 'Ce chauffeur a des plannings actifs ou futurs après sa date de départ',
                    conflicts: activeSchedules
                });
            }

            // Annuler automatiquement tous les plannings qui chevauchent la date de départ
            await Schedule.updateMany(
                {
                    driver: driver._id,
                    status: 'assigned',
                    scheduleDate: { $lte: departureDateTime },
                    $or: [
                        { endDate: { $gte: departureDateTime } },
                        { endDate: null }
                    ]
                },
                { status: 'canceled' }
            );

            // Si le chauffeur a un véhicule, libérer le véhicule
            if (driver.currentVehicle) {
                await Vehicle.findByIdAndUpdate(driver.currentVehicle, { currentDriver: null });
                req.body.currentVehicle = null;
            }
        }

        // Empêcher l'attribution d'un véhicule à un chauffeur qui a quitté l'entreprise
        if (req.body.currentVehicle && driver.departureDate) {
            return res.status(400).json({ message: 'Impossible d\'attribuer un véhicule à un chauffeur qui a quitté l\'entreprise' });
        }

        const updatedDriver = await Driver.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        )
            .populate('currentVehicle', 'type brand model licensePlate')
            .populate('user', 'username email');

        res.json(updatedDriver);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Supprimer un chauffeur
exports.delete = async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id);

        if (!driver) {
            return res.status(404).json({ message: 'Chauffeur non trouvé' });
        }

        // Vérifier s'il existe des plannings pour ce chauffeur
        const activeSchedules = await Schedule.find({
            driver: driver._id,
            status: 'assigned'
        });

        if (activeSchedules.length > 0) {
            return res.status(400).json({
                message: 'Ce chauffeur a des plannings actifs. Annulez-les avant de supprimer le chauffeur.',
                conflicts: activeSchedules
            });
        }

        // Vérifier si le chauffeur est assigné à un véhicule
        if (driver.currentVehicle) {
            await Vehicle.findByIdAndUpdate(driver.currentVehicle, { currentDriver: null });
        }

        // Mettre à jour l'utilisateur associé si nécessaire
        if (driver.user) {
            await User.findByIdAndUpdate(driver.user, { driver: null });
        }

        await Driver.deleteOne({ _id: driver._id });

        res.json({ message: 'Chauffeur supprimé avec succès' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Récupérer les chauffeurs disponibles (sans date de départ et sans véhicule assigné)
exports.getAvailable = async (req, res) => {
    try {
        const drivers = await Driver.find({
            departureDate: null,
            currentVehicle: null
        });

        res.json(drivers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Récupérer les chauffeurs actifs (sans date de départ)
exports.getActive = async (req, res) => {
    try {
        const drivers = await Driver.find({
            departureDate: null
        })
            .populate('currentVehicle', 'type brand model licensePlate')
            .populate('user', 'username email');

        res.json(drivers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Récupérer les anciens chauffeurs (avec date de départ)
exports.getFormer = async (req, res) => {
    try {
        const drivers = await Driver.find({
            departureDate: { $ne: null }
        })
            .populate('currentVehicle', 'type brand model licensePlate')
            .populate('user', 'username email');

        res.json(drivers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Télécharger et ajouter des photos à un chauffeur
exports.uploadPhotos = async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id);

        if (!driver) {
            return res.status(404).json({ message: 'Chauffeur non trouvé' });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'Aucun fichier téléchargé' });
        }

        // Créer un tableau de chemins d'accès aux photos
        const photoPaths = req.files.map(file => file.path);

        // Ajouter les nouveaux chemins au tableau existant
        driver.photos = [...driver.photos, ...photoPaths];
        await driver.save();

        res.json({
            message: 'Photos du chauffeur ajoutées avec succès',
            driver: await Driver.findById(driver._id)
                .populate('currentVehicle', 'type brand model licensePlate')
                .populate('user', 'username email')
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Supprimer une photo d'un chauffeur
exports.deletePhoto = async (req, res) => {
    try {
        const { photoIndex } = req.params;
        const driver = await Driver.findById(req.params.id);

        if (!driver) {
            return res.status(404).json({ message: 'Chauffeur non trouvé' });
        }

        if (photoIndex < 0 || photoIndex >= driver.photos.length) {
            return res.status(400).json({ message: 'Index de photo invalide' });
        }

        // Supprimer la photo à l'index spécifié
        driver.photos.splice(photoIndex, 1);
        await driver.save();

        res.json({
            message: 'Photo supprimée avec succès',
            driver: await Driver.findById(driver._id)
                .populate('currentVehicle', 'type brand model licensePlate')
                .populate('user', 'username email')
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};