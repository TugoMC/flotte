// src/components/forms/PaymentForm.jsx
import { useState, useEffect } from 'react';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/datepicker";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { format } from 'date-fns';
import { Loader2, Image as ImageIcon } from "lucide-react";

import { paymentService, scheduleService, mediaService } from '@/services/api';

// Schéma de validation
const paymentSchema = z.object({
    scheduleId: z.string().min(1, { message: "Sélectionnez un planning" }),
    amount: z.number().min(0, { message: "Le montant doit être positif" }),
    paymentDate: z.date({ required_error: "La date de paiement est requise" }),
    paymentType: z.string().min(1, { message: "Sélectionnez un type de paiement" }),
    mediaId: z.string().optional(),
    comments: z.string().optional(),
});

const PaymentForm = ({ payment, onSubmitSuccess, onCancel }) => {
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchingSchedules, setFetchingSchedules] = useState(true);
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [medias, setMedias] = useState([]);
    const [fetchingMedias, setFetchingMedias] = useState(false);

    // Initialiser le formulaire
    const form = useForm({
        resolver: zodResolver(paymentSchema),
        defaultValues: {
            scheduleId: payment?.schedule?._id || '',
            amount: payment?.amount || 0,
            paymentDate: payment?.paymentDate ? new Date(payment.paymentDate) : new Date(),
            paymentType: payment?.paymentType || 'cash',
            mediaId: payment?.media?._id || '',
            comments: payment?.comments || '',
        },
    });

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
            if (payment && payment.media && !res.data.some(m => m._id === payment.media._id)) {
                try {
                    const mediaRes = await mediaService.getById(payment.media._id);
                    if (mediaRes.data) {
                        setMedias(prev => [...prev, mediaRes.data]);
                    }
                } catch (error) {
                    console.error('Erreur lors du chargement du média spécifique:', error);
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
    const handleScheduleChange = (scheduleId) => {
        const schedule = schedules.find(s => s._id === scheduleId);
        setSelectedSchedule(schedule);

        // Si le planning a un objectif de revenu, pré-remplir le montant
        if (schedule?.vehicle?.dailyIncomeTarget > 0) {
            form.setValue('amount', schedule.vehicle.dailyIncomeTarget);
        }
    };

    // Soumettre le formulaire
    const onSubmit = async (data) => {
        setLoading(true);
        try {
            if (payment) {
                // Mise à jour d'un paiement existant
                await paymentService.update(payment._id, data);
                toast.success('Paiement mis à jour avec succès');
            } else {
                // Création d'un nouveau paiement
                await paymentService.create(data);
                toast.success('Paiement créé avec succès');
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

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Sélection du planning */}
                <FormField
                    control={form.control}
                    name="scheduleId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Planning</FormLabel>
                            <Select
                                disabled={fetchingSchedules}
                                onValueChange={(value) => {
                                    field.onChange(value);
                                    handleScheduleChange(value);
                                }}
                                value={field.value}
                            >
                                <FormControl>
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
                                </FormControl>
                                <SelectContent>
                                    {schedules.map((schedule) => (
                                        <SelectItem key={schedule._id} value={schedule._id}>
                                            {schedule.driver?.firstName} {schedule.driver?.lastName} -
                                            {schedule.vehicle?.licensePlate}
                                            ({format(new Date(schedule.scheduleDate), 'dd/MM/yyyy')})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormDescription>
                                {selectedSchedule?.vehicle?.dailyIncomeTarget > 0 && (
                                    <span>
                                        Objectif journalier: {new Intl.NumberFormat('fr-FR').format(selectedSchedule.vehicle.dailyIncomeTarget)} FCFA
                                    </span>
                                )}
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Montant du paiement */}
                <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Montant</FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    placeholder="Montant en FCFA"
                                    {...field}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                            </FormControl>
                            <FormDescription>
                                Montant du paiement en FCFA
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Date de paiement */}
                <FormField
                    control={form.control}
                    name="paymentDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Date de paiement</FormLabel>
                            <DatePicker
                                selected={field.value}
                                onSelect={field.onChange}
                                dateFormat="dd/MM/yyyy"
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Type de paiement */}
                <FormField
                    control={form.control}
                    name="paymentType"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Méthode de paiement</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner un type de paiement" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="cash">Espèces</SelectItem>
                                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Sélection du média (justificatif) */}
                <FormField
                    control={form.control}
                    name="mediaId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Justificatif de paiement</FormLabel>
                            <Select
                                onValueChange={field.onChange}
                                value={field.value || ""}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        {fetchingMedias ? (
                                            <div className="flex items-center">
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                Chargement...
                                            </div>
                                        ) : (
                                            <SelectValue placeholder="Sélectionner un justificatif (optionnel)" />
                                        )}
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="">Aucun justificatif</SelectItem>
                                    {medias.map((media) => (
                                        <SelectItem key={media._id} value={media._id}>
                                            <div className="flex items-center">
                                                <ImageIcon className="h-4 w-4 mr-2" />
                                                {new Date(media.createdAt).toLocaleDateString()}
                                                {media.uploadedBy && ` - ${media.uploadedBy.firstName}`}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormDescription>
                                Sélectionnez un justificatif de paiement (optionnel)
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Commentaires */}
                <FormField
                    control={form.control}
                    name="comments"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Commentaires</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Commentaires ou notes additionnelles"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

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
        </Form>
    );
};

export default PaymentForm;