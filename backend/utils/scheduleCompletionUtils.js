// utils/scheduleCompletionUtils.js
const Schedule = require('../models/scheduleModel');
const Payment = require('../models/paymentModel');
const { getUnpaidDays } = require('./paymentScheduleUtils');
const { updateDriverVehicleRelationship } = require('./driverVehicleUtils');

/**
 * Vérifie et met à jour automatiquement le statut des plannings basé sur leurs paiements
 * Cette fonction peut être exécutée périodiquement via CRON
 */
exports.checkScheduleCompletionByPayments = async () => {
    try {
        // Trouver tous les plannings assignés avec une date de fin passée
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const expiredSchedules = await Schedule.find({
            status: 'assigned',
            endDate: { $lt: today }
        }).populate('driver').populate('vehicle');

        let completedCount = 0;

        for (const schedule of expiredSchedules) {
            // Vérifier si tous les jours ont été payés
            const unpaidDays = await getUnpaidDays(schedule._id);

            if (unpaidDays.length === 0) {
                // Tous les jours sont payés, compléter le planning
                schedule.status = 'completed';
                await schedule.save();

                // Désassigner le véhicule du chauffeur
                if (schedule.driver && schedule.vehicle) {
                    await updateDriverVehicleRelationship(
                        schedule.driver._id,
                        schedule.vehicle._id,
                        false
                    );
                }

                completedCount++;
            }
        }

        return {
            checked: expiredSchedules.length,
            completed: completedCount
        };
    } catch (error) {
        console.error('Erreur lors de la vérification des plannings complétés:', error);
        throw error;
    }
};

/**
 * Mettre à jour le statut d'un planning spécifique basé sur ses paiements
 * @param {ObjectId} scheduleId - L'ID du planning à vérifier
 * @returns {Promise<boolean>} - true si le planning a été complété, false sinon
 */
exports.checkAndUpdateScheduleStatus = async (scheduleId) => {
    try {
        const schedule = await Schedule.findById(scheduleId)
            .populate('driver')
            .populate('vehicle');

        if (!schedule || schedule.status !== 'assigned' || !schedule.endDate) {
            return false;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const endDate = new Date(schedule.endDate);
        endDate.setHours(0, 0, 0, 0);

        // Si la date de fin est passée
        if (endDate < today) {
            // Vérifier si tous les jours ont été payés
            const unpaidDays = await getUnpaidDays(schedule._id);

            if (unpaidDays.length === 0) {
                // Tous les jours sont payés, compléter le planning
                schedule.status = 'completed';
                await schedule.save();

                // Désassigner le véhicule du chauffeur
                if (schedule.driver && schedule.vehicle) {
                    await updateDriverVehicleRelationship(
                        schedule.driver._id,
                        schedule.vehicle._id,
                        false
                    );
                }

                return true;
            }
        }

        return false;
    } catch (error) {
        console.error(`Erreur lors de la mise à jour du statut du planning ${scheduleId}:`, error);
        throw error;
    }
};

/**
 * Obtenir les statistiques de paiement pour un planning
 * @param {ObjectId} scheduleId - L'ID du planning
 * @returns {Promise<Object>} - Objet contenant les statistiques de paiement
 */
exports.getPaymentStatsForSchedule = async (scheduleId) => {
    try {
        const schedule = await Schedule.findById(scheduleId).populate('driver').populate('vehicle');

        if (!schedule) {
            return null;
        }

        const payments = await Payment.find({ schedule: scheduleId });

        const totalAmount = payments.reduce((total, payment) => total + payment.amount, 0);
        const averageAmount = totalAmount / payments.length;

        return {
            totalAmount,
            averageAmount,
            driver: schedule.driver,
            vehicle: schedule.vehicle
        };
    } catch (error) {
        console.error(`Une erreur s'est produite lors de la recherche des statistiques de paiement pour le planning ${scheduleId}:`, error);
        throw error;
    }
}