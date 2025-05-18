// controllers/scheduleController.js
const Schedule = require('../models/scheduleModel');
const Driver = require('../models/driverModel');
const Vehicle = require('../models/vehicleModel');
const Payment = require('../models/paymentModel'); // Ajout de l'import manquant
const History = require('../models/historyModel');
const { updateDriverVehicleRelationship } = require('../utils/driverVehicleUtils');
const { completeExpiredSchedules, activatePendingSchedules } = require('../utils/scheduleAutocompletion');

// Fonction pour générer automatiquement les paiements pour chaque jour d'un planning
async function generateDailyPayments(scheduleId) {
    try {
        const schedule = await Schedule.findById(scheduleId)
            .populate('vehicle', 'dailyIncomeTarget');

        if (!schedule) {
            throw new Error('Planning non trouvé');
        }

        // Définir la date de début et de fin
        const startDate = new Date(schedule.scheduleDate);
        startDate.setHours(0, 0, 0, 0);

        let endDate;
        if (schedule.endDate) {
            endDate = new Date(schedule.endDate);
            endDate.setHours(23, 59, 59, 999);
        } else {
            // Si pas de date de fin, on génère juste pour la date de début
            endDate = new Date(startDate);
            endDate.setHours(23, 59, 59, 999);
        }

        // Créer un paiement pour chaque jour entre la date de début et de fin
        const dailyPayments = [];
        const currentDate = new Date(startDate);
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        // On ne génère des paiements que jusqu'à aujourd'hui
        const finalEndDate = endDate > today ? today : endDate;

        while (currentDate <= finalEndDate) {
            // Vérifier si un paiement existe déjà pour ce jour
            const existingPayment = await Payment.findOne({
                schedule: scheduleId,
                paymentDate: {
                    $gte: new Date(currentDate.setHours(0, 0, 0, 0)),
                    $lte: new Date(currentDate.setHours(23, 59, 59, 999))
                }
            });

            if (!existingPayment) {
                // Déterminer le montant cible (peut être null si pas d'objectif quotidien)
                const targetAmount = schedule.vehicle ? schedule.vehicle.dailyIncomeTarget || 0 : 0;

                // Créer un nouveau paiement avec statut "pending"
                const payment = new Payment({
                    schedule: scheduleId,
                    amount: 0, // Montant initial à 0, à modifier lors du paiement réel
                    paymentDate: new Date(currentDate),
                    paymentType: 'cash', // Type par défaut, à modifier lors du paiement réel
                    status: 'pending',
                    isMeetingTarget: false,
                    comments: 'Généré automatiquement'
                });

                const savedPayment = await payment.save();
                dailyPayments.push(savedPayment);
            }

            // Passer au jour suivant
            currentDate.setDate(currentDate.getDate() + 1);
            currentDate.setHours(0, 0, 0, 0);
        }

        if (dailyPayments.length > 0) {
            await History.create({
                eventType: 'schedule_payments_generated',
                module: 'schedule',
                entityId: scheduleId,
                newData: { paymentsGenerated: dailyPayments.length },
                performedBy: req.user?._id,
                description: `Génération de ${dailyPayments.length} paiements pour le planning ${scheduleId}`,
                ipAddress: req.ip,
                metadata: {
                    count: dailyPayments.length,
                    dates: dailyPayments.map(p => p.paymentDate)
                }
            });
        }

        return dailyPayments;
    } catch (error) {
        console.error('Erreur lors de la génération des paiements quotidiens:', error);
        throw error;
    }
}

async function completeExpiredDriverSchedules(driverId) {
    try {
        const now = new Date();
        // Rechercher tous les plannings assignés et expirés pour ce chauffeur
        const expiredSchedules = await Schedule.find({
            driver: driverId,
            status: 'assigned',
            $or: [
                // Si endDate est définie et déjà passée
                {
                    endDate: { $lt: now }
                },
                // Si endDate n'est pas définie, mais scheduleDate et shiftEnd sont passés
                {
                    endDate: null,
                    scheduleDate: { $lte: now },
                    shiftEnd: { $exists: true, $ne: null },
                    $expr: {
                        $lt: [
                            {
                                $dateFromParts: {
                                    year: { $year: "$scheduleDate" },
                                    month: { $month: "$scheduleDate" },
                                    day: { $dayOfMonth: "$scheduleDate" },
                                    hour: { $toInt: { $arrayElemAt: [{ $split: ["$shiftEnd", ":"] }, 0] } },
                                    minute: { $toInt: { $arrayElemAt: [{ $split: ["$shiftEnd", ":"] }, 1] } }
                                }
                            },
                            now
                        ]
                    }
                },
                // Si uniquement scheduleDate est définie (sans endDate et sans shiftEnd), 
                // le planning est pour une journée complète et doit être complété après 23:59:59
                {
                    endDate: null,
                    shiftEnd: { $exists: false },
                    scheduleDate: {
                        $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate())
                    }
                }
            ]
        }).populate('vehicle');
        // Pour chaque planning expiré
        for (const schedule of expiredSchedules) {
            console.log(`Complétion automatique du planning #${schedule._id} pour le chauffeur ${driverId}`);
            // Mettre à jour le planning
            schedule.status = 'completed';
            await schedule.save();
            // Désassigner le véhicule du chauffeur
            if (schedule.vehicle) {
                await updateDriverVehicleRelationship(driverId, schedule.vehicle._id, false);
            }
        }
        return expiredSchedules.length; // Retourner le nombre de plannings complétés
    } catch (error) {
        console.error(`Erreur lors de la complétion des plannings du chauffeur ${driverId}:`, error);
        throw error;
    }
}
// Récupérer tous les plannings
exports.getAll = async (req, res) => {
    try {
        const schedules = await Schedule.find()
            .populate('driver', 'firstName lastName')
            .populate('vehicle', 'type brand model licensePlate')
            .sort({ scheduleDate: 1 });
        res.json(schedules);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// Récupérer un planning par ID
exports.getById = async (req, res) => {
    try {
        const schedule = await Schedule.findById(req.params.id)
            .populate('driver', 'firstName lastName')
            .populate('vehicle', 'type brand model licensePlate');

        if (!schedule) {
            return res.status(404).json({ message: 'Planning non trouvé' });
        }
        res.json(schedule);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// Fonction utilitaire pour vérifier les chevauchements de planning
async function checkOverlappingSchedule(driverId, vehicleId, scheduleDate, endDate, excludeId = null) {
    const start = new Date(scheduleDate);
    const end = endDate ? new Date(endDate) : null;
    // Construire la requête pour vérifier les chevauchements
    let query = {
        $or: [{ driver: driverId }, { vehicle: vehicleId }],
        status: { $in: ['pending', 'assigned'] } // Vérifier les plannings en attente aussi
    };
    // Si un ID est fourni, l'exclure de la recherche (pour les mises à jour)
    if (excludeId) {
        query._id = { $ne: excludeId };
    }
    if (end) {
        // Si une date de fin est fournie, vérifier les chevauchements sur toute la période
        query.$and = [
            { scheduleDate: { $lte: end } },
            {
                $or: [
                    { endDate: { $gte: start } },
                    { endDate: null }
                ]
            }
        ];
    } else {
        // Si c'est une affectation sans date de fin ou pour une journée
        query.$and = [
            {
                $or: [
                    // Plannings qui commencent ce jour ou avant
                    { scheduleDate: { $lte: start } },
                    // Plannings qui finissent ce jour ou après
                    { endDate: { $gte: start } }
                ]
            },
            {
                $or: [
                    // Plannings qui n'ont pas de date de fin
                    { endDate: null },
                    // Plannings dont la date de fin est après la date de début
                    { endDate: { $gte: start } }
                ]
            }
        ];
    }
    return await Schedule.findOne(query)
        .populate('driver', 'firstName lastName')
        .populate('vehicle', 'type brand model licensePlate');
}
// Créer un nouveau planning
exports.create = async (req, res) => {
    try {
        const { driverId, vehicleId, scheduleDate, endDate, shiftStart, shiftEnd, notes } = req.body;
        // Validation des champs requis
        if (!driverId || !vehicleId || !scheduleDate) {
            return res.status(400).json({ message: 'Chauffeur, véhicule et date sont requis' });
        }
        // Vérifier que le chauffeur existe
        const driver = await Driver.findById(driverId);
        if (!driver) {
            return res.status(404).json({ message: 'Chauffeur non trouvé' });
        }
        // Vérifier si le chauffeur est actif
        if (driver.departureDate !== null) {
            return res.status(400).json({ message: 'Le chauffeur n\'est plus en service' });
        }
        // Vérifier que le véhicule existe et est actif
        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle) {
            return res.status(404).json({ message: 'Véhicule non trouvé' });
        }
        if (vehicle.status !== 'active') {
            return res.status(400).json({ message: 'Le véhicule doit être actif pour être planifié' });
        }
        // Vérifier si le planning précédent du chauffeur est expiré mais pas encore complété
        // et le compléter automatiquement si nécessaire
        await completeExpiredDriverSchedules(driverId);
        // Vérifier les chevauchements de planning
        const overlappingSchedule = await checkOverlappingSchedule(
            driverId,
            vehicleId,
            scheduleDate,
            endDate
        );
        if (overlappingSchedule) {
            return res.status(400).json({
                message: 'Ce chauffeur ou ce véhicule est déjà planifié sur cette période',
                conflict: overlappingSchedule
            });
        }
        // Déterminer le statut initial du planning
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Convertir la date de planification en objet Date
        const scheduleDay = new Date(scheduleDate);
        scheduleDay.setHours(0, 0, 0, 0);
        // Si la date du planning est dans le futur, on le met en attente (pending)
        // Sinon, vérifier si on peut l'assigner immédiatement
        let status = 'pending';
        if (scheduleDay.getTime() <= today.getTime()) {
            // Vérifier si le chauffeur a déjà un planning actif aujourd'hui
            const activeSchedules = await Schedule.find({
                driver: driverId,
                status: 'assigned'
            });
            if (activeSchedules.length === 0) {
                status = 'assigned'; // Le chauffeur n'a pas de planning actif, on peut assigner directement
            }
        }
        // Créer le nouveau planning
        const schedule = new Schedule({
            driver: driverId,
            vehicle: vehicleId,
            scheduleDate: new Date(scheduleDate),
            endDate: endDate ? new Date(endDate) : null,
            shiftStart,  // Optionnel
            shiftEnd,    // Optionnel
            notes,
            status: status
        });
        const savedSchedule = await schedule.save();

        // Générer automatiquement les paiements quotidiens pour ce planning
        try {
            await generateDailyPayments(savedSchedule._id);
        } catch (error) {
            console.error('Erreur lors de la génération des paiements:', error);
            // On ne supprime pas le planning si la génération des paiements échoue
            // mais on log l'erreur pour pouvoir la tracer
        }

        // Si le planning est assigné (pas en attente), mettre à jour les relations entre chauffeur et véhicule
        if (status === 'assigned') {
            try {
                await updateDriverVehicleRelationship(driverId, vehicleId, true);
            } catch (error) {
                // Si la mise à jour des relations échoue, supprimer le planning créé
                await Schedule.findByIdAndDelete(savedSchedule._id);
                return res.status(400).json({ message: error.message });
            }
        }
        // Récupérer le planning complet avec les informations du chauffeur et du véhicule
        const completeSchedule = await Schedule.findById(savedSchedule._id)
            .populate('driver', 'firstName lastName')
            .populate('vehicle', 'type brand model licensePlate');

        await History.create({
            eventType: 'schedule_create',
            module: 'schedule',
            entityId: savedSchedule._id,
            newData: {
                ...savedSchedule.toObject(),
                driver: {
                    firstName: completeSchedule.driver.firstName,
                    lastName: completeSchedule.driver.lastName
                },
                vehicle: {
                    brand: completeSchedule.vehicle.brand,
                    model: completeSchedule.vehicle.model,
                    licensePlate: completeSchedule.vehicle.licensePlate
                }
            },
            performedBy: req.user ? req.user._id : null,
            description: `Création d'un planning pour ${completeSchedule.driver.firstName} ${completeSchedule.driver.lastName} avec le véhicule ${completeSchedule.vehicle.brand} ${completeSchedule.vehicle.model} (${completeSchedule.vehicle.licensePlate})`,
            ipAddress: req.ip,
            metadata: {
                driverId: completeSchedule.driver._id,
                vehicleId: completeSchedule.vehicle._id
            }
        });

        res.status(201).json(completeSchedule);
    } catch (error) {
        console.error('Erreur lors de la création du planning:', error);
        res.status(400).json({ message: error.message });
    }
};
// Mettre à jour un planning
exports.update = async (req, res) => {
    try {
        const { driverId, vehicleId, scheduleDate, endDate, shiftStart, shiftEnd, notes, status } = req.body;
        // Vérifier que le planning existe
        const existingSchedule = await Schedule.findById(req.params.id);
        if (!existingSchedule) {
            return res.status(404).json({ message: 'Planning non trouvé' });
        }

        // Vérifier si les dates ont changé pour mettre à jour les paiements
        const dateChanged = (
            (scheduleDate && scheduleDate !== existingSchedule.scheduleDate.toISOString().split('T')[0]) ||
            (endDate !== undefined && endDate !== (existingSchedule.endDate ? existingSchedule.endDate.toISOString().split('T')[0] : null))
        );
        const originalDriverId = existingSchedule.driver;
        const originalVehicleId = existingSchedule.vehicle;
        const newDriverId = driverId || originalDriverId;
        const newVehicleId = vehicleId || originalVehicleId;
        // Si on change le chauffeur, vérifier qu'il existe et est en service
        if (driverId && driverId !== originalDriverId.toString()) {
            const driver = await Driver.findById(driverId);
            if (!driver) {
                return res.status(404).json({ message: 'Chauffeur non trouvé' });
            }
            if (driver.departureDate !== null) {
                return res.status(400).json({ message: 'Le chauffeur n\'est plus en service' });
            }
        }
        // Si on change le véhicule, vérifier qu'il existe et est actif
        if (vehicleId && vehicleId !== originalVehicleId.toString()) {
            const vehicle = await Vehicle.findById(vehicleId);
            if (!vehicle) {
                return res.status(404).json({ message: 'Véhicule non trouvé' });
            }
            if (vehicle.status !== 'active') {
                return res.status(400).json({ message: 'Le véhicule doit être actif pour être planifié' });
            }
        }
        // Vérifier les chevauchements si on modifie le chauffeur, le véhicule ou les dates
        if ((driverId && driverId !== originalDriverId.toString()) ||
            (vehicleId && vehicleId !== originalVehicleId.toString()) ||
            (scheduleDate && scheduleDate !== existingSchedule.scheduleDate.toISOString().split('T')[0]) ||
            (endDate !== undefined && endDate !== (existingSchedule.endDate ? existingSchedule.endDate.toISOString().split('T')[0] : null))) {
            const checkScheduleDate = scheduleDate || existingSchedule.scheduleDate;
            const checkEndDate = endDate !== undefined ? endDate : existingSchedule.endDate;
            const overlappingSchedule = await checkOverlappingSchedule(
                newDriverId,
                newVehicleId,
                checkScheduleDate,
                checkEndDate,
                req.params.id // Exclure le planning actuel des vérifications
            );
            if (overlappingSchedule) {
                return res.status(400).json({
                    message: 'Ce planning chevauche un planning existant pour ce chauffeur ou ce véhicule',
                    conflict: overlappingSchedule
                });
            }
        }
        // Déterminer le statut du planning si la date est modifiée et que le statut n'est pas spécifié
        if (scheduleDate && !status) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const scheduleDay = new Date(scheduleDate);
            scheduleDay.setHours(0, 0, 0, 0);
            if (scheduleDay > today && existingSchedule.status !== 'completed' && existingSchedule.status !== 'canceled') {
                req.body.status = 'pending';
            } else if (scheduleDay <= today && existingSchedule.status === 'pending') {
                // Vérifier si le chauffeur a déjà un planning actif
                const activeSchedules = await Schedule.find({
                    driver: newDriverId,
                    status: 'assigned',
                    _id: { $ne: req.params.id }
                });
                if (activeSchedules.length === 0) {
                    req.body.status = 'assigned';
                }
            }
        }
        // Mettre à jour le planning
        const schedule = await Schedule.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        )
            .populate('driver', 'firstName lastName')
            .populate('vehicle', 'type brand model licensePlate');

        // Si la date a changé, on met à jour les paiements
        if (dateChanged) {
            try {
                // Pour simplifier, on pourrait régénérer tous les paiements
                // Cette partie peut être optimisée selon les besoins exacts
                await generateDailyPayments(schedule._id);
            } catch (error) {
                console.error('Erreur lors de la mise à jour des paiements:', error);
                // On continue malgré l'erreur mais on la log
            }
        }
        try {
            // Gérer les relations chauffeur-véhicule en fonction du statut
            const newStatus = status || schedule.status;
            const oldStatus = existingSchedule.status;
            // Si on passe de pending à assigned, assigner le véhicule au chauffeur
            if (newStatus === 'assigned' && oldStatus === 'pending') {
                await updateDriverVehicleRelationship(newDriverId, newVehicleId, true);
            }
            // Si on passe de assigned à pending, completed ou canceled, désassigner le véhicule
            else if (oldStatus === 'assigned' && (newStatus === 'pending' || newStatus === 'completed' || newStatus === 'canceled')) {
                await updateDriverVehicleRelationship(originalDriverId, originalVehicleId, false);
            }
            // Si le chauffeur ou le véhicule a changé et le statut est assigned
            else if (newStatus === 'assigned' &&
                ((driverId && driverId !== originalDriverId.toString()) ||
                    (vehicleId && vehicleId !== originalVehicleId.toString()))) {
                // Désassigner l'ancien chauffeur de son véhicule si nécessaire
                if (driverId && driverId !== originalDriverId.toString()) {
                    await updateDriverVehicleRelationship(originalDriverId, originalVehicleId, false);
                    await updateDriverVehicleRelationship(driverId, newVehicleId, true);
                } else if (vehicleId && vehicleId !== originalVehicleId.toString()) {
                    await updateDriverVehicleRelationship(newDriverId, originalVehicleId, false);
                    await updateDriverVehicleRelationship(newDriverId, vehicleId, true);
                }
            }
        } catch (error) {
            // Si une erreur survient dans la mise à jour des relations, annuler les changements
            await Schedule.findByIdAndUpdate(
                req.params.id,
                existingSchedule,
                { new: false }
            );
            return res.status(400).json({ message: error.message });
        }
        res.json(schedule);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
// Supprimer un planning
exports.delete = async (req, res) => {
    try {
        const schedule = await Schedule.findById(req.params.id)
            .populate('driver', 'firstName lastName')
            .populate('vehicle', 'brand model licensePlate');

        if (!schedule) {
            return res.status(404).json({ message: 'Planning non trouvé' });
        }

        // Supprimer tous les paiements associés à ce planning
        await Payment.deleteMany({ schedule: req.params.id });

        // Supprimer les relations chauffeur-véhicule si le planning est actif
        if (schedule.status === 'assigned') {
            await updateDriverVehicleRelationship(schedule.driver._id, schedule.vehicle._id, false);
        }

        await Schedule.findByIdAndDelete(req.params.id);

        // Enregistrement dans l'historique
        await History.create({
            eventType: 'schedule_delete',
            module: 'schedule',
            entityId: req.params.id,
            oldData: {
                driver: {
                    firstName: schedule.driver.firstName,
                    lastName: schedule.driver.lastName
                },
                vehicle: {
                    brand: schedule.vehicle.brand,
                    model: schedule.vehicle.model,
                    licensePlate: schedule.vehicle.licensePlate
                },
                scheduleDate: schedule.scheduleDate,
                endDate: schedule.endDate,
                status: schedule.status
            },
            performedBy: req.user?._id,
            description: `Suppression du planning pour ${schedule.driver.firstName} ${schedule.driver.lastName} avec le véhicule ${schedule.vehicle.brand} ${schedule.vehicle.model} (${schedule.vehicle.licensePlate})`,
            ipAddress: req.ip
        });

        res.json({ message: 'Planning et paiements associés supprimés avec succès' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// Changer le statut d'un planning
// Changer le statut d'un planning
exports.changeStatus = async (req, res) => {
    try {
        const { status } = req.body;
        // Vérifier que le statut est valide
        if (!['pending', 'assigned', 'completed', 'canceled'].includes(status)) {
            return res.status(400).json({ message: 'Statut invalide' });
        }

        const existingSchedule = await Schedule.findById(req.params.id)
            .populate('driver', 'firstName lastName')
            .populate('vehicle', 'brand model licensePlate');

        if (!existingSchedule) {
            return res.status(404).json({ message: 'Planning non trouvé' });
        }

        // Si on passe à "assigned", vérifier si le chauffeur a déjà un planning actif
        if (status === 'assigned' && existingSchedule.status !== 'assigned') {
            const activeSchedules = await Schedule.find({
                driver: existingSchedule.driver._id,
                status: 'assigned',
                _id: { $ne: req.params.id }
            });
            if (activeSchedules.length > 0) {
                return res.status(400).json({
                    message: 'Ce chauffeur a déjà un planning actif. Veuillez d\'abord terminer ou annuler ce planning.',
                    conflict: activeSchedules[0]
                });
            }
        }

        // Préparer les mises à jour
        const updateData = { status };

        // Si le statut est "completed" ou "canceled" et qu'il n'y a pas de date de fin,
        // définir la date de fin sur la date actuelle
        if ((status === 'completed' || status === 'canceled') && !existingSchedule.endDate) {
            const now = new Date();
            // Si le planning n'a pas de shiftEnd précisé, on utilise la date du jour à 23:59:59
            // Sinon, on utilise la date du jour avec l'heure de fin de service
            if (!existingSchedule.shiftEnd) {
                updateData.endDate = new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    now.getDate(),
                    23, 59, 59, 999
                );
            } else {
                const [hours, minutes] = existingSchedule.shiftEnd.split(':').map(Number);
                updateData.endDate = new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    now.getDate(),
                    hours, minutes, 0, 0
                );
            }
        }

        const schedule = await Schedule.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        )
            .populate('driver', 'firstName lastName')
            .populate('vehicle', 'brand model licensePlate');

        // Gérer les relations chauffeur-véhicule en fonction du changement de statut
        if (status === 'assigned' && existingSchedule.status === 'pending') {
            await updateDriverVehicleRelationship(existingSchedule.driver._id, existingSchedule.vehicle._id, true);
        }
        else if ((status === 'completed' || status === 'canceled' || status === 'pending') && existingSchedule.status === 'assigned') {
            await updateDriverVehicleRelationship(existingSchedule.driver._id, existingSchedule.vehicle._id, false);
        }

        // Enregistrement dans l'historique
        await History.create({
            eventType: `schedule_status_change`,
            module: 'schedule',
            entityId: req.params.id,
            oldData: {
                status: existingSchedule.status,
                endDate: existingSchedule.endDate,
                driver: {
                    firstName: existingSchedule.driver.firstName,
                    lastName: existingSchedule.driver.lastName
                },
                vehicle: {
                    brand: existingSchedule.vehicle.brand,
                    model: existingSchedule.vehicle.model,
                    licensePlate: existingSchedule.vehicle.licensePlate
                }
            },
            newData: {
                status,
                endDate: updateData.endDate || existingSchedule.endDate,
                driver: {
                    firstName: schedule.driver.firstName,
                    lastName: schedule.driver.lastName
                },
                vehicle: {
                    brand: schedule.vehicle.brand,
                    model: schedule.vehicle.model,
                    licensePlate: schedule.vehicle.licensePlate
                }
            },
            performedBy: req.user?._id,
            description: `Changement de statut du planning pour ${schedule.driver.firstName} ${schedule.driver.lastName} de "${existingSchedule.status}" à "${status}"${updateData.endDate ? ` avec date de fin automatique le ${updateData.endDate.toLocaleDateString()}` : ''}`,
            ipAddress: req.ip,
            metadata: {
                oldStatus: existingSchedule.status,
                newStatus: status,
                endDateUpdated: !!updateData.endDate
            }
        });

        res.json(schedule);

        // Si le planning est complété, mettre à jour les paiements manquants
        if (status === 'completed') {
            try {
                await generateDailyPayments(req.params.id);
            } catch (error) {
                console.error('Erreur lors de la mise à jour des paiements:', error);
            }
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
// Récupérer les plannings actuels (en cours)
exports.getCurrent = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const schedules = await Schedule.find({
            scheduleDate: { $lte: today },
            $or: [
                { endDate: { $gte: today } },
                { endDate: null }
            ],
            status: 'assigned'
        })
            .populate('driver', 'firstName lastName')
            .populate('vehicle', 'type brand model licensePlate')
            .sort({ scheduleDate: 1 });

        res.json(schedules);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// Récupérer les plannings futurs (en attente)
exports.getFuture = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const schedules = await Schedule.find({
            $or: [
                // Plannings avec date future
                { scheduleDate: { $gt: today }, status: 'pending' },
                // Plannings déjà configurés pour le futur
                { scheduleDate: { $gt: today }, status: 'assigned' }
            ]
        })
            .populate('driver', 'firstName lastName')
            .populate('vehicle', 'type brand model licensePlate')
            .sort({ scheduleDate: 1 });
        res.json(schedules);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// Récupérer les plannings par chauffeur
exports.getByDriver = async (req, res) => {
    try {
        const schedules = await Schedule.find({ driver: req.params.driverId })
            .populate('driver', 'firstName lastName')
            .populate('vehicle', 'type brand model licensePlate')
            .sort({ scheduleDate: 1 });
        res.json(schedules);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// Récupérer les plannings par véhicule
exports.getByVehicle = async (req, res) => {
    try {
        const schedules = await Schedule.find({ vehicle: req.params.vehicleId })
            .populate('driver', 'firstName lastName')
            .populate('vehicle', 'type brand model licensePlate')
            .sort({ scheduleDate: 1 });
        res.json(schedules);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// Récupérer les plannings par date
exports.getByDate = async (req, res) => {
    try {
        const dateStr = req.params.date;
        const date = new Date(dateStr);
        // Vérifier que la date est valide
        if (isNaN(date.getTime())) {
            return res.status(400).json({ message: 'Format de date invalide' });
        }
        // Définir le début et la fin de la journée
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        // Trouver tous les plannings actifs pour cette date
        const schedules = await Schedule.find({
            $or: [
                // Plannings qui commencent ce jour
                { scheduleDate: { $gte: startOfDay, $lte: endOfDay } },
                // Plannings qui finissent ce jour
                { endDate: { $gte: startOfDay, $lte: endOfDay } },
                // Plannings qui englobent ce jour
                {
                    $and: [
                        { scheduleDate: { $lte: startOfDay } },
                        {
                            $or: [
                                { endDate: { $gte: endOfDay } },
                                { endDate: null } // Plannings sans date de fin
                            ]
                        }
                    ]
                }
            ]
        })
            .populate('driver', 'firstName lastName')
            .populate('vehicle', 'type brand model licensePlate')
            .sort({ scheduleDate: 1 });
        res.json(schedules);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// Récupérer les plannings par période
exports.getByPeriod = async (req, res) => {
    try {
        const { start, end } = req.query;
        if (!start || !end) {
            return res.status(400).json({ message: 'Les dates de début et de fin sont requises' });
        }
        const startDate = new Date(start);
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);  // Pour inclure toute la journée de fin
        const schedules = await Schedule.find({
            $or: [
                // Débute dans la période
                { scheduleDate: { $gte: startDate, $lte: endDate } },
                // Finit dans la période
                { endDate: { $gte: startDate, $lte: endDate } },
                // Englobe la période complètement
                {
                    $and: [
                        { scheduleDate: { $lte: startDate } },
                        {
                            $or: [
                                { endDate: { $gte: endDate } },
                                { endDate: null }
                            ]
                        }
                    ]
                }
            ]
        })
            .populate('driver', 'firstName lastName')
            .populate('vehicle', 'type brand model licensePlate')
            .sort({ scheduleDate: 1 });
        res.json(schedules);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// Exécuter la vérification des plannings expirés manuellement
exports.checkExpiredSchedules = async (req, res) => {
    try {
        const { completeExpiredSchedules } = require('../utils/scheduleAutocompletion');
        await completeExpiredSchedules();
        res.json({ message: 'Vérification des plannings expirés effectuée avec succès' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.generatePaymentsForExistingSchedules = async (req, res) => {
    try {
        const schedules = await Schedule.find();
        const results = [];

        for (const schedule of schedules) {
            try {
                const payments = await generateDailyPayments(schedule._id);
                results.push({
                    scheduleId: schedule._id,
                    paymentsGenerated: payments.length
                });
            } catch (error) {
                results.push({
                    scheduleId: schedule._id,
                    error: error.message
                });
            }
        }

        res.json({
            message: 'Génération des paiements terminée',
            results
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.completeExpiredDriverSchedules = completeExpiredDriverSchedules;