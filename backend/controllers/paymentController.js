// controllers/paymentController.js
const Payment = require('../models/paymentModel');
const Schedule = require('../models/scheduleModel');
const Vehicle = require('../models/vehicleModel');
const Driver = require('../models/driverModel');
const Media = require('../models/mediaModel');
const mongoose = require('mongoose');
const {
    isSchedulePaidForDate,
    isLastPaymentForSchedule,
    completeScheduleIfAllPaid,
    getUnpaidDays
} = require('../utils/paymentScheduleUtils');

// Récupérer tous les paiements
exports.getAll = async (req, res) => {
    try {
        // Utiliser lean() pour améliorer les performances et obtenir des objets JS simples
        const payments = await Payment.find()
            .populate({
                path: 'schedule',
                populate: [
                    { path: 'driver', select: 'firstName lastName' },
                    { path: 'vehicle', select: 'brand model licensePlate' }
                ]
            })
            .populate('media')
            .sort({ paymentDate: -1 })
            .lean();
        // Populer manuellement les drivers et vehicles pour gérer les références invalides
        for (const payment of payments) {
            if (payment.schedule) {
                // Populer driver de manière sécurisée
                if (payment.schedule.driver) {
                    try {
                        const driver = await Driver.findById(payment.schedule.driver).select('firstName lastName').lean();
                        payment.schedule.driver = driver || { firstName: 'Inconnu', lastName: '' };
                    } catch (err) {
                        payment.schedule.driver = { firstName: 'Inconnu', lastName: '' };
                    }
                } else {
                    payment.schedule.driver = { firstName: 'Inconnu', lastName: '' };
                }
                // Populer vehicle de manière sécurisée
                if (payment.schedule.vehicle) {
                    try {
                        const vehicle = await Vehicle.findById(payment.schedule.vehicle)
                            .select('type brand model licensePlate dailyIncomeTarget').lean();
                        payment.schedule.vehicle = vehicle || {
                            type: 'unknown',
                            brand: 'Inconnu',
                            model: '',
                            licensePlate: 'N/A',
                            dailyIncomeTarget: 0
                        };
                    } catch (err) {
                        payment.schedule.vehicle = {
                            type: 'unknown',
                            brand: 'Inconnu',
                            model: '',
                            licensePlate: 'N/A',
                            dailyIncomeTarget: 0
                        };
                    }
                } else {
                    payment.schedule.vehicle = {
                        type: 'unknown',
                        brand: 'Inconnu',
                        model: '',
                        licensePlate: 'N/A',
                        dailyIncomeTarget: 0
                    };
                }
            } else {
                payment.schedule = {
                    _id: null,
                    scheduleDate: null,
                    endDate: null,
                    status: 'unknown',
                    driver: { firstName: 'Inconnu', lastName: '' },
                    vehicle: {
                        type: 'unknown',
                        brand: 'Inconnu',
                        model: '',
                        licensePlate: 'N/A',
                        dailyIncomeTarget: 0
                    }
                };
            }
        }
        res.json(payments);
    } catch (error) {
        console.error('Erreur getAll:', error);
        res.status(500).json({ message: error.message });
    }
};

// Récupérer un paiement par ID
exports.getById = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id)
            .populate({
                path: 'schedule',
                select: '_id scheduleDate endDate status',
                populate: [
                    { path: 'driver', select: 'firstName lastName' },
                    { path: 'vehicle', select: 'type brand model licensePlate dailyIncomeTarget' }
                ]
            })
            .populate('media');
        if (!payment) {
            return res.status(404).json({ message: 'Paiement non trouvé' });
        }
        res.json(payment);
    } catch (error) {
        console.error('Erreur getById:', error);
        res.status(500).json({ message: error.message });
    }
};

// Récupérer les paiements par planning
exports.getBySchedule = async (req, res) => {
    try {
        const { scheduleId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(scheduleId)) {
            return res.status(400).json({ message: 'ID de planning invalide' });
        }

        const payments = await Payment.find({ schedule: scheduleId })
            .populate({
                path: 'schedule',
                populate: [
                    { path: 'driver', select: 'firstName lastName' },
                    { path: 'vehicle', select: 'type brand model licensePlate' }
                ]
            })
            .populate('media')
            .sort({ paymentDate: 1 });
        res.json(payments);
    } catch (error) {
        console.error('Erreur lors de la récupération des paiements par planning:', error);
        res.status(500).json({ message: error.message });
    }
};

// Créer un nouveau paiement
exports.create = async (req, res) => {
    try {
        const { scheduleId, amount, paymentDate, paymentType, mediaId, comments } = req.body;
        // Validation des champs requis
        if (!scheduleId || !amount || amount <= 0 || !paymentDate || !paymentType) {
            return res.status(400).json({
                message: 'Tous les champs requis doivent être remplis correctement'
            });
        }
        // Vérifier que le planning existe
        const schedule = await Schedule.findById(scheduleId)
            .populate('vehicle', 'dailyIncomeTarget')
            .populate('driver', 'firstName lastName');

        if (!schedule) {
            return res.status(404).json({ message: 'Planning non trouvé' });
        }
        // Vérifier que le planning est soit 'pending' soit 'assigned'
        if (schedule.status !== 'assigned' && schedule.status !== 'pending') {
            return res.status(400).json({
                message: 'Impossible de créer un paiement pour un planning terminé ou annulé'
            });
        }
        // Vérifier que le jour n'a pas déjà été payé
        const alreadyPaid = await isSchedulePaidForDate(scheduleId, paymentDate);
        if (alreadyPaid) {
            return res.status(400).json({
                message: 'Un paiement existe déjà pour ce planning à cette date'
            });
        }
        // Vérifier que la date de paiement est dans la période du planning
        const paymentDay = new Date(paymentDate);
        paymentDay.setHours(0, 0, 0, 0);
        const scheduleStart = new Date(schedule.scheduleDate);
        scheduleStart.setHours(0, 0, 0, 0);
        let scheduleEnd;
        if (schedule.endDate) {
            scheduleEnd = new Date(schedule.endDate);
            scheduleEnd.setHours(23, 59, 59, 999);
        } else {
            // Si pas de date de fin, on utilise la date actuelle comme maximum
            scheduleEnd = new Date();
            scheduleEnd.setHours(23, 59, 59, 999);
        }
        if (paymentDay < scheduleStart || (schedule.endDate && paymentDay > scheduleEnd)) {
            return res.status(400).json({
                message: 'La date de paiement doit être dans la période du planning'
            });
        }
        // Déterminer si l'objectif quotidien est atteint
        const isMeetingTarget = schedule.vehicle &&
            schedule.vehicle.dailyIncomeTarget > 0 &&
            amount >= schedule.vehicle.dailyIncomeTarget;
        // Créer le nouveau paiement
        const payment = new Payment({
            schedule: scheduleId,
            amount,
            paymentDate: new Date(paymentDate),
            paymentType,
            media: mediaId || null,
            comments,
            isMeetingTarget
        });
        const savedPayment = await payment.save();
        // Vérifier si c'est le dernier paiement du planning
        const isLastPayment = await isLastPaymentForSchedule(scheduleId, paymentDate);
        if (isLastPayment) {
            // Vérifier si tous les jours précédents ont été payés
            await completeScheduleIfAllPaid(scheduleId);
        }
        // Récupérer le paiement complet avec les informations associées
        const completePayment = await Payment.findById(savedPayment._id)
            .populate({
                path: 'schedule',
                select: '_id scheduleDate endDate status',
                populate: [
                    { path: 'driver', select: 'firstName lastName' },
                    { path: 'vehicle', select: 'type brand model licensePlate dailyIncomeTarget' }
                ]
            })
            .populate('media');
        res.status(201).json(completePayment);
    } catch (error) {
        console.error('Erreur create:', error);
        res.status(400).json({ message: error.message });
    }
};

// Mettre à jour un paiement
exports.update = async (req, res) => {
    try {
        const { scheduleId, amount, paymentDate, paymentType, mediaId, comments, status } = req.body;

        // Vérifier que le paiement existe
        const existingPayment = await Payment.findById(req.params.id);
        if (!existingPayment) {
            return res.status(404).json({ message: 'Paiement non trouvé' });
        }

        // Si c'est un paiement pré-généré avec montant 0 et qu'on ajoute un montant, c'est une confirmation
        const isConfirmingPreGeneratedPayment =
            existingPayment.amount === 0 &&
            existingPayment.status === 'pending' &&
            amount > 0;

        // Si c'est un paiement déjà confirmé, vérifier si les modifications sont autorisées
        if (existingPayment.status === 'confirmed' && status !== 'rejected') {
            // On pourrait ajouter des vérifications supplémentaires ici si nécessaire
            // Par exemple, vérifier si l'utilisateur a les droits pour modifier un paiement confirmé
        }

        // Si la date de paiement change, vérifier qu'il n'y a pas déjà un paiement pour cette date
        if (paymentDate && new Date(paymentDate).toISOString() !== new Date(existingPayment.paymentDate).toISOString()) {
            const alreadyPaid = await isSchedulePaidForDate(
                scheduleId || existingPayment.schedule,
                paymentDate,
                req.params.id // Exclure le paiement actuel
            );
            if (alreadyPaid) {
                return res.status(400).json({
                    message: 'Un paiement existe déjà pour ce planning à cette date'
                });
            }
        }

        // Si le montant ou le planning sont modifiés, vérifier si l'objectif est atteint
        let isMeetingTarget = existingPayment.isMeetingTarget;
        if (amount || scheduleId) {
            const updatedScheduleId = scheduleId || existingPayment.schedule;
            const updatedAmount = amount || existingPayment.amount;
            const schedule = await Schedule.findById(updatedScheduleId)
                .populate('vehicle', 'dailyIncomeTarget');
            if (schedule && schedule.vehicle) {
                isMeetingTarget = schedule.vehicle.dailyIncomeTarget > 0 &&
                    updatedAmount >= schedule.vehicle.dailyIncomeTarget;
            }
        }

        // Préparer les données de mise à jour
        const updateData = {};
        if (scheduleId) updateData.schedule = scheduleId;
        if (amount !== undefined) updateData.amount = amount;
        if (paymentDate) updateData.paymentDate = new Date(paymentDate);
        if (paymentType) updateData.paymentType = paymentType;
        if (mediaId !== undefined) updateData.media = mediaId || null;
        if (comments !== undefined) updateData.comments = comments;
        if (status) updateData.status = status;

        // Si c'est une confirmation d'un paiement pré-généré, mettre à jour le statut
        if (isConfirmingPreGeneratedPayment && !status) {
            updateData.status = 'confirmed';
        }

        updateData.isMeetingTarget = isMeetingTarget;

        // Mettre à jour le paiement
        const payment = await Payment.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        )
            .populate({
                path: 'schedule',
                select: '_id scheduleDate endDate status',
                populate: [
                    { path: 'driver', select: 'firstName lastName' },
                    { path: 'vehicle', select: 'type brand model licensePlate dailyIncomeTarget' }
                ]
            })
            .populate('media');

        // Vérifier si c'est maintenant le dernier paiement du planning
        if (paymentDate) {
            const isLastPayment = await isLastPaymentForSchedule(
                payment.schedule._id,
                payment.paymentDate
            );

            if (isLastPayment) {
                await completeScheduleIfAllPaid(payment.schedule._id);
            }
        }

        res.json(payment);
    } catch (error) {
        console.error('Erreur update:', error);
        res.status(400).json({ message: error.message });
    }
};

// Ajouter un justificatif média à un paiement
exports.addMedia = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { mediaUrl } = req.body;
        const uploadedBy = req.user._id; // Supposant l'authentification

        // Vérifier que le paiement existe
        const payment = await Payment.findById(paymentId);
        if (!payment) {
            return res.status(404).json({ message: 'Paiement non trouvé' });
        }

        // Créer le média
        const media = new Media({
            entityType: 'payment',
            entityId: payment._id,
            mediaUrl,
            uploadedBy
        });

        const savedMedia = await media.save();

        // Associer le média au paiement
        payment.media = savedMedia._id;
        await payment.save();

        // Retourner le paiement mis à jour avec le média
        const updatedPayment = await Payment.findById(paymentId)
            .populate({
                path: 'schedule',
                populate: [
                    { path: 'driver', select: 'firstName lastName' },
                    { path: 'vehicle', select: 'type brand model licensePlate dailyIncomeTarget' }
                ]
            })
            .populate('media');

        res.json(updatedPayment);
    } catch (error) {
        console.error('Erreur lors de l\'ajout du média au paiement:', error);
        res.status(400).json({ message: error.message });
    }
};

// Supprimer un paiement
exports.delete = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);
        if (!payment) {
            return res.status(404).json({ message: 'Paiement non trouvé' });
        }

        // Si le paiement a un média associé, le supprimer également
        if (payment.media) {
            await Media.findByIdAndDelete(payment.media);
        }

        // Garder une référence au scheduleId avant suppression
        const scheduleId = payment.schedule;
        // Supprimer le paiement
        await Payment.findByIdAndDelete(req.params.id);
        // Si le planning était complété uniquement parce que tous les paiements étaient faits,
        // il faut le remettre en "assigned" si un paiement est supprimé
        const schedule = await Schedule.findById(scheduleId);
        if (schedule && schedule.status === 'completed') {
            // Vérifier si ce paiement était nécessaire pour que le planning soit complet
            const unpaidDays = await getUnpaidDays(scheduleId);
            if (unpaidDays.length > 0) {
                schedule.status = 'assigned';
                await schedule.save();
            }
        }
        res.json({ message: 'Paiement supprimé avec succès' });
    } catch (error) {
        console.error('Erreur delete:', error);
        res.status(500).json({ message: error.message });
    }
};

// Récupérer les paiements en attente
exports.getPendingPayments = async (req, res) => {
    try {
        const pendingPayments = await Payment.find({ status: 'pending' })
            .populate({
                path: 'schedule',
                select: '_id scheduleDate endDate status',
                populate: [
                    { path: 'driver', select: 'firstName lastName' },
                    { path: 'vehicle', select: 'type brand model licensePlate dailyIncomeTarget' }
                ]
            })
            .populate('media')
            .sort({ paymentDate: 1 }); // Trier par date croissante

        res.json(pendingPayments);
    } catch (error) {
        console.error('Erreur getPendingPayments:', error);
        res.status(500).json({ message: error.message });
    }
};

// Récupérer les paiements en attente par planning
exports.getPendingPaymentsBySchedule = async (req, res) => {
    try {
        const scheduleId = req.params.scheduleId;

        const pendingPayments = await Payment.find({
            schedule: scheduleId,
            status: 'pending'
        })
            .populate({
                path: 'schedule',
                select: '_id scheduleDate endDate status',
                populate: [
                    { path: 'driver', select: 'firstName lastName' },
                    { path: 'vehicle', select: 'type brand model licensePlate dailyIncomeTarget' }
                ]
            })
            .populate('media')
            .sort({ paymentDate: 1 });

        res.json(pendingPayments);
    } catch (error) {
        console.error('Erreur getPendingPaymentsBySchedule:', error);
        res.status(500).json({ message: error.message });
    }
};

// Confirmer plusieurs paiements en une seule requête
exports.confirmMultiplePayments = async (req, res) => {
    try {
        const { payments } = req.body;

        if (!payments || !Array.isArray(payments) || payments.length === 0) {
            return res.status(400).json({ message: 'Liste de paiements invalide' });
        }

        const results = [];

        for (const paymentInfo of payments) {
            try {
                const { id, amount, paymentType, mediaId, comments } = paymentInfo;

                if (!id || !amount || amount <= 0 || !paymentType) {
                    results.push({
                        id,
                        success: false,
                        message: 'Informations de paiement incomplètes'
                    });
                    continue;
                }

                const existingPayment = await Payment.findById(id);

                if (!existingPayment) {
                    results.push({
                        id,
                        success: false,
                        message: 'Paiement non trouvé'
                    });
                    continue;
                }

                // Vérifier si l'objectif est atteint
                let isMeetingTarget = false;
                const schedule = await Schedule.findById(existingPayment.schedule)
                    .populate('vehicle', 'dailyIncomeTarget');

                if (schedule && schedule.vehicle && schedule.vehicle.dailyIncomeTarget > 0) {
                    isMeetingTarget = amount >= schedule.vehicle.dailyIncomeTarget;
                }

                // Mettre à jour le paiement
                const updatedPayment = await Payment.findByIdAndUpdate(
                    id,
                    {
                        amount,
                        paymentType,
                        media: mediaId || null,
                        comments: comments || existingPayment.comments,
                        status: 'confirmed',
                        isMeetingTarget
                    },
                    { new: true }
                );

                results.push({
                    id,
                    success: true,
                    payment: updatedPayment
                });

                // Vérifier si c'est le dernier paiement du planning
                const isLastPayment = await isLastPaymentForSchedule(
                    existingPayment.schedule,
                    existingPayment.paymentDate
                );

                if (isLastPayment) {
                    await completeScheduleIfAllPaid(existingPayment.schedule);
                }

            } catch (error) {
                results.push({
                    id: paymentInfo.id,
                    success: false,
                    message: error.message
                });
            }
        }

        res.json({
            message: 'Traitement des paiements terminé',
            results
        });

    } catch (error) {
        console.error('Erreur confirmMultiplePayments:', error);
        res.status(500).json({ message: error.message });
    }
};

// Changer le statut d'un paiement
exports.changeStatus = async (req, res) => {
    try {
        const { status } = req.body;
        // Vérifier que le statut est valide
        if (!['pending', 'confirmed', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Statut invalide' });
        }
        const payment = await Payment.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        )
            .populate({
                path: 'schedule',
                select: '_id scheduleDate endDate status',
                populate: [
                    { path: 'driver', select: 'firstName lastName' },
                    { path: 'vehicle', select: 'type brand model licensePlate dailyIncomeTarget' }
                ]
            })
            .populate('media');
        if (!payment) {
            return res.status(404).json({ message: 'Paiement non trouvé' });
        }
        // Si le paiement est rejeté, vérifier l'impact sur le statut du planning
        if (status === 'rejected' && payment.schedule.status === 'completed') {
            // Réexaminer si le planning doit rester complété
            const unpaidDays = await getUnpaidDays(payment.schedule._id);
            if (unpaidDays.length > 0) {
                await Schedule.findByIdAndUpdate(payment.schedule._id, { status: 'assigned' });
            }
        }
        res.json(payment);
    } catch (error) {
        console.error('Erreur changeStatus:', error);
        res.status(400).json({ message: error.message });
    }
};

// Récupérer les paiements par chauffeur
exports.getByDriver = async (req, res) => {
    try {
        const driverId = req.params.driverId;
        // Trouver tous les plannings du chauffeur
        const schedules = await Schedule.find({ driver: driverId }).select('_id');
        // Extraire les IDs des plannings
        const scheduleIds = schedules.map(schedule => schedule._id);
        // Trouver tous les paiements associés à ces plannings
        const payments = await Payment.find({ schedule: { $in: scheduleIds } })
            .populate({
                path: 'schedule',
                select: '_id scheduleDate endDate status',
                populate: [
                    { path: 'driver', select: 'firstName lastName' },
                    { path: 'vehicle', select: 'type brand model licensePlate dailyIncomeTarget' }
                ]
            })
            .populate('media')
            .sort({ paymentDate: -1 });
        res.json(payments);
    } catch (error) {
        console.error('Erreur getByDriver:', error);
        res.status(500).json({ message: error.message });
    }
};

// Récupérer les paiements par véhicule
exports.getByVehicle = async (req, res) => {
    try {
        const vehicleId = req.params.vehicleId;
        // Trouver tous les plannings du véhicule
        const schedules = await Schedule.find({ vehicle: vehicleId }).select('_id');
        // Extraire les IDs des plannings
        const scheduleIds = schedules.map(schedule => schedule._id);
        // Trouver tous les paiements associés à ces plannings
        const payments = await Payment.find({ schedule: { $in: scheduleIds } })
            .populate({
                path: 'schedule',
                select: '_id scheduleDate endDate status',
                populate: [
                    { path: 'driver', select: 'firstName lastName' },
                    { path: 'vehicle', select: 'type brand model licensePlate dailyIncomeTarget' }
                ]
            })
            .populate('media')
            .sort({ paymentDate: -1 });
        res.json(payments);
    } catch (error) {
        console.error('Erreur getByVehicle:', error);
        res.status(500).json({ message: error.message });
    }
};

// Récupérer les paiements par date
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
        // Trouver tous les paiements pour cette date
        const payments = await Payment.find({
            paymentDate: { $gte: startOfDay, $lte: endOfDay }
        })
            .populate({
                path: 'schedule',
                select: '_id scheduleDate endDate status',
                populate: [
                    { path: 'driver', select: 'firstName lastName' },
                    { path: 'vehicle', select: 'type brand model licensePlate dailyIncomeTarget' }
                ]
            })
            .populate('media')
            .sort({ paymentDate: -1 });
        res.json(payments);
    } catch (error) {
        console.error('Erreur getByDate:', error);
        res.status(500).json({ message: error.message });
    }
};

// Récupérer les paiements par période
exports.getByPeriod = async (req, res) => {
    try {
        const { start, end } = req.query;
        if (!start || !end) {
            return res.status(400).json({ message: 'Les dates de début et de fin sont requises' });
        }
        const startDate = new Date(start);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);
        const payments = await Payment.find({
            paymentDate: { $gte: startDate, $lte: endDate }
        })
            .populate({
                path: 'schedule',
                select: '_id scheduleDate endDate status',
                populate: [
                    { path: 'driver', select: 'firstName lastName' },
                    { path: 'vehicle', select: 'type brand model licensePlate dailyIncomeTarget' }
                ]
            })
            .populate('media')
            .sort({ paymentDate: -1 });
        res.json(payments);
    } catch (error) {
        console.error('Erreur getByPeriod:', error);
        res.status(500).json({ message: error.message });
    }
};

// Récupérer les paiements manquants pour un planning
exports.getMissingPaymentsForSchedule = async (req, res) => {
    try {
        const scheduleId = req.params.scheduleId;
        // Vérifier que le planning existe
        const schedule = await Schedule.findById(scheduleId);
        if (!schedule) {
            return res.status(404).json({ message: 'Planning non trouvé' });
        }
        // Récupérer les jours non payés
        const unpaidDays = await getUnpaidDays(scheduleId);
        res.json({
            schedule: {
                _id: schedule._id,
                startDate: schedule.scheduleDate,
                endDate: schedule.endDate,
                status: schedule.status
            },
            unpaidDays: unpaidDays.map(date => date.toISOString().split('T')[0])
        });
    } catch (error) {
        console.error('Erreur getMissingPaymentsForSchedule:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.getStats = async (req, res) => {
    try {
        // Total des paiements
        const totalPayments = await Payment.countDocuments();
        // Somme totale des paiements
        const totalAmountResult = await Payment.aggregate([
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const totalAmount = totalAmountResult.length > 0 ? totalAmountResult[0].total : 0;
        // Moyenne des paiements
        const averageAmount = totalPayments > 0 ? totalAmount / totalPayments : 0;
        // Répartition par type de paiement
        const paymentTypeStats = await Payment.aggregate([
            { $group: { _id: "$paymentType", count: { $sum: 1 }, total: { $sum: "$amount" } } }
        ]);
        // Répartition par statut
        const statusStats = await Payment.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$amount" } } }
        ]);
        // Nombre de paiements atteignant l'objectif
        const targetMet = await Payment.countDocuments({ isMeetingTarget: true });
        const targetMetPercentage = totalPayments > 0 ? (targetMet / totalPayments) * 100 : 0;
        res.json({
            totalPayments,
            totalAmount,
            averageAmount,
            paymentTypeStats,
            statusStats,
            targetMet,
            targetMetPercentage
        });
    } catch (error) {
        console.error('Erreur getStats:', error);
        res.status(500).json({ message: error.message });
    }
};
// Statistiques journalières
exports.getDailyStats = async (req, res) => {
    try {
        const { start, end } = req.query;
        let startDate, endDate;
        if (start && end) {
            startDate = new Date(start);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(end);
            endDate.setHours(23, 59, 59, 999);
        } else {
            // Par défaut, les 30 derniers jours
            endDate = new Date();
            endDate.setHours(23, 59, 59, 999);
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            startDate.setHours(0, 0, 0, 0);
        }
        // Agréger les paiements par jour
        const dailyStats = await Payment.aggregate([
            {
                $match: {
                    paymentDate: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$paymentDate" }
                    },
                    count: { $sum: 1 },
                    total: { $sum: "$amount" },
                    targetMet: {
                        $sum: { $cond: [{ $eq: ["$isMeetingTarget", true] }, 1, 0] }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        res.json({
            period: {
                start: startDate,
                end: endDate
            },
            dailyStats
        });
    } catch (error) {
        console.error('Erreur getDailyStats:', error);
        res.status(500).json({ message: error.message });
    }
};
// Statistiques par chauffeur
exports.getDriverStats = async (req, res) => {
    try {
        // Récupérer tous les chauffeurs
        const drivers = await Driver.find().select('_id firstName lastName');
        const driverStats = [];
        // Pour chaque chauffeur, calculer les statistiques
        for (const driver of drivers) {
            // Trouver tous les plannings associés à ce chauffeur
            const schedules = await Schedule.find({ driver: driver._id }).select('_id');
            const scheduleIds = schedules.map(s => s._id);
            if (scheduleIds.length === 0) {
                driverStats.push({
                    driver,
                    totalPayments: 0,
                    totalAmount: 0,
                    averageAmount: 0,
                    targetMetPercentage: 0
                });
                continue;
            }
            // Calculer les statistiques de paiement
            const payments = await Payment.find({ schedule: { $in: scheduleIds } });
            const totalPayments = payments.length;
            const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
            const averageAmount = totalPayments > 0 ? totalAmount / totalPayments : 0;
            const targetMet = payments.filter(p => p.isMeetingTarget).length;
            const targetMetPercentage = totalPayments > 0 ? (targetMet / totalPayments) * 100 : 0;
            driverStats.push({
                driver,
                totalPayments,
                totalAmount,
                averageAmount,
                targetMet,
                targetMetPercentage
            });
        }
        // Trier par montant total décroissant
        driverStats.sort((a, b) => b.totalAmount - a.totalAmount);
        res.json(driverStats);
    } catch (error) {
        console.error('Erreur getDriverStats:', error);
        res.status(500).json({ message: error.message });
    }
};
// Statistiques par véhicule
exports.getVehicleStats = async (req, res) => {
    try {
        // Récupérer tous les véhicules
        const vehicles = await Vehicle.find().select('_id type brand model licensePlate dailyIncomeTarget');
        const vehicleStats = [];
        // Pour chaque véhicule, calculer les statistiques
        for (const vehicle of vehicles) {
            // Trouver tous les plannings associés à ce véhicule
            const schedules = await Schedule.find({ vehicle: vehicle._id }).select('_id');
            const scheduleIds = schedules.map(s => s._id);
            if (scheduleIds.length === 0) {
                vehicleStats.push({
                    vehicle,
                    totalPayments: 0,
                    totalAmount: 0,
                    averageAmount: 0,
                    targetMetPercentage: 0,
                    efficiency: 0
                });
                continue;
            }
            // Calculer les statistiques de paiement
            const payments = await Payment.find({ schedule: { $in: scheduleIds } });
            const totalPayments = payments.length;
            const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
            const averageAmount = totalPayments > 0 ? totalAmount / totalPayments : 0;
            const targetMet = payments.filter(p => p.isMeetingTarget).length;
            const targetMetPercentage = totalPayments > 0 ? (targetMet / totalPayments) * 100 : 0;
            // Calculer l'efficacité (rapport entre revenu moyen et objectif)
            let efficiency = 0;
            if (vehicle.dailyIncomeTarget && vehicle.dailyIncomeTarget > 0) {
                efficiency = (averageAmount / vehicle.dailyIncomeTarget) * 100;
            }
            vehicleStats.push({
                vehicle,
                totalPayments,
                totalAmount,
                averageAmount,
                targetMet,
                targetMetPercentage,
                efficiency
            });
        }
        // Trier par montant total décroissant
        vehicleStats.sort((a, b) => b.totalAmount - a.totalAmount);
        res.json(vehicleStats);
    } catch (error) {
        console.error('Erreur getVehicleStats:', error);
        res.status(500).json({ message: error.message });
    }
};