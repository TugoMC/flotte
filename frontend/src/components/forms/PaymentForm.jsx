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
import { Loader2, Image as ImageIcon, XIcon, InfoIcon } from "lucide-react";

import { paymentService, scheduleService } from '@/services/api';

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
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [photosPreviews, setPhotosPreviews] = useState([]);

    // Créer des URL d'aperçu lorsque les fichiers sont sélectionnés
    useEffect(() => {
        if (!selectedFiles.length) {
            setPhotosPreviews([]);
            return;
        }

        const newPreviews = [];
        selectedFiles.forEach(file => {
            const preview = URL.createObjectURL(file);
            newPreviews.push({ file, preview });
        });

        setPhotosPreviews(newPreviews);

        // Nettoyer les URL d'objet lors du démontage
        return () => {
            newPreviews.forEach(item => URL.revokeObjectURL(item.preview));
        };
    }, [selectedFiles]);

    const handleFileSelect = (e) => {
        if (e.target.files.length === 0) return;

        // Vérifier la taille des fichiers (max 5MB)
        const filesArray = Array.from(e.target.files);
        const validFiles = filesArray.filter(file => file.size <= 5 * 1024 * 1024);

        if (validFiles.length < filesArray.length) {
            toast.warning("Certains fichiers dépassent la taille maximale de 5 MB et ont été ignorés", {
                description: "Veuillez sélectionner des fichiers plus petits",
            });
        }

        setSelectedFiles(validFiles);
    };

    const removePhoto = (index) => {
        const newFiles = [...selectedFiles];
        newFiles.splice(index, 1);
        setSelectedFiles(newFiles);
    };

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
            // Préparer les données pour l'API
            const payload = {
                scheduleId: formData.scheduleId,
                amount: formData.amount,
                paymentDate: formData.paymentDate.toISOString(),
                paymentType: formData.paymentType,
                comments: formData.comments,
                ...(payment && { status: formData.status })
            };

            console.log('Payload envoyé:', payload); // Pour débogage

            let response;
            if (payment) {
                response = await paymentService.update(payment._id, payload);
                toast.success('Paiement mis à jour avec succès');
            } else {
                response = await paymentService.create(payload);
                toast.success('Paiement créé avec succès');
            }

            // Upload des photos si nécessaire
            if (selectedFiles.length > 0 && response.data._id) {
                const formData = new FormData();
                selectedFiles.forEach(file => {
                    formData.append('photos', file);
                });

                await paymentService.uploadPhotos(response.data._id, formData);
                toast.success(`${selectedFiles.length} photo(s) ajoutée(s) avec succès`);
            }

            onSubmitSuccess();
        } catch (error) {
            console.error('Détails de l\'erreur:', {
                message: error.message,
                response: error.response?.data,
                stack: error.stack
            });
            toast.error(error.response?.data?.message || error.message || 'Erreur lors de la soumission');
        } finally {
            setLoading(false);
        }
    };

    // Charger les données initiales
    useEffect(() => {
        fetchSchedules();


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
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-h-[80vh] overflow-y-auto p-1">
            {/* Sélection du planning */}
            <div className="space-y-2">
                <label className="text-sm font-medium required">Planning</label>
                <Select
                    disabled={fetchingSchedules || (payment && payment._id)}
                    onValueChange={(value) => handleChange('scheduleId', value)}
                    value={formData.scheduleId}
                    required
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
                <label className="text-sm font-medium required">Montant</label>
                <Input
                    type="number"
                    placeholder="Montant en FCFA"
                    value={formData.amount}
                    onChange={(e) => handleChange('amount', Number(e.target.value))}
                    required
                />
                <p className="text-sm text-muted-foreground">
                    Montant du paiement en FCFA
                </p>
                {errors.amount && <p className="text-sm text-red-500 mt-1">{errors.amount}</p>}
            </div>

            {/* Date de paiement */}
            <div className="space-y-2">
                <label className="text-sm font-medium required">Date de paiement</label>
                <DatePicker
                    selected={formData.paymentDate}
                    onSelect={(date) => handleChange('paymentDate', date)}
                    dateFormat="dd/MM/yyyy"
                    required
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

            {/* Section de gestion des photos */}
            <div className="space-y-2 col-span-full">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Justificatifs de paiement</label>
                    <Button variant="outline" asChild>
                        <label className="cursor-pointer">
                            <ImageIcon className="mr-2 h-4 w-4" />
                            Ajouter des justificatifs
                            <input
                                type="file"
                                accept="image/jpeg, image/png"
                                multiple
                                hidden
                                onChange={handleFileSelect}
                            />
                        </label>
                    </Button>
                </div>

                {/* Message d'information pour les photos */}
                <div className="bg-accent p-3 rounded-md text-sm flex items-start gap-2">
                    <InfoIcon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-accent-foreground mb-1">Conseils pour les justificatifs</p>
                        <p className="text-muted-foreground">
                            Pour une qualité optimale, utilisez des images claires des reçus ou captures d'écran.
                            Formats acceptés: JPG, PNG. Taille maximale: 5 MB par image.
                        </p>
                    </div>
                </div>

                {/* Prévisualisation des photos */}
                {photosPreviews.length > 0 && (
                    <div className="mt-3">
                        <p className="text-sm text-gray-500 mb-2">
                            {photosPreviews.length} justificatif(s) sélectionné(s)
                        </p>
                        <div className="grid grid-cols-3 gap-3 max-h-[300px] overflow-y-auto">
                            {photosPreviews.map((item, index) => (
                                <div
                                    key={index}
                                    className="relative aspect-[3/2] bg-gray-100 rounded-md overflow-hidden group"
                                >
                                    <img
                                        src={item.preview}
                                        alt={`Aperçu ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removePhoto(index)}
                                        className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Supprimer"
                                    >
                                        <XIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Commentaires */}
            <div className="space-y-2 col-span-full">
                <label className="text-sm font-medium">Commentaires</label>
                <Textarea
                    placeholder="Commentaires ou notes additionnelles"
                    value={formData.comments}
                    onChange={(e) => handleChange('comments', e.target.value)}
                />
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

            {/* Boutons d'action */}
            <div className="flex justify-end space-x-4 col-span-full">
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