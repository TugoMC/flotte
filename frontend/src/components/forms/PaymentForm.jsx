// src/components/forms/PaymentForm.jsx
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/datepicker";
import { toast } from "sonner";
import { format } from 'date-fns';
import { Loader2, Image as ImageIcon } from "lucide-react";

import { paymentService, scheduleService, mediaService } from '@/services/api';

const PaymentForm = ({ payment, onSubmitSuccess, onCancel }) => {
    const [formData, setFormData] = useState({
        scheduleId: payment?.schedule?._id || '',
        amount: payment?.amount || 0,
        paymentDate: payment?.paymentDate ? new Date(payment.paymentDate) : new Date(),
        paymentType: payment?.paymentType || 'cash',
        mediaId: payment?.media?._id || '',
        comments: payment?.comments || '',
        status: payment?.status || 'pending'
    });

    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchingSchedules, setFetchingSchedules] = useState(true);
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [medias, setMedias] = useState([]);
    const [fetchingMedias, setFetchingMedias] = useState(false);
    const [errors, setErrors] = useState({});

    // Charger les plannings disponibles
    const fetchSchedules = async () => {
        setFetchingSchedules(true);
        try {
            const res = await scheduleService.getCurrent();
            setSchedules(res.data);

            // Si on modifie un paiement et que son planning n'est pas dans la liste des plannings actifs
            if (payment && payment.schedule) {
                const scheduleExists = res.data.some(schedule => schedule._id === payment.schedule._id);
                if (!scheduleExists) {
                    try {
                        const scheduleRes = await scheduleService.getById(payment.schedule._id);
                        if (scheduleRes.data) {
                            setSchedules(prev => [...prev, scheduleRes.data]);
                        }
                    } catch (error) {
                        console.error('Erreur lors du chargement du planning spécifique:', error);
                        toast.error('Impossible de charger le planning spécifique');
                    }
                }
            }
        } catch (error) {
            console.error('Erreur lors du chargement des plannings:', error);
            toast.error('Erreur lors du chargement des plannings');
        } finally {
            setFetchingSchedules(false);
        }
    };

    // Charger les médias disponibles pour les paiements
    const fetchMedias = async () => {
        setFetchingMedias(true);
        try {
            const res = await mediaService.getByEntityType('payment');
            setMedias(res.data);

            // Si on modifie un paiement avec un média qui n'est pas dans la liste
            if (payment && payment.media && payment.media._id &&
                !res.data.some(m => m._id === payment.media._id)) {
                try {
                    const mediaRes = await mediaService.getById(payment.media._id);
                    if (mediaRes.data) {
                        setMedias(prev => [...prev, mediaRes.data]);
                    }
                } catch (error) {
                    console.error('Erreur lors du chargement du média spécifique:', error);
                    toast.error('Impossible de charger le média spécifique');
                }
            }
        } catch (error) {
            console.error('Erreur lors du chargement des médias:', error);
            toast.error('Erreur lors du chargement des médias');
        } finally {
            setFetchingMedias(false);
        }
    };

    // Mettre à jour les informations du planning sélectionné
    const handleScheduleChange = async (scheduleId) => {
        if (!scheduleId) return;

        const schedule = schedules.find(s => s._id === scheduleId);
        if (schedule) {
            setSelectedSchedule(schedule);

            // Si le planning a un objectif de revenu, pré-remplir le montant
            if (schedule?.vehicle?.dailyIncomeTarget > 0) {
                setFormData(prev => ({ ...prev, amount: schedule.vehicle.dailyIncomeTarget }));
            }
        } else {
            // Si le planning n'est pas dans la liste, essayer de le récupérer
            try {
                setFetchingSchedules(true);
                const scheduleRes = await scheduleService.getById(scheduleId);
                if (scheduleRes.data) {
                    setSelectedSchedule(scheduleRes.data);
                    setSchedules(prev => [...prev, scheduleRes.data]);

                    if (scheduleRes.data?.vehicle?.dailyIncomeTarget > 0) {
                        setFormData(prev => ({
                            ...prev,
                            amount: scheduleRes.data.vehicle.dailyIncomeTarget
                        }));
                    }
                }
            } catch (error) {
                console.error('Erreur lors du chargement du planning:', error);
                toast.error('Impossible de charger les informations du planning');
            } finally {
                setFetchingSchedules(false);
            }
        }
    };

    // Validation du formulaire
    const validateForm = () => {
        const newErrors = {};

        if (!formData.scheduleId) {
            newErrors.scheduleId = "Sélectionnez un planning";
        }

        if (formData.amount <= 0) {
            newErrors.amount = "Le montant doit être positif";
        }

        if (!formData.paymentDate) {
            newErrors.paymentDate = "La date de paiement est requise";
        }

        if (!formData.paymentType) {
            newErrors.paymentType = "Sélectionnez un type de paiement";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Gérer les changements de champs
    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Si on change le planning, mettre à jour le planning sélectionné
        if (field === 'scheduleId') {
            handleScheduleChange(value);
        }

        // Effacer l'erreur associée au champ modifié
        if (errors[field]) {
            setErrors(prev => {
                const updated = { ...prev };
                delete updated[field];
                return updated;
            });
        }
    };

    // Soumettre le formulaire
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            let response;

            if (payment) {
                // Mise à jour d'un paiement existant
                response = await paymentService.update(payment._id, formData);
                toast.success('Paiement mis à jour avec succès');
            } else {
                // Création d'un nouveau paiement
                response = await paymentService.create(formData);
                toast.success('Paiement créé avec succès');
            }

            // Si le paiement a un statut spécifique à définir (pour un paiement existant)
            if (payment && formData.status !== payment.status) {
                await paymentService.changeStatus(payment._id, formData.status);
            }

            // Si un média a été associé au paiement et que ce n'est pas l'ancien
            if (formData.mediaId && (!payment || formData.mediaId !== payment?.media?._id)) {
                // Vérifier si le média est déjà associé au paiement
                if (response.data && response.data._id && formData.mediaId !== "none") {
                    try {
                        // Récupérer les données du média
                        const mediaResponse = await mediaService.getById(formData.mediaId);
                        if (mediaResponse.data) {
                            // Associer le média au paiement
                            await paymentService.addMedia(response.data._id, {
                                mediaUrl: mediaResponse.data.mediaUrl
                            });
                        }
                    } catch (error) {
                        console.error("Erreur lors de l'association du média:", error);
                        toast.error("Le paiement a été créé mais le justificatif n'a pas pu être associé");
                    }
                }
            }

            onSubmitSuccess();
        } catch (error) {
            console.error('Erreur lors de la soumission:', error);
            toast.error(error.response?.data?.message || 'Erreur lors de la soumission');
        } finally {
            setLoading(false);
        }
    };

    // Charger les données initiales
    useEffect(() => {
        fetchSchedules();
        fetchMedias();

        // Si on modifie un paiement existant, initialiser le planning sélectionné
        if (payment && payment.schedule) {
            setSelectedSchedule(payment.schedule);
        }
    }, [payment]);

    // Formatter la date pour l'affichage
    const formatScheduleDate = (dateString) => {
        try {
            return format(new Date(dateString), 'dd/MM/yyyy');
        } catch (error) {
            return 'Date invalide';
        }
    };

    return (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {/* Sélection du planning */}
            <div className="space-y-2">
                <label className="text-sm font-medium">Planning</label>
                <Select
                    disabled={fetchingSchedules || (payment && payment._id)}
                    onValueChange={(value) => handleChange('scheduleId', value)}
                    value={formData.scheduleId}
                >
                    <SelectTrigger>
                        {fetchingSchedules ? (
                            <div className="flex items-center">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Chargement...
                            </div>
                        ) : (
                            <SelectValue placeholder="Sélectionner un planning" />
                        )}
                    </SelectTrigger>
                    <SelectContent>
                        {schedules.map((schedule) => (
                            <SelectItem key={schedule._id} value={schedule._id}>
                                {schedule.driver?.firstName} {schedule.driver?.lastName} -
                                {schedule.vehicle?.licensePlate} (
                                {formatScheduleDate(schedule.scheduleDate)})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {selectedSchedule?.vehicle?.dailyIncomeTarget > 0 && (
                    <p className="text-sm text-muted-foreground">
                        Objectif journalier: {new Intl.NumberFormat('fr-FR').format(selectedSchedule.vehicle.dailyIncomeTarget)} FCFA
                    </p>
                )}
                {errors.scheduleId && <p className="text-sm text-red-500 mt-1">{errors.scheduleId}</p>}
            </div>

            {/* Montant du paiement */}
            <div className="space-y-2">
                <label className="text-sm font-medium">Montant</label>
                <Input
                    type="number"
                    placeholder="Montant en FCFA"
                    value={formData.amount}
                    onChange={(e) => handleChange('amount', Number(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">
                    Montant du paiement en FCFA
                </p>
                {errors.amount && <p className="text-sm text-red-500 mt-1">{errors.amount}</p>}
            </div>

            {/* Date de paiement */}
            <div className="space-y-2">
                <label className="text-sm font-medium">Date de paiement</label>
                <DatePicker
                    selected={formData.paymentDate}
                    onSelect={(date) => handleChange('paymentDate', date)}
                    dateFormat="dd/MM/yyyy"
                />
                {errors.paymentDate && <p className="text-sm text-red-500 mt-1">{errors.paymentDate}</p>}
            </div>

            {/* Type de paiement */}
            <div className="space-y-2">
                <label className="text-sm font-medium">Méthode de paiement</label>
                <Select
                    onValueChange={(value) => handleChange('paymentType', value)}
                    value={formData.paymentType}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un type de paiement" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="cash">Espèces</SelectItem>
                        <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    </SelectContent>
                </Select>
                {errors.paymentType && <p className="text-sm text-red-500 mt-1">{errors.paymentType}</p>}
            </div>

            {/* Sélection du média (justificatif) */}
            <div className="space-y-2">
                <label className="text-sm font-medium">Justificatif de paiement</label>
                <Select
                    onValueChange={(value) => handleChange('mediaId', value)}
                    value={formData.mediaId || "none"}
                >
                    <SelectTrigger disabled={fetchingMedias}>
                        {fetchingMedias ? (
                            <div className="flex items-center">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Chargement...
                            </div>
                        ) : (
                            <SelectValue placeholder="Sélectionner un justificatif (optionnel)" />
                        )}
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Aucun justificatif</SelectItem>
                        {medias.map((media) => {
                            if (!media._id) return null; // Skip if no _id
                            return (
                                <SelectItem key={media._id} value={media._id}>
                                    <div className="flex items-center">
                                        <ImageIcon className="h-4 w-4 mr-2" />
                                        {media.createdAt ? format(new Date(media.createdAt), 'dd/MM/yyyy HH:mm') : 'Date inconnue'}
                                        {media.uploadedBy && ` - ${media.uploadedBy.firstName || 'Utilisateur'}`}
                                    </div>
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                    Sélectionnez un justificatif de paiement (optionnel)
                </p>
            </div>

            {/* Statut (uniquement pour la modification) */}
            {payment && (
                <div className="space-y-2">
                    <label className="text-sm font-medium">Statut du paiement</label>
                    <Select
                        onValueChange={(value) => handleChange('status', value)}
                        value={formData.status}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un statut" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pending">En attente</SelectItem>
                            <SelectItem value="confirmed">Confirmé</SelectItem>
                            <SelectItem value="rejected">Rejeté</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Commentaires */}
            <div className="space-y-2">
                <label className="text-sm font-medium">Commentaires</label>
                <Textarea
                    placeholder="Commentaires ou notes additionnelles"
                    value={formData.comments}
                    onChange={(e) => handleChange('comments', e.target.value)}
                />
            </div>

            {/* Boutons d'action */}
            <div className="flex justify-end space-x-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={loading}
                >
                    Annuler
                </Button>
                <Button
                    type="submit"
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {payment ? 'Mise à jour...' : 'Création...'}
                        </>
                    ) : (
                        payment ? 'Mettre à jour' : 'Créer'
                    )}
                </Button>
            </div>
        </form>
    );
};

export default PaymentForm;