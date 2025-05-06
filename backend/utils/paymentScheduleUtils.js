// utils/paymentScheduleUtils.js
const Schedule = require('../models/scheduleModel');
const Payment = require('../models/paymentModel');

/**
 * Vérifie si un schedule a été payé pour une date spécifique
 * @param {ObjectId} scheduleId - L'ID du planning
 * @param {Date} paymentDate - La date du paiement
 * @returns {Promise<boolean>} - true si déjà payé, false sinon
 */
exports.isSchedulePaidForDate = async (scheduleId, date) => {
    try {
        const Payment = require('../models/paymentModel');

        // Normaliser la date pour comparer seulement jour/mois/année
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);

        const nextDay = new Date(checkDate);
        nextDay.setDate(nextDay.getDate() + 1);

        // Rechercher les paiements pour ce planning et cette date
        const payment = await Payment.findOne({
            schedule: scheduleId,
            paymentDate: {
                $gte: checkDate,
                $lt: nextDay
            }
        });

        return !!payment;
    } catch (error) {
        console.error('Erreur dans isSchedulePaidForDate:', error);
        // En cas d'erreur, on suppose qu'il n'y a pas de paiement
        return false;
    }
};

/**
 * Vérifie si un paiement est le dernier pour un planning
 * @param {ObjectId} scheduleId - L'ID du planning
 * @param {Date} paymentDate - La date du paiement
 * @returns {Promise<boolean>} - true si c'est le dernier paiement, false sinon
 */
exports.isLastPaymentForSchedule = async (scheduleId, date) => {
    try {
        const Schedule = require('../models/scheduleModel');

        // Obtenir les informations du planning
        const schedule = await Schedule.findById(scheduleId);
        if (!schedule) return false;

        // Si le planning n'a pas de date de fin, ce n'est pas le dernier paiement
        if (!schedule.endDate) return false;

        // Comparer les dates (jour seulement)
        const paymentDate = new Date(date);
        paymentDate.setHours(0, 0, 0, 0);

        const endDate = new Date(schedule.endDate);
        endDate.setHours(0, 0, 0, 0);

        // C'est le dernier paiement si la date du paiement est égale ou postérieure à la date de fin
        return paymentDate >= endDate;
    } catch (error) {
        console.error('Erreur dans isLastPaymentForSchedule:', error);
        return false;
    }
};

/**
 * Vérifie si tous les jours d'un planning jusqu'à une date donnée ont été payés
 * @param {ObjectId} scheduleId - L'ID du planning
 * @param {Date} currentDate - La date jusqu'à laquelle vérifier
 * @returns {Promise<boolean>} - true si tous les jours ont été payés, false sinon
 */
exports.areAllDaysPaidUntil = async (scheduleId, currentDate) => {
    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) return false;

    const startDate = new Date(schedule.scheduleDate);
    startDate.setHours(0, 0, 0, 0);

    const checkDate = new Date(currentDate);
    checkDate.setHours(0, 0, 0, 0);

    // Générer toutes les dates de startDate à currentDate
    const dates = [];
    const tempDate = new Date(startDate);
    while (tempDate <= checkDate) {
        dates.push(new Date(tempDate));
        tempDate.setDate(tempDate.getDate() + 1);
    }

    // Récupérer tous les paiements pour ce planning
    const payments = await Payment.find({
        schedule: scheduleId,
        paymentDate: { $gte: startDate, $lte: checkDate }
    });

    // Vérifier si chaque date a un paiement
    for (const date of dates) {
        const dateStr = date.toISOString().split('T')[0];
        const paymentExists = payments.some(payment => {
            const paymentDateStr = payment.paymentDate.toISOString().split('T')[0];
            return paymentDateStr === dateStr;
        });

        if (!paymentExists) return false;
    }

    return true;
};

/**
 * Compléter un planning si tous les paiements ont été effectués
 * @param {ObjectId} scheduleId - L'ID du planning
 * @returns {Promise<boolean>} - true si le planning a été complété, false sinon
 */
exports.completeScheduleIfAllPaid = async (scheduleId) => {
    try {
        const Schedule = require('../models/scheduleModel');

        // Obtenir le planning
        const schedule = await Schedule.findById(scheduleId);
        if (!schedule || schedule.status !== 'assigned') return;

        // Vérifier s'il y a des jours non payés
        const unpaidDays = await exports.getUnpaidDays(scheduleId);

        // Si tous les jours sont payés, marquer le planning comme complété
        if (unpaidDays.length === 0 && schedule.endDate) {
            schedule.status = 'completed';
            await schedule.save();
        }
    } catch (error) {
        console.error('Erreur dans completeScheduleIfAllPaid:', error);
        // Ne pas propager l'erreur, juste logger
    }
};

/**
 * Obtenir les jours non payés d'un planning
 * @param {ObjectId} scheduleId - L'ID du planning
 * @returns {Promise<Array<Date>>} - Tableau des dates non payées
 */
exports.getUnpaidDays = async (scheduleId) => {
    try {
        const Schedule = require('../models/scheduleModel');
        const Payment = require('../models/paymentModel');

        // Obtenir le planning
        const schedule = await Schedule.findById(scheduleId);
        if (!schedule) return [];

        // Déterminer les dates de début et de fin
        const startDate = new Date(schedule.scheduleDate);
        startDate.setHours(0, 0, 0, 0);

        // Si pas de date de fin, utiliser la date actuelle
        let endDate;
        if (schedule.endDate) {
            endDate = new Date(schedule.endDate);
        } else {
            endDate = new Date();
        }
        endDate.setHours(23, 59, 59, 999);

        // Si la date de début est dans le futur ou si la fin est avant le début,
        // retourner un tableau vide
        if (startDate > new Date() || endDate < startDate) {
            return [];
        }

        // Obtenir tous les paiements pour ce planning
        const payments = await Payment.find({
            schedule: scheduleId,
            status: { $ne: 'rejected' } // Ignorer les paiements rejetés
        });

        // Normaliser les dates de paiement pour comparer seulement jour/mois/année
        const paidDates = payments.map(p => {
            const date = new Date(p.paymentDate);
            date.setHours(0, 0, 0, 0);
            return date.getTime(); // Convertir en timestamp pour comparaison facile
        });

        // Créer un tableau de tous les jours entre start et end
        const allDays = [];
        let currentDay = new Date(startDate);

        while (currentDay <= endDate) {
            allDays.push(new Date(currentDay));
            currentDay.setDate(currentDay.getDate() + 1);
        }

        // Filtrer pour ne garder que les jours non payés
        const unpaidDays = allDays.filter(day => {
            return !paidDates.includes(day.getTime());
        });

        return unpaidDays;
    } catch (error) {
        console.error('Erreur dans getUnpaidDays:', error);
        return [];
    }
};