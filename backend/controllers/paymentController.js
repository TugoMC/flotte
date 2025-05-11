// controllers/paymentController.js
const Payment = require('../models/paymentModel');
const Schedule = require('../models/scheduleModel');
const Vehicle = require('../models/vehicleModel');
const Driver = require('../models/driverModel');
const History = require('../models/historyModel');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const {
    isSchedulePaidForDate,
    isLastPaymentForSchedule,
    completeScheduleIfAllPaid,
    getUnpaidDays
} = require('../utils/paymentScheduleUtils');

// Récupérer tous les paiements
exports.getAll = async (req, res) => {
    console.log('[PaymentController] Début de getAll - Récupération de tous les paiements');
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
            .sort({ paymentDate: -1 })
            .lean();

        console.log(`[PaymentController] getAll - ${payments.length} paiements trouvés initialement`);

        // Populer manuellement les drivers et vehicles pour gérer les références invalides
        for (const payment of payments) {
            if (payment.schedule) {
                // Populer driver de manière sécurisée
                if (payment.schedule.driver) {
                    try {
                        const driver = await Driver.findById(payment.schedule.driver).select('firstName lastName').lean();
                        payment.schedule.driver = driver || { firstName: 'Inconnu', lastName: '' };
                    } catch (err) {
                        console.error(`[PaymentController] Erreur lors de la population du driver pour le paiement ${payment._id}:`, err);
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
                        console.error(`[PaymentController] Erreur lors de la population du vehicle pour le paiement ${payment._id}:`, err);
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
        console.log('[PaymentController] getAll - Traitement terminé, envoi de la réponse');
        res.json(payments);
    } catch (error) {
        console.error('[PaymentController] Erreur getAll:', error);
        res.status(500).json({ message: error.message });
    }
};

// Récupérer un paiement par ID
exports.getById = async (req, res) => {
    console.log(`[PaymentController] Début de getById - Récupération du paiement ${req.params.id}`);
    try {
        const payment = await Payment.findById(req.params.id)
            .populate({
                path: 'schedule',
                select: '_id scheduleDate endDate status',
                populate: [
                    { path: 'driver', select: 'firstName lastName' },
                    { path: 'vehicle', select: 'type brand model licensePlate dailyIncomeTarget' }
                ]
            });

        if (!payment) {
            console.log(`[PaymentController] getById - Paiement ${req.params.id} non trouvé`);
            return res.status(404).json({ message: 'Paiement non trouvé' });
        }

        console.log(`[PaymentController] getById - Paiement ${req.params.id} trouvé`);
        res.json(payment);
    } catch (error) {
        console.error(`[PaymentController] Erreur getById pour ${req.params.id}:`, error);
        res.status(500).json({ message: error.message });
    }
};

// Récupérer les paiements par planning
exports.getBySchedule = async (req, res) => {
    console.log(`[PaymentController] Début de getBySchedule - Récupération des paiements pour le planning ${req.params.scheduleId}`);
    try {
        const { scheduleId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(scheduleId)) {
            console.log(`[PaymentController] getBySchedule - ID de planning invalide: ${scheduleId}`);
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
            .sort({ paymentDate: 1 });

        console.log(`[PaymentController] getBySchedule - ${payments.length} paiements trouvés pour le planning ${scheduleId}`);
        res.json(payments);
    } catch (error) {
        console.error(`[PaymentController] Erreur lors de la récupération des paiements par planning ${scheduleId}:`, error);
        res.status(500).json({ message: error.message });
    }
};

// Créer un nouveau paiement
exports.create = async (req, res) => {
    console.log('[PaymentController] Début de create - Création d\'un nouveau paiement');
    try {
        const { scheduleId, amount, paymentDate, paymentType, comments } = req.body;
        console.log('[PaymentController] create - Données reçues:', { scheduleId, amount, paymentDate, paymentType });

        // Validation des champs requis
        if (!scheduleId || !amount || amount <= 0 || !paymentDate || !paymentType) {
            console.log('[PaymentController] create - Champs requis manquants ou invalides');
            return res.status(400).json({
                message: 'Tous les champs requis doivent être remplis correctement'
            });
        }

        // Vérifier que le planning existe
        const schedule = await Schedule.findById(scheduleId)
            .populate('vehicle', 'dailyIncomeTarget')
            .populate('driver', 'firstName lastName');

        if (!schedule) {
            console.log(`[PaymentController] create - Planning ${scheduleId} non trouvé`);
            return res.status(404).json({ message: 'Planning non trouvé' });
        }

        // Vérifier que le planning est soit 'pending' soit 'assigned'
        if (schedule.status !== 'assigned' && schedule.status !== 'pending') {
            console.log(`[PaymentController] create - Statut du planning invalide: ${schedule.status}`);
            return res.status(400).json({
                message: 'Impossible de créer un paiement pour un planning terminé ou annulé'
            });
        }

        // Vérifier que le jour n'a pas déjà été payé
        const alreadyPaid = await isSchedulePaidForDate(scheduleId, paymentDate);
        if (alreadyPaid) {
            console.log(`[PaymentController] create - Paiement déjà existant pour le planning ${scheduleId} à la date ${paymentDate}`);
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
            console.log(`[PaymentController] create - Date de paiement ${paymentDate} en dehors de la période du planning`);
            return res.status(400).json({
                message: 'La date de paiement doit être dans la période du planning'
            });
        }

        // Déterminer si l'objectif quotidien est atteint
        const isMeetingTarget = schedule.vehicle &&
            schedule.vehicle.dailyIncomeTarget > 0 &&
            amount >= schedule.vehicle.dailyIncomeTarget;

        console.log(`[PaymentController] create - Création du paiement pour le planning ${scheduleId}, objectif atteint: ${isMeetingTarget}`);

        // Créer le nouveau paiement
        const payment = new Payment({
            schedule: scheduleId,
            amount,
            paymentDate: new Date(paymentDate),
            paymentType,
            photos: [],
            comments,
            isMeetingTarget
        });

        // Sauvegarder d'abord le paiement
        const savedPayment = await payment.save();

        // Ensuite créer l'entrée d'historique
        await History.create({
            eventType: 'payment_create',
            module: 'payment',
            entityId: savedPayment._id,
            newData: savedPayment.toObject(),
            performedBy: req.user?._id,
            description: `Création d'un paiement de ${amount}€ pour le planning ${scheduleId}`,
            ipAddress: req.ip
        });

        console.log(`[PaymentController] create - Paiement créé avec l'ID ${savedPayment._id}`);



        // Vérifier si c'est le dernier paiement du planning
        const isLastPayment = await isLastPaymentForSchedule(scheduleId, paymentDate);
        if (isLastPayment) {
            console.log(`[PaymentController] create - Dernier paiement détecté pour le planning ${scheduleId}`);
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
            });

        res.status(201).json(completePayment);
    } catch (error) {
        console.error('[PaymentController] Erreur create:', error);
        res.status(400).json({ message: error.message });
    }
};

// Mettre à jour un paiement
exports.update = async (req, res) => {
    console.log(`[PaymentController] Début de update - Mise à jour du paiement ${req.params.id}`);
    try {
        const { scheduleId, amount, paymentDate, paymentType, comments, status } = req.body;
        console.log('[PaymentController] update - Données de mise à jour:', { scheduleId, amount, paymentDate, paymentType, status });

        // Vérifier que le paiement existe
        const existingPayment = await Payment.findById(req.params.id);
        if (!existingPayment) {
            console.log(`[PaymentController] update - Paiement ${req.params.id} non trouvé`);
            return res.status(404).json({ message: 'Paiement non trouvé' });
        }

        // Si c'est un paiement pré-généré avec montant 0 et qu'on ajoute un montant, c'est une confirmation
        const isConfirmingPreGeneratedPayment =
            existingPayment.amount === 0 &&
            existingPayment.status === 'pending' &&
            amount > 0;

        console.log(`[PaymentController] update - Confirmation de paiement pré-généré: ${isConfirmingPreGeneratedPayment}`);

        // Si c'est un paiement déjà confirmé, vérifier si les modifications sont autorisées
        if (existingPayment.status === 'confirmed' && status !== 'rejected') {
            console.log('[PaymentController] update - Tentative de modification d\'un paiement confirmé');
            // On pourrait ajouter des vérifications supplémentaires ici si nécessaire
        }

        // Si la date de paiement change, vérifier qu'il n'y a pas déjà un paiement pour cette date
        if (paymentDate && new Date(paymentDate).toISOString() !== new Date(existingPayment.paymentDate).toISOString()) {
            const alreadyPaid = await isSchedulePaidForDate(
                scheduleId || existingPayment.schedule,
                paymentDate,
                req.params.id // Exclure le paiement actuel
            );
            if (alreadyPaid) {
                console.log(`[PaymentController] update - Paiement déjà existant pour la nouvelle date ${paymentDate}`);
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

        console.log(`[PaymentController] update - Objectif atteint: ${isMeetingTarget}`);

        // Préparer les données de mise à jour
        const updateData = {};
        if (scheduleId) updateData.schedule = scheduleId;
        if (amount !== undefined) updateData.amount = amount;
        if (paymentDate) updateData.paymentDate = new Date(paymentDate);
        if (paymentType) updateData.paymentType = paymentType;
        if (comments !== undefined) updateData.comments = comments;
        if (status) updateData.status = status;

        // Si c'est une confirmation d'un paiement pré-généré, mettre à jour le statut
        if (isConfirmingPreGeneratedPayment && !status) {
            updateData.status = 'confirmed';
        }

        updateData.isMeetingTarget = isMeetingTarget;

        console.log('[PaymentController] update - Données de mise à jour finales:', updateData);

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
            });

        console.log(`[PaymentController] update - Paiement ${req.params.id} mis à jour avec succès`);

        // Vérifier si c'est maintenant le dernier paiement du planning
        if (paymentDate) {
            const isLastPayment = await isLastPaymentForSchedule(
                payment.schedule._id,
                payment.paymentDate
            );

            if (isLastPayment) {
                console.log(`[PaymentController] update - Dernier paiement détecté pour le planning ${payment.schedule._id}`);
                await completeScheduleIfAllPaid(payment.schedule._id);
            }
        }

        await History.create({
            eventType: 'payment_update',
            module: 'payment',
            entityId: payment._id,
            oldData: existingPayment.toObject(),
            newData: payment.toObject(),
            performedBy: req.user?._id,
            description: `Mise à jour du paiement ${payment._id} (${existingPayment.amount}€ → ${payment.amount}€)`,
            ipAddress: req.ip
        });

        res.json(payment);
    } catch (error) {
        console.error(`[PaymentController] Erreur update pour le paiement ${req.params.id}:`, error);
        res.status(400).json({ message: error.message });
    }
};

// Télécharger des photos pour un paiement
exports.uploadPhotos = async (req, res) => {
    console.log(`[PaymentController] Début de uploadPhotos - Ajout de photos au paiement ${req.params.id}`);
    try {
        const { id } = req.params;

        // Vérifier que le paiement existe
        const payment = await Payment.findById(id);
        if (!payment) {
            console.log(`[PaymentController] uploadPhotos - Paiement ${id} non trouvé`);
            // Supprimer les fichiers téléchargés si le paiement n'existe pas
            if (req.files && req.files.length > 0) {
                console.log('[PaymentController] uploadPhotos - Suppression des fichiers téléchargés inutilisés');
                for (const file of req.files) {
                    fs.unlinkSync(file.path);
                }
            }
            return res.status(404).json({ message: 'Paiement non trouvé' });
        }

        // Ajouter les nouvelles photos au tableau existant
        const newPhotoPaths = req.files.map(file => file.path);
        console.log(`[PaymentController] uploadPhotos - ${newPhotoPaths.length} nouvelles photos à ajouter`);

        // Mettre à jour le tableau de photos
        payment.photos = [...payment.photos, ...newPhotoPaths];
        await payment.save();

        console.log(`[PaymentController] uploadPhotos - Paiement ${id} mis à jour avec ${payment.photos.length} photos au total`);

        res.json({
            message: 'Photos téléchargées avec succès',
            payment: {
                _id: payment._id,
                photos: payment.photos
            }
        });
    } catch (error) {
        console.error(`[PaymentController] Erreur uploadPhotos pour le paiement ${req.params.id}:`, error);
        res.status(400).json({ message: error.message });
    }
};

// Supprimer une photo d'un paiement
exports.deletePhoto = async (req, res) => {
    try {
        const { id, photoIndex } = req.params;
        const payment = await Payment.findById(id);
        if (!payment) {
            return res.status(404).json({ message: 'Paiement non trouvé' });
        }

        if (photoIndex < 0 || photoIndex >= payment.photos.length) {
            return res.status(400).json({ message: 'Index de photo invalide' });
        }

        const deletedPhoto = payment.photos[photoIndex];
        payment.photos.splice(photoIndex, 1);
        await payment.save();

        // Historique
        await History.create({
            eventType: 'payment_photo_delete',
            module: 'payment',
            entityId: payment._id,
            oldData: { photos: [...payment.photos, deletedPhoto] },
            newData: { photos: payment.photos },
            performedBy: req.user?._id,
            description: `Suppression d'une photo du paiement ${payment._id}`,
            ipAddress: req.ip
        });

        res.json({
            message: 'Photo supprimée avec succès',
            payment: {
                _id: payment._id,
                photos: payment.photos
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Supprimer un paiement
exports.delete = async (req, res) => {
    console.log(`[PaymentController] Début de delete - Suppression du paiement ${req.params.id}`);
    try {
        const payment = await Payment.findById(req.params.id);
        if (!payment) {
            console.log(`[PaymentController] delete - Paiement ${req.params.id} non trouvé`);
            return res.status(404).json({ message: 'Paiement non trouvé' });
        }

        // Si le paiement a des photos, les supprimer du système de fichiers
        if (payment.photos && payment.photos.length > 0) {
            console.log(`[PaymentController] delete - Suppression de ${payment.photos.length} photos associées`);
            for (const photoPath of payment.photos) {
                try {
                    fs.unlinkSync(photoPath);
                } catch (err) {
                    console.error('[PaymentController] Erreur lors de la suppression du fichier:', err);
                    // Continuer même si le fichier n'existe pas physiquement
                }
            }
        }

        // Garder une référence au scheduleId avant suppression
        const scheduleId = payment.schedule;
        console.log(`[PaymentController] delete - Planning associé: ${scheduleId}`);

        await History.create({
            eventType: 'payment_delete',
            module: 'payment',
            entityId: payment._id,
            oldData: payment.toObject(),
            performedBy: req.user?._id,
            description: `Suppression du paiement ${payment._id} (${payment.amount}€) pour le planning ${scheduleId}`,
            ipAddress: req.ip
        });

        // Supprimer le paiement
        await Payment.findByIdAndDelete(req.params.id);
        console.log(`[PaymentController] delete - Paiement ${req.params.id} supprimé`);

        // Si le planning était complété uniquement parce que tous les paiements étaient faits,
        // il faut le remettre en "assigned" si un paiement est supprimé
        const schedule = await Schedule.findById(scheduleId);
        if (schedule && schedule.status === 'completed') {
            console.log(`[PaymentController] delete - Vérification du statut du planning ${scheduleId}`);
            // Vérifier si ce paiement était nécessaire pour que le planning soit complet
            const unpaidDays = await getUnpaidDays(scheduleId);
            if (unpaidDays.length > 0) {
                console.log(`[PaymentController] delete - Mise à jour du planning ${scheduleId} en statut 'assigned'`);
                schedule.status = 'assigned';
                await schedule.save();
            }
        }

        res.json({ message: 'Paiement supprimé avec succès' });
    } catch (error) {
        console.error(`[PaymentController] Erreur delete pour le paiement ${req.params.id}:`, error);
        res.status(500).json({ message: error.message });
    }
};

// Récupérer les paiements en attente
exports.getPendingPayments = async (req, res) => {
    console.log('[PaymentController] Début de getPendingPayments - Récupération des paiements en attente');
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
            .sort({ paymentDate: 1 }); // Trier par date croissante

        console.log(`[PaymentController] getPendingPayments - ${pendingPayments.length} paiements en attente trouvés`);

        res.json(pendingPayments);
    } catch (error) {
        console.error('[PaymentController] Erreur getPendingPayments:', error);
        res.status(500).json({ message: error.message });
    }
};

// Récupérer les paiements en attente par planning
exports.getPendingPaymentsBySchedule = async (req, res) => {
    console.log(`[PaymentController] Début de getPendingPaymentsBySchedule - Récupération des paiements en attente pour le planning ${req.params.scheduleId}`);
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
            .sort({ paymentDate: 1 });

        console.log(`[PaymentController] getPendingPaymentsBySchedule - ${pendingPayments.length} paiements en attente trouvés pour le planning ${scheduleId}`);

        res.json(pendingPayments);
    } catch (error) {
        console.error(`[PaymentController] Erreur getPendingPaymentsBySchedule pour le planning ${req.params.scheduleId}:`, error);
        res.status(500).json({ message: error.message });
    }
};

// Confirmer plusieurs paiements en une seule requête
exports.confirmMultiplePayments = async (req, res) => {
    console.log('[PaymentController] Début de confirmMultiplePayments - Confirmation de plusieurs paiements');
    try {
        const { payments } = req.body;
        console.log(`[PaymentController] confirmMultiplePayments - ${payments.length} paiements à traiter`);

        if (!payments || !Array.isArray(payments) || payments.length === 0) {
            console.log('[PaymentController] confirmMultiplePayments - Liste de paiements invalide');
            return res.status(400).json({ message: 'Liste de paiements invalide' });
        }

        const results = [];

        for (const paymentInfo of payments) {
            try {
                const { id, amount, paymentType, comments } = paymentInfo;
                console.log(`[PaymentController] confirmMultiplePayments - Traitement du paiement ${id}`);

                if (!id || !amount || amount <= 0 || !paymentType) {
                    console.log(`[PaymentController] confirmMultiplePayments - Informations incomplètes pour le paiement ${id}`);
                    results.push({
                        id,
                        success: false,
                        message: 'Informations de paiement incomplètes'
                    });
                    continue;
                }

                const existingPayment = await Payment.findById(id);

                if (!existingPayment) {
                    console.log(`[PaymentController] confirmMultiplePayments - Paiement ${id} non trouvé`);
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

                console.log(`[PaymentController] confirmMultiplePayments - Paiement ${id} - Objectif atteint: ${isMeetingTarget}`);




                // Mettre à jour le paiement
                const updatedPayment = await Payment.findByIdAndUpdate(
                    id,
                    {
                        amount,
                        paymentType,
                        comments: comments || existingPayment.comments,
                        status: 'confirmed',
                        isMeetingTarget
                    },
                    { new: true }
                );

                await History.create({
                    eventType: 'payment_confirm',
                    module: 'payment',
                    entityId: updatedPayment._id,
                    oldData: { status: 'pending', amount: existingPayment.amount },
                    newData: { status: 'confirmed', amount: updatedPayment.amount },
                    performedBy: req.user?._id,
                    description: `Paiement confirmé de ${updatedPayment.amount}€ pour le planning ${existingPayment.schedule}`,
                    ipAddress: req.ip
                });

                console.log(`[PaymentController] confirmMultiplePayments - Paiement ${id} confirmé avec succès`);

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
                    console.log(`[PaymentController] confirmMultiplePayments - Dernier paiement détecté pour le planning ${existingPayment.schedule}`);
                    await completeScheduleIfAllPaid(existingPayment.schedule);
                }



            } catch (error) {
                console.error(`[PaymentController] Erreur lors du traitement du paiement ${paymentInfo.id}:`, error);
                results.push({
                    id: paymentInfo.id,
                    success: false,
                    message: error.message
                });
            }
        }

        console.log('[PaymentController] confirmMultiplePayments - Traitement terminé');

        res.json({
            message: 'Traitement des paiements terminé',
            results
        });

    } catch (error) {
        console.error('[PaymentController] Erreur confirmMultiplePayments:', error);
        res.status(500).json({ message: error.message });
    }
};

// Changer le statut d'un paiement
exports.changeStatus = async (req, res) => {
    console.log(`[PaymentController] Début de changeStatus - Changement de statut pour le paiement ${req.params.id}`);
    try {
        const { status } = req.body;
        console.log(`[PaymentController] changeStatus - Nouveau statut: ${status}`);

        // Vérifier que le statut est valide
        if (!['pending', 'confirmed', 'rejected'].includes(status)) {
            console.log(`[PaymentController] changeStatus - Statut invalide: ${status}`);
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
            });

        if (!payment) {
            console.log(`[PaymentController] changeStatus - Paiement ${req.params.id} non trouvé`);
            return res.status(404).json({ message: 'Paiement non trouvé' });
        }

        console.log(`[PaymentController] changeStatus - Statut du paiement ${req.params.id} mis à jour avec succès`);

        // Si le paiement est rejeté, vérifier l'impact sur le statut du planning
        if (status === 'rejected' && payment.schedule.status === 'completed') {
            console.log(`[PaymentController] changeStatus - Vérification de l'impact sur le planning ${payment.schedule._id}`);
            // Réexaminer si le planning doit rester complété
            const unpaidDays = await getUnpaidDays(payment.schedule._id);
            if (unpaidDays.length > 0) {
                console.log(`[PaymentController] changeStatus - Mise à jour du planning ${payment.schedule._id} en statut 'assigned'`);
                await Schedule.findByIdAndUpdate(payment.schedule._id, { status: 'assigned' });
            }
        }

        await History.create({
            eventType: `payment_${status}`,
            module: 'payment',
            entityId: payment._id,
            oldData: { status: existingPayment.status },
            newData: { status: payment.status },
            performedBy: req.user?._id,
            description: `Changement de statut du paiement ${payment._id} (${existingPayment.status} → ${payment.status})`,
            ipAddress: req.ip
        });

        res.json(payment);
    } catch (error) {
        console.error(`[PaymentController] Erreur changeStatus pour le paiement ${req.params.id}:`, error);
        res.status(400).json({ message: error.message });
    }
};

// Récupérer les paiements par chauffeur
exports.getByDriver = async (req, res) => {
    console.log(`[PaymentController] Début de getByDriver - Récupération des paiements pour le chauffeur ${req.params.driverId}`);
    try {
        const driverId = req.params.driverId;
        // Trouver tous les plannings du chauffeur
        const schedules = await Schedule.find({ driver: driverId }).select('_id');
        console.log(`[PaymentController] getByDriver - ${schedules.length} plannings trouvés pour le chauffeur ${driverId}`);

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
            .sort({ paymentDate: -1 });

        console.log(`[PaymentController] getByDriver - ${payments.length} paiements trouvés pour le chauffeur ${driverId}`);

        res.json(payments);
    } catch (error) {
        console.error(`[PaymentController] Erreur getByDriver pour le chauffeur ${req.params.driverId}:`, error);
        res.status(500).json({ message: error.message });
    }
};

// Récupérer les paiements par véhicule
exports.getByVehicle = async (req, res) => {
    console.log(`[PaymentController] Début de getByVehicle - Récupération des paiements pour le véhicule ${req.params.vehicleId}`);
    try {
        const vehicleId = req.params.vehicleId;
        // Trouver tous les plannings du véhicule
        const schedules = await Schedule.find({ vehicle: vehicleId }).select('_id');
        console.log(`[PaymentController] getByVehicle - ${schedules.length} plannings trouvés pour le véhicule ${vehicleId}`);

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
            .sort({ paymentDate: -1 });

        console.log(`[PaymentController] getByVehicle - ${payments.length} paiements trouvés pour le véhicule ${vehicleId}`);

        res.json(payments);
    } catch (error) {
        console.error(`[PaymentController] Erreur getByVehicle pour le véhicule ${req.params.vehicleId}:`, error);
        res.status(500).json({ message: error.message });
    }
};

// Récupérer les paiements par date
exports.getByDate = async (req, res) => {
    console.log(`[PaymentController] Début de getByDate - Récupération des paiements pour la date ${req.params.date}`);
    try {
        const dateStr = req.params.date;
        const date = new Date(dateStr);
        // Vérifier que la date est valide
        if (isNaN(date.getTime())) {
            console.log(`[PaymentController] getByDate - Date invalide: ${dateStr}`);
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

        console.log(`[PaymentController] getByDate - ${payments.length} paiements trouvés pour la date ${dateStr}`);

        res.json(payments);
    } catch (error) {
        console.error(`[PaymentController] Erreur getByDate pour la date ${req.params.date}:`, error);
        res.status(500).json({
            message: error.message
        });
    }
};

// Récupérer les paiements par période
exports.getByPeriod = async (req, res) => {
    console.log(`[PaymentController] Début de getByPeriod - Récupération des paiements entre ${req.query.start} et ${req.query.end}`);
    try {
        const { start, end } = req.query;
        if (!start || !end) {
            console.log('[PaymentController] getByPeriod - Dates de début ou de fin manquantes');
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

        console.log(`[PaymentController] getByPeriod - ${payments.length} paiements trouvés entre ${start} et ${end}`);

        res.json(payments);
    } catch (error) {
        console.error('[PaymentController] Erreur getByPeriod:', error);
        res.status(500).json({ message: error.message });
    }
};

// Récupérer les paiements manquants pour un planning
exports.getMissingPaymentsForSchedule = async (req, res) => {
    console.log(`[PaymentController] Début de getMissingPaymentsForSchedule - Récupération des paiements manquants pour le planning ${req.params.scheduleId}`);
    try {
        const scheduleId = req.params.scheduleId;
        // Vérifier que le planning existe
        const schedule = await Schedule.findById(scheduleId);
        if (!schedule) {
            console.log(`[PaymentController] getMissingPaymentsForSchedule - Planning ${scheduleId} non trouvé`);
            return res.status(404).json({ message: 'Planning non trouvé' });
        }

        // Récupérer les jours non payés
        const unpaidDays = await getUnpaidDays(scheduleId);
        console.log(`[PaymentController] getMissingPaymentsForSchedule - ${unpaidDays.length} jours non payés trouvés pour le planning ${scheduleId}`);

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
        console.error(`[PaymentController] Erreur getMissingPaymentsForSchedule pour le planning ${req.params.scheduleId}:`, error);
        res.status(500).json({ message: error.message });
    }
};

exports.getStats = async (req, res) => {
    try {
        console.log('Début de getStats'); // Debug log

        const stats = await Payment.aggregate([
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$amount" },
                    count: { $sum: 1 },
                    targetMet: {
                        $sum: {
                            $cond: [{ $eq: ["$isMeetingTarget", true] }, 1, 0]
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalAmount: 1,
                    averageAmount: { $divide: ["$totalAmount", "$count"] },
                    totalPayments: "$count",
                    targetMet: 1,
                    targetMetPercentage: {
                        $multiply: [
                            { $divide: ["$targetMet", "$count"] },
                            100
                        ]
                    }
                }
            }
        ]);

        console.log('Résultats de l\'agrégation:', stats); // Debug log

        const result = stats[0] || {
            totalAmount: 0,
            averageAmount: 0,
            totalPayments: 0,
            targetMet: 0,
            targetMetPercentage: 0
        };

        res.json(result);
    } catch (error) {
        console.error('Erreur dans getStats:', error);
        res.status(500).json({
            message: 'Erreur lors du calcul des statistiques',
            error: error.message,
            stack: error.stack // Ajout de la stack pour le débogage
        });
    }
};

exports.getDailyRevenue = async (req, res) => {
    console.log('[PaymentController] Début de getDailyRevenue - Récupération des revenus journaliers');
    try {
        const { start, end } = req.query;

        // Vérifier les dates si fournies
        const startDate = start ? new Date(start) : new Date();
        startDate.setHours(0, 0, 0, 0);

        const endDate = end ? new Date(end) : new Date();
        endDate.setHours(23, 59, 59, 999);

        // Si aucune date de début n'est fournie, prendre les 30 derniers jours par défaut
        if (!start) {
            startDate.setDate(startDate.getDate() - 30);
        }

        console.log(`[PaymentController] getDailyRevenue - Période: ${startDate} à ${endDate}`);

        // Agréger les paiements par jour
        const dailyRevenue = await Payment.aggregate([
            {
                $match: {
                    paymentDate: { $gte: startDate, $lte: endDate },
                    status: 'confirmed' // Seulement les paiements confirmés
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$paymentDate" }
                    },
                    date: { $first: "$paymentDate" },
                    totalAmount: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    date: 1,
                    totalAmount: 1,
                    count: 1,
                    formattedDate: "$_id"
                }
            },
            { $sort: { date: 1 } }
        ]);

        console.log(`[PaymentController] getDailyRevenue - ${dailyRevenue.length} jours de données trouvés`);

        res.json({
            success: true,
            period: {
                start: startDate,
                end: endDate
            },
            data: dailyRevenue
        });
    } catch (error) {
        console.error('[PaymentController] Erreur getDailyRevenue:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Statistiques journalières
exports.getDailyStats = async (req, res) => {
    console.log('[PaymentController] Début de getDailyStats - Calcul des statistiques journalières');
    try {
        const { start, end } = req.query;
        let startDate, endDate;

        if (start && end) {
            startDate = new Date(start);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(end);
            endDate.setHours(23, 59, 59, 999);
            console.log(`[PaymentController] getDailyStats - Période spécifiée: ${start} à ${end}`);
        } else {
            // Par défaut, les 30 derniers jours
            endDate = new Date();
            endDate.setHours(23, 59, 59, 999);
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            startDate.setHours(0, 0, 0, 0);
            console.log('[PaymentController] getDailyStats - Utilisation de la période par défaut (30 derniers jours)');
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
                },
            },
            { $sort: { _id: 1 } }
        ]);

        console.log(`[PaymentController] getDailyStats - ${dailyStats.length} jours de statistiques calculés`);

        res.json({
            period: {
                start: startDate,
                end: endDate
            },
            dailyStats
        });
    } catch (error) {
        console.error('[PaymentController] Erreur getDailyStats:', error);
        res.status(500).json({ message: error.message });
    }
};

// Statistiques par chauffeur
exports.getDriverStats = async (req, res) => {
    console.log('[PaymentController] Début de getDriverStats - Calcul des statistiques par chauffeur');
    try {
        // Récupérer tous les chauffeurs
        const drivers = await Driver.find().select('_id firstName lastName');
        console.log(`[PaymentController] getDriverStats - ${drivers.length} chauffeurs trouvés`);

        const driverStats = [];

        // Pour chaque chauffeur, calculer les statistiques
        for (const driver of drivers) {
            console.log(`[PaymentController] getDriverStats - Traitement du chauffeur ${driver._id}`);

            // Trouver tous les plannings associés à ce chauffeur
            const schedules = await Schedule.find({ driver: driver._id }).select('_id');
            const scheduleIds = schedules.map(s => s._id);

            if (scheduleIds.length === 0) {
                console.log(`[PaymentController] getDriverStats - Aucun planning trouvé pour le chauffeur ${driver._id}`);
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

            console.log(`[PaymentController] getDriverStats - Statistiques calculées pour le chauffeur ${driver._id}: ${totalPayments} paiements, ${totalAmount}€ total`);

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
        console.log('[PaymentController] getDriverStats - Statistiques triées par montant total');

        res.json(driverStats);
    } catch (error) {
        console.error('[PaymentController] Erreur getDriverStats:', error);
        res.status(500).json({ message: error.message });
    }
};

// Statistiques par véhicule
exports.getVehicleStats = async (req, res) => {
    console.log('[PaymentController] Début de getVehicleStats - Calcul des statistiques par véhicule');
    try {
        // Récupérer tous les véhicules
        const vehicles = await Vehicle.find().select('_id type brand model licensePlate dailyIncomeTarget');
        console.log(`[PaymentController] getVehicleStats - ${vehicles.length} véhicules trouvés`);

        const vehicleStats = [];

        // Pour chaque véhicule, calculer les statistiques
        for (const vehicle of vehicles) {
            console.log(`[PaymentController] getVehicleStats - Traitement du véhicule ${vehicle._id}`);

            // Trouver tous les plannings associés à ce véhicule
            const schedules = await Schedule.find({ vehicle: vehicle._id }).select('_id');
            const scheduleIds = schedules.map(s => s._id);

            if (scheduleIds.length === 0) {
                console.log(`[PaymentController] getVehicleStats - Aucun planning trouvé pour le véhicule ${vehicle._id}`);
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

            console.log(`[PaymentController] getVehicleStats - Statistiques calculées pour le véhicule ${vehicle._id}: efficacité ${efficiency.toFixed(2)}%`);

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
        console.log('[PaymentController] getVehicleStats - Statistiques triées par montant total');

        res.json(vehicleStats);
    } catch (error) {
        console.error('[PaymentController] Erreur getVehicleStats:', error);
        res.status(500).json({ message: error.message });
    }
};