// utils/scheduleAutocompletion.js
const Schedule = require('../models/scheduleModel');
const { updateDriverVehicleRelationship } = require('./driverVehicleUtils');
const cron = require('node-cron');

// Fonction pour compléter automatiquement les plannings expirés
const completeExpiredSchedules = async () => {
    try {
        const now = new Date();

        // Trouver tous les plannings assignés dont la date de fin est passée
        const expiredSchedules = await Schedule.find({
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
        }).populate('driver').populate('vehicle');

        console.log(`Complétion automatique: ${expiredSchedules.length} plannings expirés trouvés`);

        // Pour chaque planning expiré
        for (const schedule of expiredSchedules) {
            console.log(`Complétion du planning #${schedule._id} (${schedule.driver?.firstName} ${schedule.driver?.lastName} avec ${schedule.vehicle?.brand} ${schedule.vehicle?.model})`);

            // Mettre à jour le planning
            schedule.status = 'completed';
            await schedule.save();

            // Désassigner le véhicule du chauffeur
            if (schedule.driver && schedule.vehicle) {
                await updateDriverVehicleRelationship(schedule.driver._id, schedule.vehicle._id, false);
            }
        }

        return expiredSchedules.length; // Retourner le nombre de plannings complétés
    } catch (error) {
        console.error('Erreur lors de la complétion automatique des plannings:', error);
        throw error;
    }
};

// Fonction pour activer les plannings en attente (pending) dont la date est arrivée
const activatePendingSchedules = async () => {
    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Trouver tous les plannings en attente (pending) dont la date est arrivée
        const pendingSchedules = await Schedule.find({
            status: 'pending',
            scheduleDate: { $lte: today }
        }).populate('driver').populate('vehicle');

        console.log(`Activation automatique: ${pendingSchedules.length} plannings en attente à activer`);

        // Pour chaque planning à activer
        for (const schedule of pendingSchedules) {
            console.log(`Activation du planning #${schedule._id} (${schedule.driver?.firstName} ${schedule.driver?.lastName} avec ${schedule.vehicle?.brand} ${schedule.vehicle?.model})`);

            // Vérifier si le chauffeur est disponible (pas de planning actif)
            const activeSchedules = await Schedule.find({
                driver: schedule.driver._id,
                status: 'assigned',
                _id: { $ne: schedule._id }
            });

            if (activeSchedules.length > 0) {
                console.log(`Le chauffeur ${schedule.driver?.firstName} ${schedule.driver?.lastName} a déjà un planning actif. Mise en attente du planning #${schedule._id}`);
                continue; // Ne pas activer ce planning pour le moment
            }

            // Mettre à jour le planning
            schedule.status = 'assigned';
            await schedule.save();

            // Assigner le véhicule au chauffeur
            await updateDriverVehicleRelationship(schedule.driver._id, schedule.vehicle._id, true);
        }

        return pendingSchedules.length; // Retourner le nombre de plannings activés
    } catch (error) {
        console.error('Erreur lors de l\'activation automatique des plannings:', error);
        throw error;
    }
};

// Configurer le job cron pour vérifier plus fréquemment
const startScheduleAutocompletion = () => {
    // Exécuter toutes les minutes pour une plus grande réactivité
    cron.schedule('* * * * *', async () => {
        await completeExpiredSchedules();
        await activatePendingSchedules();
    });

    // Exécuter également au démarrage de l'application
    completeExpiredSchedules();
    activatePendingSchedules();

    console.log('Service de gestion automatique des plannings démarré (vérification chaque minute)');
};

module.exports = {
    startScheduleAutocompletion,
    completeExpiredSchedules,
    activatePendingSchedules
};