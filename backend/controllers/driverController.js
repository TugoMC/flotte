// controllers/driverController.js
const Driver = require('../models/driverModel');
const Vehicle = require('../models/vehicleModel');
const User = require('../models/userModel');
const Schedule = require('../models/scheduleModel');

// Récupérer tous les chauffeurs
exports.getAll = async (req, res) => {
    console.log('[DriverController] Début de getAll - Récupération de tous les chauffeurs');
    try {
        const drivers = await Driver.find()
            .populate('currentVehicle', 'type brand model licensePlate')
            .populate('user', 'username email');
        console.log(`[DriverController] getAll - ${drivers.length} chauffeurs trouvés`);
        res.json(drivers);
    } catch (error) {
        console.error('[DriverController] Erreur dans getAll:', error.message, error.stack);
        res.status(500).json({ message: error.message });
    }
};

// Récupérer un chauffeur par ID
exports.getById = async (req, res) => {
    console.log(`[DriverController] Début de getById - ID: ${req.params.id}`);
    try {
        const driver = await Driver.findById(req.params.id)
            .populate('currentVehicle', 'type brand model licensePlate')
            .populate('user', 'username email');

        if (!driver) {
            console.warn(`[DriverController] getById - Chauffeur non trouvé (ID: ${req.params.id})`);
            return res.status(404).json({ message: 'Chauffeur non trouvé' });
        }
        console.log(`[DriverController] getById - Chauffeur trouvé: ${driver.firstName} ${driver.lastName}`);
        res.json(driver);
    } catch (error) {
        console.error('[DriverController] Erreur dans getById:', error.message, error.stack);
        res.status(500).json({ message: error.message });
    }
};

// Créer un nouveau chauffeur
exports.create = async (req, res) => {
    console.log('[DriverController] Début de create - Données reçues:', JSON.stringify(req.body));
    try {
        const { firstName, lastName, phoneNumber, licenseNumber, hireDate, departureDate, userId } = req.body;

        // Validation des champs requis
        if (!firstName || !lastName || !phoneNumber || !licenseNumber || !hireDate) {
            console.warn('[DriverController] create - Champs obligatoires manquants');
            return res.status(400).json({ message: 'Tous les champs obligatoires doivent être remplis' });
        }

        // Vérifier si un chauffeur avec ce numéro de permis existe déjà
        const driverExists = await Driver.findOne({ licenseNumber });
        if (driverExists) {
            console.warn(`[DriverController] create - Numéro de permis déjà existant: ${licenseNumber}`);
            return res.status(400).json({ message: 'Un chauffeur avec ce numéro de permis existe déjà' });
        }

        // Si un userId est fourni, vérifier que l'utilisateur existe et n'est pas déjà lié à un chauffeur
        if (userId) {
            const user = await User.findById(userId);
            if (!user) {
                console.warn(`[DriverController] create - Utilisateur non trouvé (ID: ${userId})`);
                return res.status(404).json({ message: 'Utilisateur non trouvé' });
            }

            if (user.driver) {
                console.warn(`[DriverController] create - Utilisateur déjà lié à un chauffeur (ID: ${userId})`);
                return res.status(400).json({ message: 'Cet utilisateur est déjà lié à un chauffeur' });
            }

            // Lier l'utilisateur à ce nouveau chauffeur
            user.driver = true;
            await user.save();
            console.log(`[DriverController] create - Utilisateur ${userId} mis à jour avec driver=true`);
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
        console.log(`[DriverController] create - Nouveau chauffeur créé (ID: ${savedDriver._id})`);

        res.status(201).json(savedDriver);
    } catch (error) {
        console.error('[DriverController] Erreur dans create:', error.message, error.stack);
        res.status(400).json({ message: error.message });
    }
};

// Mettre à jour un chauffeur
exports.update = async (req, res) => {
    console.log(`[DriverController] Début de update - ID: ${req.params.id}, Données: ${JSON.stringify(req.body)}`);
    try {
        const { licenseNumber, userId, departureDate } = req.body;
        const driver = await Driver.findById(req.params.id);

        if (!driver) {
            console.warn(`[DriverController] update - Chauffeur non trouvé (ID: ${req.params.id})`);
            return res.status(404).json({ message: 'Chauffeur non trouvé' });
        }

        // Vérifier si le numéro de permis est modifié et s'il est unique
        if (licenseNumber) {
            const existingDriver = await Driver.findOne({
                licenseNumber,
                _id: { $ne: req.params.id }
            });

            if (existingDriver) {
                console.warn(`[DriverController] update - Numéro de permis déjà utilisé: ${licenseNumber}`);
                return res.status(400).json({ message: 'Un chauffeur avec ce numéro de permis existe déjà' });
            }
        }

        // Si userId est modifié, vérifier les relations
        if (userId) {
            const user = await User.findById(userId);
            if (!user) {
                console.warn(`[DriverController] update - Utilisateur non trouvé (ID: ${userId})`);
                return res.status(404).json({ message: 'Utilisateur non trouvé' });
            }

            // Vérifier si l'utilisateur est déjà assigné à un chauffeur différent
            const existingDriverWithUser = await Driver.findOne({ user: userId, _id: { $ne: req.params.id } });
            if (existingDriverWithUser) {
                console.warn(`[DriverController] update - Utilisateur déjà assigné à un autre chauffeur (ID: ${userId})`);
                return res.status(400).json({ message: 'Cet utilisateur est déjà assigné à un autre chauffeur' });
            }

            // Mettre à jour la relation utilisateur-chauffeur
            user.driver = true;
            await user.save();
            console.log(`[DriverController] update - Utilisateur ${userId} mis à jour avec driver=true`);

            // Si le chauffeur était lié à un autre utilisateur, mettre à jour cet utilisateur
            if (driver.user && driver.user.toString() !== userId) {
                await User.findByIdAndUpdate(driver.user, { driver: null });
                console.log(`[DriverController] update - Ancien utilisateur ${driver.user} mis à jour avec driver=null`);
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
                    { scheduleDate: { $gt: departureDateTime } },
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
                console.warn(`[DriverController] update - Conflit de plannings pour la date de départ (${departureDate})`);
                return res.status(400).json({
                    message: 'Ce chauffeur a des plannings actifs ou futurs après sa date de départ',
                    conflicts: activeSchedules
                });
            }

            // Annuler automatiquement tous les plannings qui chevauchent la date de départ
            const updateResult = await Schedule.updateMany(
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
            console.log(`[DriverController] update - ${updateResult.nModified} plannings annulés`);

            // Si le chauffeur a un véhicule, libérer le véhicule
            if (driver.currentVehicle) {
                await Vehicle.findByIdAndUpdate(driver.currentVehicle, { currentDriver: null });
                req.body.currentVehicle = null;
                console.log(`[DriverController] update - Véhicule ${driver.currentVehicle} libéré`);
            }
        }

        // Empêcher l'attribution d'un véhicule à un chauffeur qui a quitté l'entreprise
        if (req.body.currentVehicle && driver.departureDate) {
            console.warn('[DriverController] update - Tentative d\'attribution de véhicule à un chauffeur parti');
            return res.status(400).json({ message: 'Impossible d\'attribuer un véhicule à un chauffeur qui a quitté l\'entreprise' });
        }

        const updatedDriver = await Driver.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        )
            .populate('currentVehicle', 'type brand model licensePlate')
            .populate('user', 'username email');

        console.log(`[DriverController] update - Chauffeur ${req.params.id} mis à jour avec succès`);
        res.json(updatedDriver);
    } catch (error) {
        console.error('[DriverController] Erreur dans update:', error.message, error.stack);
        res.status(400).json({ message: error.message });
    }
};

// Supprimer un chauffeur
exports.delete = async (req, res) => {
    console.log(`[DriverController] Début de delete - ID: ${req.params.id}`);
    try {
        const driver = await Driver.findById(req.params.id);

        if (!driver) {
            console.warn(`[DriverController] delete - Chauffeur non trouvé (ID: ${req.params.id})`);
            return res.status(404).json({ message: 'Chauffeur non trouvé' });
        }

        // Vérifier s'il existe des plannings pour ce chauffeur
        const activeSchedules = await Schedule.find({
            driver: driver._id,
            status: 'assigned'
        });

        if (activeSchedules.length > 0) {
            console.warn(`[DriverController] delete - Conflit de plannings actifs (${activeSchedules.length} trouvés)`);
            return res.status(400).json({
                message: 'Ce chauffeur a des plannings actifs. Annulez-les avant de supprimer le chauffeur.',
                conflicts: activeSchedules
            });
        }

        // Vérifier si le chauffeur est assigné à un véhicule
        if (driver.currentVehicle) {
            await Vehicle.findByIdAndUpdate(driver.currentVehicle, { currentDriver: null });
            console.log(`[DriverController] delete - Véhicule ${driver.currentVehicle} libéré`);
        }

        // Mettre à jour l'utilisateur associé si nécessaire
        if (driver.user) {
            await User.findByIdAndUpdate(driver.user, { driver: null });
            console.log(`[DriverController] delete - Utilisateur ${driver.user} mis à jour avec driver=null`);
        }

        await Driver.deleteOne({ _id: driver._id });
        console.log(`[DriverController] delete - Chauffeur ${req.params.id} supprimé avec succès`);

        res.json({ message: 'Chauffeur supprimé avec succès' });
    } catch (error) {
        console.error('[DriverController] Erreur dans delete:', error.message, error.stack);
        res.status(500).json({ message: error.message });
    }
};

// Récupérer les chauffeurs disponibles (sans date de départ et sans véhicule assigné)
exports.getAvailable = async (req, res) => {
    console.log('[DriverController] Début de getAvailable');
    try {
        const drivers = await Driver.find({
            departureDate: null,
            currentVehicle: null
        });

        console.log(`[DriverController] getAvailable - ${drivers.length} chauffeurs disponibles trouvés`);
        res.json(drivers);
    } catch (error) {
        console.error('[DriverController] Erreur dans getAvailable:', error.message, error.stack);
        res.status(500).json({ message: error.message });
    }
};

// Récupérer les chauffeurs actifs (sans date de départ)
exports.getActive = async (req, res) => {
    console.log('[DriverController] Début de getActive');
    try {
        const drivers = await Driver.find({
            departureDate: null
        })
            .populate('currentVehicle', 'type brand model licensePlate')
            .populate('user', 'username email');

        console.log(`[DriverController] getActive - ${drivers.length} chauffeurs actifs trouvés`);
        res.json(drivers);
    } catch (error) {
        console.error('[DriverController] Erreur dans getActive:', error.message, error.stack);
        res.status(500).json({ message: error.message });
    }
};

// Récupérer les anciens chauffeurs (avec date de départ)
exports.getFormer = async (req, res) => {
    console.log('[DriverController] Début de getFormer');
    try {
        const drivers = await Driver.find({
            departureDate: { $ne: null }
        })
            .populate('currentVehicle', 'type brand model licensePlate')
            .populate('user', 'username email');

        console.log(`[DriverController] getFormer - ${drivers.length} anciens chauffeurs trouvés`);
        res.json(drivers);
    } catch (error) {
        console.error('[DriverController] Erreur dans getFormer:', error.message, error.stack);
        res.status(500).json({ message: error.message });
    }
};

// Télécharger et ajouter des photos à un chauffeur
exports.uploadPhotos = async (req, res) => {
    console.log(`[DriverController] Début de uploadPhotos - ID: ${req.params.id}, Nombre de fichiers: ${req.files?.length || 0}`);
    try {
        const driver = await Driver.findById(req.params.id);

        if (!driver) {
            console.warn(`[DriverController] uploadPhotos - Chauffeur non trouvé (ID: ${req.params.id})`);
            return res.status(404).json({ message: 'Chauffeur non trouvé' });
        }

        if (!req.files || req.files.length === 0) {
            console.warn('[DriverController] uploadPhotos - Aucun fichier téléchargé');
            return res.status(400).json({ message: 'Aucun fichier téléchargé' });
        }

        // Créer un tableau de chemins d'accès aux photos
        const photoPaths = req.files.map(file => file.path);

        // Ajouter les nouveaux chemins au tableau existant
        driver.photos = [...driver.photos, ...photoPaths];
        await driver.save();

        console.log(`[DriverController] uploadPhotos - ${photoPaths.length} photos ajoutées au chauffeur ${req.params.id}`);
        res.json({
            message: 'Photos du chauffeur ajoutées avec succès',
            driver: await Driver.findById(driver._id)
                .populate('currentVehicle', 'type brand model licensePlate')
                .populate('user', 'username email')
        });
    } catch (error) {
        console.error('[DriverController] Erreur dans uploadPhotos:', error.message, error.stack);
        res.status(500).json({ message: error.message });
    }
};

// Supprimer une photo d'un chauffeur
exports.deletePhoto = async (req, res) => {
    console.log(`[DriverController] Début de deletePhoto - ID: ${req.params.id}, Index: ${req.params.photoIndex}`);
    try {
        const { photoIndex } = req.params;
        const driver = await Driver.findById(req.params.id);

        if (!driver) {
            console.warn(`[DriverController] deletePhoto - Chauffeur non trouvé (ID: ${req.params.id})`);
            return res.status(404).json({ message: 'Chauffeur non trouvé' });
        }

        if (photoIndex < 0 || photoIndex >= driver.photos.length) {
            console.warn(`[DriverController] deletePhoto - Index de photo invalide (${photoIndex}) pour ${driver.photos.length} photos`);
            return res.status(400).json({ message: 'Index de photo invalide' });
        }

        // Supprimer la photo à l'index spécifié
        const deletedPhoto = driver.photos[photoIndex];
        driver.photos.splice(photoIndex, 1);
        await driver.save();

        console.log(`[DriverController] deletePhoto - Photo supprimée: ${deletedPhoto}`);
        res.json({
            message: 'Photo supprimée avec succès',
            driver: await Driver.findById(driver._id)
                .populate('currentVehicle', 'type brand model licensePlate')
                .populate('user', 'username email')
        });
    } catch (error) {
        console.error('[DriverController] Erreur dans deletePhoto:', error.message, error.stack);
        res.status(500).json({ message: error.message });
    }
};